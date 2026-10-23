<?php
/**
 * We Onboard — Admin Earnings & 70/20/10 Breakdown Inspector (Phase 7)
 * GET /api/v1/admin/financial/earnings.php
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

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));

    $stmt = $db->prepare("
        SELECT 
            ee.*,
            t.task_ref,
            t.title as task_title,
            p.name as project_name,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            tl.full_name as team_leader_name,
            mgr.full_name as manager_name,
            lj.journal_ref
        FROM earning_entitlements ee
        JOIN tasks t ON ee.task_id = t.id
        JOIN projects p ON ee.project_id = p.id
        JOIN freelancers fl ON ee.freelancer_id = fl.id
        LEFT JOIN freelancers tl ON ee.team_leader_id = tl.id
        LEFT JOIN freelancers mgr ON ee.manager_id = mgr.id
        LEFT JOIN ledger_journals lj ON ee.journal_id = lj.id
        ORDER BY ee.id DESC
        LIMIT ?
    ");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $entitlements = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'entitlements' => $entitlements,
        'count' => count($entitlements)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
