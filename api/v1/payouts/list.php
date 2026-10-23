<?php
/**
 * We Onboard — Freelancer Payouts List API (Phase 7)
 * GET /api/v1/payouts/list.php
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
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$freelancerId = $_SESSION['freelancer_id'] ?? null;
if (!$freelancerId && isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $stmt = $db->prepare("
        SELECT 
            p.*,
            lj.journal_ref as request_journal_ref,
            sj.journal_ref as settlement_journal_ref,
            rj.journal_ref as reversal_journal_ref
        FROM payout_requests p
        LEFT JOIN ledger_journals lj ON p.request_journal_id = lj.id
        LEFT JOIN ledger_journals sj ON p.settlement_journal_id = sj.id
        LEFT JOIN ledger_journals rj ON p.reversal_journal_id = rj.id
        WHERE p.freelancer_id = ?
        ORDER BY p.id DESC
        LIMIT 50
    ");
    $stmt->execute([$freelancerId]);
    $payouts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'payouts' => $payouts
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
