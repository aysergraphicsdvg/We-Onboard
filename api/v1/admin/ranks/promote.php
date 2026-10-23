<?php
/**
 * We Onboard — Rank Promotion Approval & Review API (Phase 6)
 * POST /api/v1/admin/ranks/promote.php
 * 
 * Supports:
 * - action = 'nominate': Nominates candidate for promotion
 * - action = 'approve': Approves promotion, updates freelancer rank, logs audit
 * - action = 'reject': Rejects nomination with mandatory reason
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

$adminRole = $_SESSION['admin_role'] ?? '';
$allowedRoles = ['Super Admin', 'Administrator'];
if (!in_array($adminRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: Only Super Admins and Administrators can approve rank promotions.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$action = trim($data['action'] ?? '');
$freelancerId = (int)($data['freelancer_id'] ?? 0);
$targetRank = trim($data['target_rank'] ?? '');
$reason = trim($data['reason'] ?? '');

$validRanks = ['Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head'];

if ($freelancerId <= 0 || !in_array($targetRank, $validRanks)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid freelancer_id and valid target_rank are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Fetch freelancer record
    $flStmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    $currentRank = $fl['current_rank'] ?: 'Trainee';

    if ($action === 'approve') {
        if (empty($reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'An administrative promotion justification reason is required.']);
            exit;
        }

        // Check fraud flag: strictly forbidden to promote flagged accounts
        if ((int)$fl['fraud_flag'] === 1) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Promotion Disallowed: Freelancer has an active policy violation flag and cannot be promoted.'
            ]);
            exit;
        }

        $db->beginTransaction();

        // 1. Update freelancer rank
        $upStmt = $db->prepare("UPDATE freelancers SET current_rank = ? WHERE id = ?");
        $upStmt->execute([$targetRank, $freelancerId]);

        // 2. Insert promotion record
        $snapshot = json_encode([
            'promoted_from' => $currentRank,
            'quality_score' => $fl['quality_score'],
            'qs_status' => $fl['qs_status'],
            'approved_at_timestamp' => date('Y-m-d H:i:s')
        ]);

        $promStmt = $db->prepare("
            INSERT INTO rank_promotions 
            (freelancer_id, from_rank, to_rank, status, eligibility_snapshot_json, reviewed_by, reviewed_by_name, decision_reason, reviewed_at, created_at)
            VALUES (?, ?, ?, 'Approved', ?, ?, ?, ?, NOW(), NOW())
        ");
        $promStmt->execute([
            $freelancerId,
            $currentRank,
            $targetRank,
            $snapshot,
            $adminId,
            $adminName,
            $reason
        ]);
        $promotionId = (int)$db->lastInsertId();

        // 3. Send notification to freelancer
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Congratulations! Rank Promotion Approved', ?, 'rank_promotion')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been officially promoted from {$currentRank} to {$targetRank}! Justification: {$reason}."
        ]);

        // 4. Record audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Freelancer Rank Promoted', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$freelancerId,
            "Promoted from {$currentRank} to {$targetRank}. Reason: {$reason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Promotion to {$targetRank} approved for {$fl['full_name']}.",
            'promotion_id' => $promotionId,
            'new_rank' => $targetRank
        ]);
        exit;

    } elseif ($action === 'reject') {
        if (empty($reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A rejection reason is required.']);
            exit;
        }

        $promStmt = $db->prepare("
            INSERT INTO rank_promotions 
            (freelancer_id, from_rank, to_rank, status, reviewed_by, reviewed_by_name, decision_reason, reviewed_at, created_at)
            VALUES (?, ?, ?, 'Rejected', ?, ?, ?, NOW(), NOW())
        ");
        $promStmt->execute([
            $freelancerId,
            $currentRank,
            $targetRank,
            $adminId,
            $adminName,
            $reason
        ]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Freelancer Promotion Rejected', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$freelancerId,
            "Rejected promotion nomination from {$currentRank} to {$targetRank}. Reason: {$reason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Promotion nomination for {$fl['full_name']} was rejected.",
            'decision' => 'Rejected'
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action parameter. Must be approve or reject.']);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
