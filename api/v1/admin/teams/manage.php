<?php
/**
 * We Onboard — Admin Team Management API (Phase 6)
 * POST /api/v1/admin/teams/manage.php
 * 
 * Supports:
 * - create_team: Creates team
 * - update_team: Updates team metadata
 * - add_member: Adds freelancer to team (enforces single-team membership)
 * - remove_member: Removes freelancer from team
 * - set_leader: Assigns team leader with circular reporting prevention
 * - set_manager: Assigns team manager with circular reporting prevention
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

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? '');

try {
    $db = Database::getConnection();

    // 1. ACTION: CREATE TEAM
    if ($action === 'create_team') {
        $name = trim($data['name'] ?? '');
        $city = trim($data['city'] ?? 'Bengaluru');
        $operatingArea = trim($data['operating_area'] ?? '');
        $teamCode = trim($data['team_code'] ?? '');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Team name is required.']);
            exit;
        }

        if (empty($teamCode)) {
            $cityPrefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $city), 0, 3));
            $teamCode = 'TM-' . ($cityPrefix ?: 'BLR') . '-' . str_pad((string)mt_rand(1, 99), 2, '0', STR_PAD_LEFT);
        }

        $stmt = $db->prepare("
            INSERT INTO teams (team_code, name, city, operating_area, status)
            VALUES (?, ?, ?, ?, 'Active')
        ");
        $stmt->execute([$teamCode, $name, $city, $operatingArea]);
        $newTeamId = (int)$db->lastInsertId();

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Created', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $teamCode,
            "Created field team '{$name}' in {$city}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Team {$name} ({$teamCode}) created successfully.",
            'team_id' => $newTeamId,
            'team_code' => $teamCode
        ]);
        exit;
    }

    // 2. ACTION: ADD MEMBER TO TEAM (Enforces unique team membership)
    if ($action === 'add_member') {
        $teamId = (int)($data['team_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);
        $roleInTeam = trim($data['role_in_team'] ?? 'Member');

        if ($teamId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id and freelancer_id are required.']);
            exit;
        }

        // Verify team exists
        $teamStmt = $db->prepare("SELECT id, name, team_code, leader_id, manager_id FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        // Check if freelancer is already a member of ANY team
        $checkStmt = $db->prepare("
            SELECT tm.team_id, t.name as team_name, t.team_code 
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.freelancer_id = ? LIMIT 1
        ");
        $checkStmt->execute([$freelancerId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => "Duplicate Membership Prohibited: Freelancer is already an active member of {$existing['team_name']} ({$existing['team_code']}). A freelancer can only belong to one team at a time."
            ]);
            exit;
        }

        // Circular reporting check: Cannot be member if they are the manager of this team
        if ((int)$team['manager_id'] === $freelancerId) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Circular Reporting Conflict: A manager cannot be added as a subordinate team member of a team they oversee.'
            ]);
            exit;
        }

        $db->beginTransaction();

        $addStmt = $db->prepare("
            INSERT INTO team_members (team_id, freelancer_id, role_in_team, joined_at)
            VALUES (?, ?, ?, NOW())
        ");
        $addStmt->execute([$teamId, $freelancerId, $roleInTeam]);

        $upFl = $db->prepare("UPDATE freelancers SET team_id = ? WHERE id = ?");
        $upFl->execute([$teamId, $freelancerId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Member Assigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            "Added freelancer #{$freelancerId} to {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Freelancer successfully added to {$team['name']}.",
            'team_id' => $teamId,
            'freelancer_id' => $freelancerId
        ]);
        exit;
    }

    // 3. ACTION: REMOVE MEMBER FROM TEAM
    if ($action === 'remove_member') {
        $teamId = (int)($data['team_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($teamId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id and freelancer_id are required.']);
            exit;
        }

        $db->beginTransaction();

        $delStmt = $db->prepare("DELETE FROM team_members WHERE team_id = ? AND freelancer_id = ?");
        $delStmt->execute([$teamId, $freelancerId]);

        $upFl = $db->prepare("UPDATE freelancers SET team_id = NULL WHERE id = ? AND team_id = ?");
        $upFl->execute([$freelancerId, $teamId]);

        // If this member was team leader, clear leader_id
        $upTeam = $db->prepare("UPDATE teams SET leader_id = NULL WHERE id = ? AND leader_id = ?");
        $upTeam->execute([$teamId, $freelancerId]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Freelancer removed from team.',
            'team_id' => $teamId,
            'freelancer_id' => $freelancerId
        ]);
        exit;
    }

    // 4. ACTION: SET TEAM LEADER (Circular Reporting Check)
    if ($action === 'set_leader') {
        $teamId = (int)($data['team_id'] ?? 0);
        $leaderId = !empty($data['leader_id']) ? (int)$data['leader_id'] : null;

        if ($teamId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id is required.']);
            exit;
        }

        $teamStmt = $db->prepare("SELECT * FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        if ($leaderId !== null) {
            // Circular Reporting Checks:
            // 1. Leader cannot be the same person as the team's manager
            if (!empty($team['manager_id']) && (int)$team['manager_id'] === $leaderId) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot simultaneously serve as the team leader reporting to themselves.'
                ]);
                exit;
            }

            // 2. Freelancer must exist and not be flagged for fraud
            $flStmt = $db->prepare("SELECT id, full_name, fraud_flag, current_rank FROM freelancers WHERE id = ? LIMIT 1");
            $flStmt->execute([$leaderId]);
            $fl = $flStmt->fetch();
            if (!$fl) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Designated leader freelancer account not found.']);
                exit;
            }
            if ((int)$fl['fraud_flag'] === 1) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Disciplinary Restriction: A freelancer with an active policy flag cannot be appointed as Team Leader.']);
                exit;
            }
        }

        $stmt = $db->prepare("UPDATE teams SET leader_id = ? WHERE id = ?");
        $stmt->execute([$leaderId, $teamId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Leader Reassigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            $leaderId ? "Assigned freelancer #{$leaderId} as leader of {$team['name']}" : "Unassigned leader of {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Team leader successfully updated.',
            'team_id' => $teamId,
            'leader_id' => $leaderId
        ]);
        exit;
    }

    // 5. ACTION: SET TEAM MANAGER (Circular Reporting Check)
    if ($action === 'set_manager') {
        $teamId = (int)($data['team_id'] ?? 0);
        $managerId = !empty($data['manager_id']) ? (int)$data['manager_id'] : null;

        if ($teamId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id is required.']);
            exit;
        }

        $teamStmt = $db->prepare("SELECT * FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        if ($managerId !== null) {
            // Circular Reporting Checks:
            // 1. Manager cannot be the team leader of this team
            if (!empty($team['leader_id']) && (int)$team['leader_id'] === $managerId) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot oversee a team where they are also appointed as the team leader.'
                ]);
                exit;
            }

            // 2. Manager cannot be an ordinary subordinate member of this team
            $memStmt = $db->prepare("SELECT id FROM team_members WHERE team_id = ? AND freelancer_id = ? LIMIT 1");
            $memStmt->execute([$teamId, $managerId]);
            if ($memStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot be assigned to oversee a team of which they are a subordinate member.'
                ]);
                exit;
            }
        }

        $stmt = $db->prepare("UPDATE teams SET manager_id = ? WHERE id = ?");
        $stmt->execute([$managerId, $teamId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Manager Assigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            $managerId ? "Assigned freelancer #{$managerId} as manager of {$team['name']}" : "Unassigned manager of {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Team manager successfully updated.',
            'team_id' => $teamId,
            'manager_id' => $managerId
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action parameter.']);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
