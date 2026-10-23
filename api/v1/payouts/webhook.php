<?php
/**
 * We Onboard — Payment Provider Webhook Receiver (Phase 7)
 * POST /api/v1/payouts/webhook.php
 * 
 * Provides:
 * - Server-side HMAC-SHA256 signature verification
 * - Rejection of forged, expired, or unsigned webhook payloads
 * - Idempotent settlement and failure processing
 * - Double-entry ledger integration (settlement clearing -> cash, or failure clearing -> refund)
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

// Server-controlled webhook secret (configured in environment, never exposed to client)
$webhookSecret = getenv('PAYMENT_WEBHOOK_SECRET') ?: ($_ENV['PAYMENT_WEBHOOK_SECRET'] ?? 'weonboard_live_webhook_hmac_secret_2026');

$payloadRaw = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_WEONBOARD_SIGNATURE'] ?? $_SERVER['HTTP_X_PROVIDER_SIGNATURE'] ?? '';
$timestampHeader = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';

if (empty($payloadRaw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Empty webhook payload.']);
    exit;
}

// 1. Replay Protection: Timestamp must be within 300 seconds (5 minutes)
if (empty($timestampHeader) || !ctype_digit((string)$timestampHeader)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid webhook timestamp header.']);
    exit;
}

$age = abs(time() - (int)$timestampHeader);
if ($age > 300) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Webhook timestamp expired (replay protection).']);
    exit;
}

// 2. Strict HMAC-SHA256 Signature Verification
$expectedSignature = hash_hmac('sha256', $timestampHeader . '.' . $payloadRaw, $webhookSecret);
$isValidSignature = hash_equals($expectedSignature, $signatureHeader);

if (!$isValidSignature) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid webhook signature or unauthorized source.']);
    exit;
}

$data = json_decode($payloadRaw, true);
if (!$data || !isset($data['event'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON or missing event attribute.']);
    exit;
}

$event = $data['event'];
$payoutRef = $data['payout_ref'] ?? ($data['data']['payout_ref'] ?? '');
$providerRef = $data['provider_transfer_id'] ?? ($data['data']['provider_transfer_id'] ?? 'SIM-TRF-' . time());
$failureReason = $data['failure_reason'] ?? ($data['data']['failure_reason'] ?? 'Bank rejected transfer');

try {
    $db = Database::getConnection();

    // Find payout request
    $poStmt = $db->prepare("SELECT id, status, amount, freelancer_id FROM payout_requests WHERE payout_ref = ?");
    $poStmt->execute([$payoutRef]);
    $payout = $poStmt->fetch();

    if (!$payout) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => "Payout request '{$payoutRef}' not found."]);
        exit;
    }

    $db->beginTransaction();

    if ($event === 'transfer.success' || $event === 'transfer.settled') {
        $result = FinancialEngine::settlePayout($db, (int)$payout['id'], $providerRef, 'PAYMENT_WEBHOOK');
        $db->commit();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => "Payout {$payoutRef} settled successfully.",
            'result' => $result
        ]);
        exit;

    } elseif ($event === 'transfer.failed' || $event === 'transfer.reversed') {
        if ($payout['status'] === 'Paid') {
            $db->rollBack();
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'received' => true,
                'event' => $event,
                'error' => "Conflict: Payout {$payoutRef} is already settled as Paid. Out-of-order failure event rejected."
            ]);
            exit;
        }
        $result = FinancialEngine::reversePayout($db, (int)$payout['id'], $failureReason, 'PAYMENT_WEBHOOK');
        $db->commit();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => "Payout {$payoutRef} reversed and funds refunded.",
            'result' => $result
        ]);
        exit;

    } else {
        $db->rollBack();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => 'Ignored unhandled event type.'
        ]);
        exit;
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Webhook processing failed: ' . $e->getMessage()]);
}
