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

$db = null;
try {
    $db = Database::getConnection();

    // 1. Idempotency Check (if client provided an idempotency key)
    if (!empty($idempotencyKey)) {
        $idemStmt = $db->prepare("SELECT response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
        $idemStmt->execute([$idempotencyKey]);
        $cached = $idemStmt->fetchColumn();
        if ($cached) {
            echo $cached;
            exit;
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
        $db->prepare("INSERT IGNORE INTO idempotency_keys (idempotency_key, endpoint, request_payload_hash, response_json) VALUES (?, ?, ?, ?)")
           ->execute([$idempotencyKey, 'enquiry', hash('sha256', $rawInput), $responseJson]);
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
