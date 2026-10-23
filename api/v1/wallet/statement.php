<?php
/**
 * We Onboard — Freelancer Financial Statement Generator (Phase 7)
 * GET /api/v1/wallet/statement.php?start_date=2026-01-01&end_date=2026-12-31&format=json|csv
 * 
 * Provides:
 * - Opening balance at start_date
 * - Itemized ledger movements (debits/credits) within range
 * - Closing balance at end_date
 * - Summary of gross earnings, reserves held/released, and payouts
 * - Direct CSV download stream or JSON payload
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

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$freelancerId = null;
if (isset($_SESSION['freelancer_id'])) {
    $freelancerId = (int)$_SESSION['freelancer_id'];
} elseif (isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Authentication required.']);
    exit;
}

$startDate = $_GET['start_date'] ?? date('Y-m-01'); // First of current month
$endDate = $_GET['end_date'] ?? date('Y-m-d'); // Today
$format = strtolower($_GET['format'] ?? 'json');

try {
    $db = Database::getConnection();

    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, email, city FROM freelancers WHERE id = ?");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    // 1. Calculate Opening Balance before start_date on account 2001 (Available Balance)
    // For account 2001 (Liability), Credits increase available, Debits decrease available
    $openStmt = $db->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0.00) as opening_balance
        FROM ledger_entries
        WHERE entity_id = ? AND entity_type = 'Freelancer' AND account_code = '2001'
        AND created_at < ?
    ");
    $openStmt->execute([(string)$freelancerId, $startDate . ' 00:00:00']);
    $openingBalance = (float)$openStmt->fetchColumn();

    // 2. Fetch Period Transactions
    $txStmt = $db->prepare("
        SELECT 
            le.id as entry_id,
            le.created_at as entry_date,
            le.account_code,
            la.account_name,
            le.entry_type,
            le.amount,
            le.line_narration,
            lj.journal_ref,
            lj.transaction_type,
            lj.reference_id
        FROM ledger_entries le
        JOIN ledger_journals lj ON le.journal_id = lj.id
        JOIN ledger_accounts la ON le.account_code = la.account_code
        WHERE le.entity_id = ? AND le.entity_type = 'Freelancer'
        AND le.created_at BETWEEN ? AND ?
        ORDER BY le.id ASC
    ");
    $txStmt->execute([(string)$freelancerId, $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
    $entries = $txStmt->fetchAll();

    // 3. Compute running balance and period totals
    $runningBalance = $openingBalance;
    $totalDebits = 0.0;
    $totalCredits = 0.0;

    foreach ($entries as &$e) {
        $amt = (float)$e['amount'];
        if ($e['account_code'] === '2001') {
            if ($e['entry_type'] === 'CREDIT') {
                $runningBalance = round($runningBalance + $amt, 2);
                $totalCredits = round($totalCredits + $amt, 2);
            } else {
                $runningBalance = round($runningBalance - $amt, 2);
                $totalDebits = round($totalDebits + $amt, 2);
            }
        }
        $e['running_available_balance'] = $runningBalance;
    }
    $closingBalance = $runningBalance;

    if ($format === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="weonboard-statement-' . $fl['registration_ref'] . '-' . $startDate . '-to-' . $endDate . '.csv"');
        
        $out = fopen('php://output', 'w');
        fputcsv($out, ['WE ONBOARD — FREELANCER ACCOUNT STATEMENT']);
        fputcsv($out, ['Associate Name', $fl['full_name'], 'Registration ID', $fl['registration_ref']]);
        fputcsv($out, ['Period', $startDate . ' to ' . $endDate, 'Generated At', date('Y-m-d H:i:s')]);
        fputcsv($out, ['Opening Available Balance (INR)', number_format($openingBalance, 2)]);
        fputcsv($out, ['Closing Available Balance (INR)', number_format($closingBalance, 2)]);
        fputcsv($out, []);
        fputcsv($out, ['Date', 'Journal Ref', 'Transaction Type', 'Account', 'Entry Type', 'Amount (INR)', 'Running Balance (INR)', 'Narration']);

        foreach ($entries as $row) {
            fputcsv($out, [
                $row['entry_date'],
                $row['journal_ref'],
                $row['transaction_type'],
                $row['account_code'] . ' - ' . $row['account_name'],
                $row['entry_type'],
                number_format($row['amount'], 2),
                number_format($row['running_available_balance'], 2),
                $row['line_narration']
            ]);
        }
        fclose($out);
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'statement' => [
            'freelancer_id' => $freelancerId,
            'freelancer_name' => $fl['full_name'],
            'registration_ref' => $fl['registration_ref'],
            'period_start' => $startDate,
            'period_end' => $endDate,
            'opening_balance' => $openingBalance,
            'closing_balance' => $closingBalance,
            'total_credits' => $totalCredits,
            'total_debits' => $totalDebits,
            'net_movement' => round($closingBalance - $openingBalance, 2),
            'currency' => 'INR',
            'generated_at' => date('Y-m-d H:i:s')
        ],
        'entries' => $entries
    ]);

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Statement generation failed: ' . $e->getMessage()]);
}
