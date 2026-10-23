<?php
/**
 * We Onboard — Admin Reserves Management API (Phase 7)
 * GET /api/v1/admin/financial/reserves.php - List held and released reserves
 * POST /api/v1/admin/financial/reserves.php - Trigger release of matured reserves
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

$adminName = $_SESSION['admin_name'] ?? 'Admin';

try {
    $db = Database::getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $action = $input['action'] ?? 'release_matured';
        $specificId = isset($input['reserve_id']) ? (int)$input['reserve_id'] : null;

        $db->beginTransaction();

        $result = FinancialEngine::releaseMaturedReserves($db, $adminName, $specificId);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Reserve Batch Release Triggered', 'Reserve', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            'BATCH_' . time(),
            "Released {$result['released_count']} matured reserves for total ₹{$result['total_amount']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Successfully released {$result['released_count']} matured reserves totaling ₹" . number_format($result['total_amount'], 2) . ".",
            'result' => $result
        ]);
        exit;
    }

    // GET: List reserves
    $statusFilter = $_GET['status'] ?? '';
    $query = "
        SELECT 
            r.*,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            t.task_ref,
            t.title as task_title,
            lj.journal_ref as release_journal_ref,
            TIMESTAMPDIFF(SECOND, NOW(), r.release_due_at) as seconds_to_release
        FROM reserve_records r
        JOIN freelancers fl ON r.freelancer_id = fl.id
        LEFT JOIN tasks t ON r.task_id = t.id
        LEFT JOIN ledger_journals lj ON r.release_journal_id = lj.id
        WHERE 1=1
    ";
    $params = [];
    if (!empty($statusFilter)) {
        $query .= " AND r.status = ?";
        $params[] = $statusFilter;
    }
    $query .= " ORDER BY r.id DESC LIMIT 100";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $reserves = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'reserves' => $reserves,
        'count' => count($reserves)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
