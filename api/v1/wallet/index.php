<?php
/**
 * We Onboard — Freelancer Wallet & Balances API (Phase 7)
 * GET /api/v1/wallet/index.php
 * 
 * Returns:
 * - Available balance (withdrawable)
 * - Reserved balance (10% quality hold for 15 days)
 * - Pending earnings (tasks submitted awaiting QC approval)
 * - Total lifetime earnings (70% gross entitlements)
 * - Payouts in progress and total paid out
 * - Recent transaction ledger entries
 * - Active reserve records with release countdown
 * - Recent payout requests
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
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Authenticate Freelancer
$freelancerId = null;
if (isset($_SESSION['freelancer_id'])) {
    $freelancerId = (int)$_SESSION['freelancer_id'];
} elseif (isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    // Admin reviewing freelancer wallet
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in as freelancer.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Fetch Freelancer Info
    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, email, status, onboarding_status, fraud_flag, current_rank FROM freelancers WHERE id = ?");
    $flStmt->execute([$freelancerId]);
    $freelancer = $flStmt->fetch();
    if (!$freelancer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    // 2. Ensure Wallet Record Exists
    $db->prepare("
        INSERT IGNORE INTO wallets (freelancer_id, total_earned, available_balance, reserved_balance, pending_earnings, payouts_in_progress, paid_payouts)
        VALUES (?, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
    ")->execute([$freelancerId]);

    // 3. Calculate pending earnings dynamically from tasks submitted awaiting QC review
    $pendingStmt = $db->prepare("
        SELECT COALESCE(SUM(payout_amount * 0.70), 0.00) as dynamic_pending
        FROM tasks
        WHERE assigned_freelancer_id = ? AND status IN ('Submitted', 'Under Review')
    ");
    $pendingStmt->execute([$freelancerId]);
    $dynamicPending = (float)$pendingStmt->fetchColumn();

    // 4. Fetch Wallet Record
    $wStmt = $db->prepare("SELECT * FROM wallets WHERE freelancer_id = ?");
    $wStmt->execute([$freelancerId]);
    $wallet = $wStmt->fetch();

    // 5. Fetch Recent Ledger Entries for this Freelancer (Entity ID = freelancer_id)
    $leStmt = $db->prepare("
        SELECT 
            le.id,
            le.account_code,
            la.account_name,
            le.entry_type,
            le.amount,
            le.line_narration,
            le.created_at,
            lj.journal_ref,
            lj.transaction_type,
            lj.reference_id
        FROM ledger_entries le
        JOIN ledger_journals lj ON le.journal_id = lj.id
        JOIN ledger_accounts la ON le.account_code = la.account_code
        WHERE le.entity_id = ? AND le.entity_type = 'Freelancer'
        ORDER BY le.id DESC
        LIMIT 25
    ");
    $leStmt->execute([(string)$freelancerId]);
    $ledgerEntries = $leStmt->fetchAll();

    // 6. Fetch Active & Recent Reserve Records (with countdown)
    $resStmt = $db->prepare("
        SELECT 
            r.*,
            t.task_ref,
            t.title as task_title,
            TIMESTAMPDIFF(SECOND, NOW(), r.release_due_at) as seconds_to_release
        FROM reserve_records r
        LEFT JOIN tasks t ON r.task_id = t.id
        WHERE r.freelancer_id = ?
        ORDER BY r.id DESC
        LIMIT 15
    ");
    $resStmt->execute([$freelancerId]);
    $reserves = $resStmt->fetchAll();

    // 7. Fetch Recent Payout Requests
    $poStmt = $db->prepare("
        SELECT * FROM payout_requests 
        WHERE freelancer_id = ? 
        ORDER BY id DESC 
        LIMIT 10
    ");
    $poStmt->execute([$freelancerId]);
    $payouts = $poStmt->fetchAll();

    // 8. Fetch Earning Entitlements (Approved Task Splits)
    $eeStmt = $db->prepare("
        SELECT 
            ee.*,
            t.task_ref,
            t.title as task_title,
            p.name as project_name
        FROM earning_entitlements ee
        JOIN tasks t ON ee.task_id = t.id
        JOIN projects p ON ee.project_id = p.id
        WHERE ee.freelancer_id = ?
        ORDER BY ee.id DESC
        LIMIT 15
    ");
    $eeStmt->execute([$freelancerId]);
    $entitlements = $eeStmt->fetchAll();

    $cfg = FinancialEngine::getConfig($db);

    echo json_encode([
        'success' => true,
        'wallet' => [
            'freelancer_id' => $freelancerId,
            'freelancer_name' => $freelancer['full_name'],
            'registration_ref' => $freelancer['registration_ref'],
            'current_rank' => $freelancer['current_rank'],
            'available_balance' => (float)$wallet['available_balance'],
            'reserved_balance' => (float)$wallet['reserved_balance'],
            'pending_earnings' => $dynamicPending,
            'total_earned' => (float)$wallet['total_earned'],
            'payouts_in_progress' => (float)$wallet['payouts_in_progress'],
            'paid_payouts' => (float)$wallet['paid_payouts'],
            'currency' => 'INR',
            'currency_symbol' => '₹',
            'is_kyc_approved' => in_array($freelancer['status'], ['Active', 'Approved']) || $freelancer['onboarding_status'] === 'Approved',
            'has_fraud_flag' => (int)$freelancer['fraud_flag'] === 1,
            'min_payout_amount' => $cfg['min_payout_amount'],
            'max_payout_amount' => $cfg['max_payout_amount'],
            'last_reconciled_at' => $wallet['last_reconciled_at']
        ],
        'ledger_entries' => $ledgerEntries,
        'reserves' => $reserves,
        'payouts' => $payouts,
        'entitlements' => $entitlements
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
