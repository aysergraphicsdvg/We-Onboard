<?php
$rootCandidates = [dirname(__DIR__, 2), dirname(__DIR__, 3), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/idempotency.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$businessName = trim($data['business_name'] ?? '');
$applicantName = trim($data['applicant_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$state = trim($data['state'] ?? 'Karnataka');
$category = trim($data['category'] ?? 'Micro');
$stage = trim($data['stage'] ?? '1-3 Years');
$services = is_array($data['requested_services'] ?? null) ? implode(', ', $data['requested_services']) : ($data['requested_services'] ?? 'Government Scheme Operations');
$description = trim($data['description'] ?? '');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

$cleanPhone = preg_replace('/[^\d+]/', '', $phone);

if (empty($businessName) || empty($applicantName) || empty($cleanPhone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Entity name, applicant name, and contact phone number are required.']);
    exit;
}

$currentEndpoint = 'msme_request';
$currentPayloadHash = hash('sha256', !empty($rawInput) ? $rawInput : json_encode($data));

$db = null;
try {
    $db = Database::getConnection();

    // 1. Atomic Idempotency Check & Concurrency Reservation
    $idem = Idempotency::reserve($db, $idempotencyKey, $currentEndpoint, $currentPayloadHash);
    if ($idem['status'] === Idempotency::STATUS_HIT) {
        header('X-Idempotency-Hit: true');
        echo $idem['response_json'];
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_CONFLICT || $idem['status'] === Idempotency::STATUS_IN_PROGRESS) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_INVALID) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    }

    // 2. Prevent immediate duplicate submissions (within 5 minutes by same phone)
    $dupCheck = $db->prepare("SELECT request_ref FROM msme_requests WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1");
    $dupCheck->execute([$cleanPhone]);
    $existing = $dupCheck->fetch();
    if ($existing) {
        $dupResponse = json_encode([
            'success' => true,
            'reference_id' => $existing['request_ref'],
            'message' => 'Department proposal already recorded under reference ' . $existing['request_ref'] . '. Our State Operations Director will connect shortly.'
        ]);
        if (!empty($idempotencyKey)) {
            Idempotency::commit($db, $idempotencyKey, $dupResponse);
        }
        echo $dupResponse;
        exit;
    }

    $db->beginTransaction();

    $ref = 'MSME-' . date('Y') . '-' . rand(1000, 9999);

    $stmt = $db->prepare("INSERT INTO msme_requests (request_ref, business_name, applicant_name, phone, email, city, state, category, stage, requested_services, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')");
    $stmt->execute([$ref, $businessName, $applicantName, $cleanPhone, $email, $city, $state, $category, $stage, $services, $description]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Government / MSME Desk', 'Proposal Request Logged', 'MSME', $ref, "Request logged for {$businessName} ({$category})", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'message' => 'Department proposal received. Our State Operations Director will connect shortly.'
    ]);

    $db->commit();

    // Commit idempotency record after successful transaction commit
    if (!empty($idempotencyKey)) {
        Idempotency::commit($db, $idempotencyKey, $responseJson);
    }

    echo $responseJson;
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    error_log("MSME request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to record proposal at this time. Please contact our nodal desk directly at mail@weonboard.in.']);
}
