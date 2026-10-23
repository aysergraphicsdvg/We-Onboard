<?php
/**
 * We Onboard — Admin Financial Overview API (Phase 7)
 * GET /api/v1/admin/financial/overview.php
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

try {
    $db = Database::getConnection();

    // 1. Fetch Trial Balance
    $trialBalance = FinancialEngine::getTrialBalance($db);

    // 2. Fetch Pending Payouts Stats
    $poStatsStmt = $db->query("
        SELECT 
            COUNT(CASE WHEN status IN ('Requested', 'Under Review') THEN 1 END) as pending_count,
            COALESCE(SUM(CASE WHEN status IN ('Requested', 'Under Review') THEN amount ELSE 0 END), 0.00) as pending_amount,
            COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0.00) as paid_amount,
            COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count
        FROM payout_requests
    ");
    $payoutStats = $poStatsStmt->fetch();

    // 3. Fetch Reserve Stats
    $resStatsStmt = $db->query("
        SELECT 
            COUNT(CASE WHEN status = 'Held' THEN 1 END) as held_count,
            COALESCE(SUM(CASE WHEN status = 'Held' THEN amount ELSE 0 END), 0.00) as held_amount,
            COUNT(CASE WHEN status = 'Held' AND release_due_at <= NOW() THEN 1 END) as matured_ready_count,
            COALESCE(SUM(CASE WHEN status = 'Held' AND release_due_at <= NOW() THEN amount ELSE 0 END), 0.00) as matured_ready_amount,
            COUNT(CASE WHEN status = 'Released' THEN 1 END) as released_count,
            COALESCE(SUM(CASE WHEN status = 'Released' THEN amount ELSE 0 END), 0.00) as released_amount
        FROM reserve_records
    ");
    $reserveStats = $resStatsStmt->fetch();

    // 4. Fetch Growth Pool Stats
    $growthStmt = $db->query("
        SELECT 
            COALESCE(SUM(growth_pool_share), 0.00) as total_growth_pool,
            COUNT(CASE WHEN team_leader_routed_to_growth = 1 THEN 1 END) as tl_routed_count,
            COUNT(CASE WHEN manager_routed_to_growth = 1 THEN 1 END) as mgr_routed_count
        FROM earning_entitlements
    ");
    $growthStats = $growthStmt->fetch();

    // 5. Total recognized field earnings
    $earnStmt = $db->query("
        SELECT 
            COALESCE(SUM(gross_rate), 0.00) as total_gross_field_cost,
            COALESCE(SUM(freelancer_share_gross), 0.00) as total_freelancer_share,
            COALESCE(SUM(team_leader_share), 0.00) as total_leader_share,
            COALESCE(SUM(manager_share), 0.00) as total_manager_share,
            COUNT(*) as total_entitlements_count
        FROM earning_entitlements
    ");
    $earningStats = $earnStmt->fetch();

    echo json_encode([
        'success' => true,
        'trial_balance' => $trialBalance,
        'payout_stats' => [
            'pending_count' => (int)$payoutStats['pending_count'],
            'pending_amount' => (float)$payoutStats['pending_amount'],
            'paid_count' => (int)$payoutStats['paid_count'],
            'paid_amount' => (float)$payoutStats['paid_amount'],
            'failed_count' => (int)$payoutStats['failed_count']
        ],
        'reserve_stats' => [
            'held_count' => (int)$reserveStats['held_count'],
            'held_amount' => (float)$reserveStats['held_amount'],
            'matured_ready_count' => (int)$reserveStats['matured_ready_count'],
            'matured_ready_amount' => (float)$reserveStats['matured_ready_amount'],
            'released_count' => (int)$reserveStats['released_count'],
            'released_amount' => (float)$reserveStats['released_amount']
        ],
        'growth_pool' => [
            'total_amount' => (float)$growthStats['total_growth_pool'],
            'tl_routed_count' => (int)$growthStats['tl_routed_count'],
            'mgr_routed_count' => (int)$growthStats['mgr_routed_count']
        ],
        'earning_stats' => [
            'total_gross_field_cost' => (float)$earningStats['total_gross_field_cost'],
            'total_freelancer_share' => (float)$earningStats['total_freelancer_share'],
            'total_leader_share' => (float)$earningStats['total_leader_share'],
            'total_manager_share' => (float)$earningStats['total_manager_share'],
            'total_entitlements_count' => (int)$earningStats['total_entitlements_count']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
