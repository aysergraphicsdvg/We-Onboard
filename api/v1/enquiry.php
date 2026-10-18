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

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$fullName = trim($data['full_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$company = trim($data['company_name'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$service = trim($data['service_required'] ?? 'General enquiry');
$message = trim($data['message'] ?? '');
$enquiryType = trim($data['enquiry_type'] ?? 'Business');
$source = trim($data['source'] ?? 'Website Contact Form');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

// Server-side validation
if (empty($fullName) || empty($phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Full name and contact phone number are required.']);
    exit;
}

// Clean phone (digits and optional leading +)
$cleanPhone = preg_replace('/[^\d+]/', '', $phone);
if (strlen(preg_replace('/\D/', '', $cleanPhone)) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit phone number.']);
    exit;
}

if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}

$allowedEnquiryTypes = ['Business', 'Freelancer', 'MSME', 'Franchise / dealership brand', 'General enquiry'];
if (!in_array($enquiryType, $allowedEnquiryTypes, true)) {
    $enquiryType = 'Business';
}

$currentEndpoint = 'enquiry';
$currentPayloadHash = hash('sha256', !empty($rawInput) ? $rawInput : json_encode($data));

$db = null;
try {
    $db = Database::getConnection();

    // 1. Strict Idempotency Check & Conflict Resolution
    if (!empty($idempotencyKey)) {
        if (!preg_match('/^[A-Za-z0-9_\-]{8,64}$/', $idempotencyKey)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid idempotency key format. Must be 8-64 alphanumeric characters, underscores, or hyphens.'
            ]);
            exit;
        }

        $idemStmt = $db->prepare("SELECT endpoint, request_payload_hash, response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
        $idemStmt->execute([$idempotencyKey]);
        $cached = $idemStmt->fetch(PDO::FETCH_ASSOC);

        if ($cached) {
            if ($cached['endpoint'] === $currentEndpoint && hash_equals($cached['request_payload_hash'], $currentPayloadHash)) {
                // Legitimate idempotent replay: return cached response
                header('X-Idempotency-Hit: true');
                echo $cached['response_json'];
                exit;
            } else {
                // Key reuse conflict: same key with different payload or endpoint
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Idempotency conflict: The provided idempotency key has already been used with a different endpoint or request payload.'
                ]);
                exit;
            }
        }
    }

    // 2. Prevent immediate duplicate submissions (within last 2 minutes by same phone)
    $dupCheck = $db->prepare("SELECT enquiry_ref FROM enquiries WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1");
    $dupCheck->execute([$cleanPhone]);
    $existing = $dupCheck->fetch();
    if ($existing) {
        echo json_encode([
            'success' => true,
            'reference_id' => $existing['enquiry_ref'],
            'message' => 'Thank you! Your enquiry has already been received. Our operations team in Bangalore will contact you shortly.'
        ]);
        exit;
    }

    $db->beginTransaction();

    $ref = 'WO-ENQ-' . date('Ymd') . '-' . rand(100, 999);

    $stmt = $db->prepare("INSERT INTO enquiries 
        (enquiry_ref, full_name, company_name, phone, email, enquiry_type, city, service_required, message, source, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')");
    $stmt->execute([$ref, $fullName, $company ?: null, $cleanPhone, $email, $enquiryType, $city, $service, $message, $source]);

    // Record audit log
    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Public Inbound', 'Public Enquiry Submitted', 'Enquiry', $ref, "New {$enquiryType} enquiry from {$fullName} ({$city})", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'message' => 'Thank you! Your enquiry has been received. Our operations team in Bangalore will contact you shortly.'
    ]);

    if (!empty($idempotencyKey)) {
        $db->prepare("INSERT INTO idempotency_keys (idempotency_key, endpoint, request_payload_hash, response_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id")
           ->execute([$idempotencyKey, $currentEndpoint, $currentPayloadHash, $responseJson]);
    }

    $db->commit();
    echo $responseJson;
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Enquiry submission error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to record enquiry at this time. Please contact us directly at +91 96111 09490.']);
}
