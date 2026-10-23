<?php
/**
 * We Onboard — Admin Teams Directory API
 * GET /api/v1/admin/teams/list.php
 * 
 * Returns all field teams with leaders, managers, total member counts,
 * and active member counts based on the 4-rule active member criteria.
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $city = trim($_GET['city'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($city) && $city !== 'All') {
        $where[] = "t.city = ?";
        $params[] = $city;
    }
    if (!empty($status) && $status !== 'All') {
        $where[] = "t.status = ?";
        $params[] = $status;
    }
    if (!empty($search)) {
        $where[] = "(t.name LIKE ? OR t.team_code LIKE ? OR t.operating_area LIKE ?)";
        $w = "%{$search}%";
        $params = array_merge($params, [$w, $w, $w]);
    }

    $sql = "
        SELECT t.*, 
               fl.full_name as leader_name, fl.email as leader_email, fl.phone as leader_phone,
               fl.current_rank as leader_rank, fl.quality_score as leader_qs, fl.fraud_flag as leader_fraud,
               fm.full_name as manager_name, fm.email as manager_email, fm.phone as manager_phone,
               fm.current_rank as manager_rank, fm.quality_score as manager_qs
        FROM teams t
        LEFT JOIN freelancers fl ON t.leader_id = fl.id
        LEFT JOIN freelancers fm ON t.manager_id = fm.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.city ASC, t.id ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $teamsRaw = $stmt->fetchAll();

    $teams = [];
    foreach ($teamsRaw as $row) {
        $teamId = (int)$row['id'];

        // Query team members with active-member qualification metrics
        $memStmt = $db->prepare("
            SELECT tm.id as membership_id, tm.role_in_team, tm.joined_at,
                   f.id as freelancer_id, f.registration_ref, f.full_name, f.email, f.phone,
                   f.status, f.onboarding_status, f.current_rank, f.quality_score, f.fraud_flag,
                   (SELECT COUNT(*) FROM tasks 
                    WHERE assigned_freelancer_id = f.id 
                      AND status = 'Approved' 
                      AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as approved_30d
            FROM team_members tm
            JOIN freelancers f ON tm.freelancer_id = f.id
            WHERE tm.team_id = ?
            ORDER BY tm.role_in_team DESC, f.full_name ASC
        ");
        $memStmt->execute([$teamId]);
        $membersRaw = $memStmt->fetchAll();

        $members = [];
        $activeMembersCount = 0;

        foreach ($membersRaw as $m) {
            $isKycApproved = ($m['status'] === 'Active' || $m['onboarding_status'] === 'Approved');
            $qs = $m['quality_score'] !== null ? (float)$m['quality_score'] : null;
            $hasNoFraud = (int)$m['fraud_flag'] === 0;
            $hasRecentActivity = (int)$m['approved_30d'] >= 1;

            // Strict Active Member criteria:
            // 1. Valid KYC (Active or Approved)
            // 2. Quality Score >= 70
            // 3. No fraud flag
            // 4. At least one QC-approved task in preceding 30 days
            $isActiveMember = ($isKycApproved && $qs !== null && $qs >= 70.0 && $hasNoFraud && $hasRecentActivity);

            if ($isActiveMember) {
                $activeMembersCount++;
            }

            $members[] = [
                'membershipId' => (int)$m['membership_id'],
                'freelancerId' => (int)$m['freelancer_id'],
                'registrationRef' => $m['registration_ref'],
                'fullName' => $m['full_name'],
                'email' => $m['email'],
                'phone' => $m['phone'],
                'currentRank' => $m['current_rank'] ?: 'Trainee',
                'roleInTeam' => $m['role_in_team'],
                'qualityScore' => $qs,
                'fraudFlag' => (bool)$m['fraud_flag'],
                'approved30d' => (int)$m['approved_30d'],
                'isActiveMember' => $isActiveMember,
                'joinedAt' => $m['joined_at']
            ];
        }

        // Qualifying Team rule: at least 10 active members
        $isQualifyingTeam = ($activeMembersCount >= 10);

        $teams[] = [
            'id' => $teamId,
            'teamCode' => $row['team_code'],
            'name' => $row['name'],
            'city' => $row['city'],
            'operatingArea' => $row['operating_area'],
            'status' => $row['status'],
            'leader' => $row['leader_id'] ? [
                'id' => (int)$row['leader_id'],
                'name' => $row['leader_name'],
                'email' => $row['leader_email'],
                'phone' => $row['leader_phone'],
                'rank' => $row['leader_rank'] ?: 'Trainee',
                'qualityScore' => $row['leader_qs'] !== null ? (float)$row['leader_qs'] : null,
                'fraudFlag' => (bool)$row['leader_fraud']
            ] : null,
            'manager' => $row['manager_id'] ? [
                'id' => (int)$row['manager_id'],
                'name' => $row['manager_name'],
                'email' => $row['manager_email'],
                'phone' => $row['manager_phone'],
                'rank' => $row['manager_rank'] ?: 'Manager',
                'qualityScore' => $row['manager_qs'] !== null ? (float)$row['manager_qs'] : null
            ] : null,
            'totalMembers' => count($members),
            'activeMembersCount' => $activeMembersCount,
            'isQualifyingTeam' => $isQualifyingTeam,
            'members' => $members,
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'teams' => $teams,
        'total' => count($teams)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
