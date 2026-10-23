<?php
/**
 * We Onboard — Freelancer Payout Request API (Phase 7)
 * POST /api/v1/payouts/request.php
 * 
 * Enforces:
 * - Authenticated freelancer session
 * - Approved KYC verification
 * - Zero fraud or disciplinary flags
 * - Available balance check with atomic row lock (SELECT ... FOR UPDATE)
 * - Minimum payout amount (₹500) and max transaction limit
 * - Double-entry ledger journal moving funds from Freelancer Payable (2001) to Payout Clearing (2005)
 * - Safe idempotency key handling
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

$freelancerId = $_SESSION['freelancer_id'] ?? null;
if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
$paymentMethod = $input['payment_method'] ?? 'UPI';
$beneficiaryName = trim($input['beneficiary_name'] ?? '');
$beneficiaryDetails = trim($input['beneficiary_details'] ?? '');
$idempotencyKey = trim($input['idempotency_key'] ?? '');

if ($amount <= 0 || empty($beneficiaryName) || empty($beneficiaryDetails)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Amount, beneficiary name, and beneficiary account/UPI details are required.']);
    exit;
}

if (!in_array($paymentMethod, ['UPI', 'Bank Transfer', 'NEFT'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payment method. Supported: UPI, Bank Transfer, NEFT.']);
    exit;
}

if (empty($idempotencyKey)) {
    $idempotencyKey = hash('sha256', $freelancerId . '_' . $amount . '_' . $beneficiaryDetails . '_' . date('YmdH'));
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    $result = FinancialEngine::requestPayout(
        $db,
        (int)$freelancerId,
        $amount,
        $paymentMethod,
        $beneficiaryName,
        $beneficiaryDetails,
        $idempotencyKey
    );

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Payout Requested', 'Payout', ?, ?, ?)
    ");
    $auditStmt->execute([
        $beneficiaryName,
        $result['payout_ref'],
        "Requested ₹{$amount} via {$paymentMethod} to {$beneficiaryDetails}. Journal: {$result['journal_ref']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => "Payout request for ₹" . number_format($amount, 2) . " submitted successfully.",
        'payout' => $result
    ]);

} catch (InvalidArgumentException $ie) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $ie->getMessage()]);
} catch (RuntimeException $re) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $re->getMessage()]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
