<?php
/**
 * We Onboard — Admin Freelancer Performance & Quality Score Directory API
 * GET / POST /api/v1/admin/performance/scores.php
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

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

try {
    $db = Database::getConnection();

    // POST: Manage Policy / Fraud Flags (Set or clear fraud flag with mandatory reason)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid freelancer_id is required.']);
            exit;
        }

        if ($action === 'set_fraud_flag') {
            $reason = trim($data['reason'] ?? '');
            if (empty($reason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A specific substantiated reason is required to flag a freelancer for policy violations.']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE freelancers 
                SET fraud_flag = 1, 
                    fraud_reason = ?, 
                    fraud_flagged_by = ?, 
                    fraud_flagged_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$reason, $adminId, $freelancerId]);

            // Recompute Quality Score to apply penalty
            QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

            // Audit log
            $auditStmt = $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Freelancer Flagged for Policy Violation', 'Freelancer', ?, ?, ?)
            ");
            $auditStmt->execute([
                $adminName,
                (string)$freelancerId,
                "Flagged for fraud/policy violation: {$reason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Policy flag applied. Quality Score recalculated with disciplinary penalty.',
                'freelancer_id' => $freelancerId
            ]);
            exit;

        } elseif ($action === 'clear_fraud_flag') {
            $resolutionReason = trim($data['reason'] ?? '');
            if (empty($resolutionReason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A resolution justification is required to clear a disciplinary flag.']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE freelancers 
                SET fraud_flag = 0, 
                    fraud_reason = NULL, 
                    fraud_flagged_by = NULL, 
                    fraud_flagged_at = NULL 
                WHERE id = ?
            ");
            $stmt->execute([$freelancerId]);

            // Recompute Quality Score without penalty
            QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

            // Audit log
            $auditStmt = $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Freelancer Policy Violation Flag Cleared', 'Freelancer', ?, ?, ?)
            ");
            $auditStmt->execute([
                $adminName,
                (string)$freelancerId,
                "Disciplinary flag cleared. Resolution: {$resolutionReason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Policy flag cleared. Quality Score restored to normal calculation.',
                'freelancer_id' => $freelancerId
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown action.']);
        exit;
    }

    // GET: List Freelancers with Quality Score & Breakdown
    $search = trim($_GET['search'] ?? '');
    $rank = trim($_GET['rank'] ?? '');
    $qsStatus = trim($_GET['qs_status'] ?? '');
    $city = trim($_GET['city'] ?? '');
    $hasFraud = isset($_GET['fraud']) ? trim($_GET['fraud']) : '';

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ? OR f.registration_ref LIKE ?)";
        $w = "%{$search}%";
        $params = array_merge($params, [$w, $w, $w, $w]);
    }
    if (!empty($rank) && $rank !== 'All') {
        $where[] = "f.current_rank = ?";
        $params[] = $rank;
    }
    if (!empty($qsStatus) && $qsStatus !== 'All') {
        $where[] = "f.qs_status = ?";
        $params[] = $qsStatus;
    }
    if (!empty($city) && $city !== 'All') {
        $where[] = "f.city = ?";
        $params[] = $city;
    }
    if ($hasFraud === '1') {
        $where[] = "f.fraud_flag = 1";
    } elseif ($hasFraud === '0') {
        $where[] = "f.fraud_flag = 0";
    }

    $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $countSql = "SELECT COUNT(*) FROM freelancers f WHERE " . implode(' AND ', $where);
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetchColumn();

    $sql = "
        SELECT f.id, f.registration_ref, f.full_name, f.email, f.phone, f.city, f.state,
               f.status, f.onboarding_status, f.current_rank, f.quality_score, f.qs_sample_size,
               f.qs_status, f.qs_last_calculated_at, f.fraud_flag, f.fraud_reason, f.fraud_flagged_at,
               f.team_id, t.name as team_name, t.team_code,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id) as total_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Approved') as approved_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Rework Required') as rework_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Rejected') as rejected_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Approved' AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as approved_30d
        FROM freelancers f
        LEFT JOIN teams t ON f.team_id = t.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY f.quality_score DESC, f.id DESC
        LIMIT {$limit} OFFSET {$offset}
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $scores = [];
    foreach ($rows as $r) {
        $isKycApproved = ($r['status'] === 'Active' || $r['onboarding_status'] === 'Approved');
        $qs = $r['quality_score'] !== null ? (float)$r['quality_score'] : null;
        $isActiveMember = ($isKycApproved && $qs !== null && $qs >= 70.0 && (int)$r['fraud_flag'] === 0 && (int)$r['approved_30d'] >= 1);

        $scores[] = [
            'id' => (int)$r['id'],
            'registrationRef' => $r['registration_ref'],
            'fullName' => $r['full_name'],
            'email' => $r['email'],
            'phone' => $r['phone'],
            'city' => $r['city'],
            'state' => $r['state'],
            'status' => $r['status'],
            'onboardingStatus' => $r['onboarding_status'],
            'currentRank' => $r['current_rank'] ?: 'Trainee',
            'teamId' => $r['team_id'] ? (int)$r['team_id'] : null,
            'teamName' => $r['team_name'],
            'teamCode' => $r['team_code'],
            'qualityScore' => $qs,
            'qsSampleSize' => (int)$r['qs_sample_size'],
            'qsStatus' => $r['qs_status'] ?: 'Insufficient Data',
            'qsLastCalculatedAt' => $r['qs_last_calculated_at'],
            'fraudFlag' => (bool)$r['fraud_flag'],
            'fraudReason' => $r['fraud_reason'],
            'fraudFlaggedAt' => $r['fraud_flagged_at'],
            'isActiveMember' => $isActiveMember,
            'metrics' => [
                'totalTasks' => (int)$r['total_tasks'],
                'approvedTasks' => (int)$r['approved_tasks'],
                'reworkTasks' => (int)$r['rework_tasks'],
                'rejectedTasks' => (int)$r['rejected_tasks'],
                'approved30d' => (int)$r['approved_30d']
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'scores' => $scores,
        'pagination' => [
            'total' => $totalCount,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($totalCount / $limit)
        ],
        'config' => QualityScoreEngine::getConfig($db)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
