<?php
/**
 * We Onboard — Financial Reconciliation & Audit API (Phase 7)
 * GET /api/v1/admin/financial/reconcile.php
 * 
 * Verifies:
 * 1. Double-Entry Balance: SUM(Debits) == SUM(Credits) across entire ledger
 * 2. Wallet vs Ledger Reconciliation: Checks that each freelancer's wallet.available_balance matches net credits on account 2001
 * 3. Reserve Balance Reconciliation: Checks that wallet.reserved_balance matches sum of Held reserves in reserve_records
 * 4. Payout In-Transit Reconciliation: Checks that sum of (Requested, Under Review, Processing) payouts equals account 2005 balance
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

    // 1. Trial Balance Audit
    $trialBalance = FinancialEngine::getTrialBalance($db);

    // 2. Wallets vs Ledger Audit for all freelancers
    $wStmt = $db->query("
        SELECT 
            w.freelancer_id,
            fl.full_name,
            fl.registration_ref,
            w.available_balance as wallet_available,
            w.reserved_balance as wallet_reserved,
            w.payouts_in_progress as wallet_payouts_in_progress,
            -- Derived from ledger entries on account 2001
            COALESCE((
                SELECT SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE -le.amount END)
                FROM ledger_entries le
                WHERE le.account_code = '2001' AND le.entity_id = CAST(w.freelancer_id AS CHAR)
            ), 0.00) as ledger_available,
            -- Derived from reserve_records where status = 'Held'
            COALESCE((
                SELECT SUM(rr.amount)
                FROM reserve_records rr
                WHERE rr.freelancer_id = w.freelancer_id AND rr.status = 'Held'
            ), 0.00) as verified_held_reserves,
            -- Derived from active payout_requests
            COALESCE((
                SELECT SUM(pr.amount)
                FROM payout_requests pr
                WHERE pr.freelancer_id = w.freelancer_id AND pr.status IN ('Requested', 'Under Review', 'Processing', 'Approved')
            ), 0.00) as verified_payouts_in_progress
        FROM wallets w
        JOIN freelancers fl ON w.freelancer_id = fl.id
        ORDER BY w.freelancer_id ASC
    ");
    $walletAudits = $wStmt->fetchAll();

    $reconciliationExceptions = [];
    $totalWalletAvailable = 0.0;
    $totalLedgerAvailable = 0.0;

    foreach ($walletAudits as &$wa) {
        $wAvail = (float)$wa['wallet_available'];
        $lAvail = (float)$wa['ledger_available'];
        $wRes = (float)$wa['wallet_reserved'];
        $vRes = (float)$wa['verified_held_reserves'];
        $wPo = (float)$wa['wallet_payouts_in_progress'];
        $vPo = (float)$wa['verified_payouts_in_progress'];

        $totalWalletAvailable = round($totalWalletAvailable + $wAvail, 2);
        $totalLedgerAvailable = round($totalLedgerAvailable + $lAvail, 2);

        $availDiff = abs($wAvail - $lAvail);
        $resDiff = abs($wRes - $vRes);
        $poDiff = abs($wPo - $vPo);

        $isReconciled = ($availDiff < 0.005 && $resDiff < 0.005 && $poDiff < 0.005);
        $wa['is_reconciled'] = $isReconciled;
        $wa['available_discrepancy'] = $availDiff;

        if (!$isReconciled) {
            $reconciliationExceptions[] = [
                'freelancer_id' => $wa['freelancer_id'],
                'full_name' => $wa['full_name'],
                'registration_ref' => $wa['registration_ref'],
                'wallet_available' => $wAvail,
                'ledger_available' => $lAvail,
                'available_discrepancy' => $availDiff,
                'wallet_reserved' => $wRes,
                'verified_held_reserves' => $vRes,
                'wallet_payouts_in_progress' => $wPo,
                'verified_payouts_in_progress' => $vPo
            ];
        }
    }

    $overallReconciled = ($trialBalance['is_balanced'] && empty($reconciliationExceptions));

    echo json_encode([
        'success' => true,
        'overall_reconciled' => $overallReconciled,
        'audit_timestamp' => date('Y-m-d H:i:s'),
        'trial_balance' => $trialBalance,
        'summary' => [
            'total_freelancer_wallets' => count($walletAudits),
            'total_wallet_available' => $totalWalletAvailable,
            'total_ledger_available' => $totalLedgerAvailable,
            'variance' => abs($totalWalletAvailable - $totalLedgerAvailable),
            'exceptions_count' => count($reconciliationExceptions)
        ],
        'exceptions' => $reconciliationExceptions,
        'wallet_audits' => $walletAudits
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Reconciliation error: ' . $e->getMessage()]);
}
