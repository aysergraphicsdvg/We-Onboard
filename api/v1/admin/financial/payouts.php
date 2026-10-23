<?php
/**
 * We Onboard — Admin Payout Processing & Settlement API (Phase 7)
 * GET /api/v1/admin/financial/payouts.php - List payout requests
 * POST /api/v1/admin/financial/payouts.php - Action: approve, settle, reject
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

$adminName = $_SESSION['admin_name'] ?? 'Admin Reviewer';

try {
    $db = Database::getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $payoutId = (int)($input['payout_id'] ?? 0);
        $action = $input['action'] ?? ''; // 'approve', 'settle', 'reject'
        $providerRef = trim($input['provider_transfer_id'] ?? ('SIM-TRF-' . strtoupper(bin2hex(random_bytes(4)))));
        $reason = trim($input['reason'] ?? '');

        if ($payoutId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid payout_id required.']);
            exit;
        }

        $db->beginTransaction();

        if ($action === 'settle' || $action === 'approve_and_settle') {
            $result = FinancialEngine::settlePayout($db, $payoutId, $providerRef, $adminName);
            
            // Audit log
            $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Payout Settled & Disbursed', 'Payout', ?, ?, ?)
            ")->execute([
                $adminName,
                $result['payout_ref'],
                "Disbursed via provider adapter. Ref: {$providerRef}. Journal: {$result['journal_ref']}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Payout {$result['payout_ref']} confirmed as Paid. Journal: {$result['journal_ref']}",
                'result' => $result
            ]);
            exit;

        } elseif ($action === 'reject' || $action === 'fail') {
            if (empty($reason)) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A rejection or failure reason is mandatory.']);
                exit;
            }

            $result = FinancialEngine::reversePayout($db, $payoutId, $reason, $adminName);

            // Audit log
            $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Payout Rejected & Refunded', 'Payout', ?, ?, ?)
            ")->execute([
                $adminName,
                $result['payout_ref'],
                "Rejected. Refunded ₹{$result['refunded_amount']} to available balance. Reason: {$reason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Payout {$result['payout_ref']} rejected. Funds refunded to associate's available balance.",
                'result' => $result
            ]);
            exit;

        } else {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Invalid action '{$action}'. Supported: settle, reject."]);
            exit;
        }
    }

    // GET: List payout requests
    $statusFilter = $_GET['status'] ?? '';
    $query = "
        SELECT 
            p.*,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            fl.email as freelancer_email,
            fl.phone as freelancer_phone,
            w.available_balance as current_available_balance,
            lj.journal_ref as request_journal_ref,
            sj.journal_ref as settlement_journal_ref,
            rj.journal_ref as reversal_journal_ref
        FROM payout_requests p
        JOIN freelancers fl ON p.freelancer_id = fl.id
        LEFT JOIN wallets w ON p.freelancer_id = w.freelancer_id
        LEFT JOIN ledger_journals lj ON p.request_journal_id = lj.id
        LEFT JOIN ledger_journals sj ON p.settlement_journal_id = sj.id
        LEFT JOIN ledger_journals rj ON p.reversal_journal_id = rj.id
        WHERE 1=1
    ";
    $params = [];
    if (!empty($statusFilter)) {
        $query .= " AND p.status = ?";
        $params[] = $statusFilter;
    }
    $query .= " ORDER BY p.id DESC LIMIT 100";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $payouts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'payouts' => $payouts,
        'count' => count($payouts)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
