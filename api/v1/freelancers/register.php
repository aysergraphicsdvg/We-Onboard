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

$fullName = trim($data['full_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$dob = trim($data['dob'] ?? '2000-01-01');
$gender = trim($data['gender'] ?? 'Male');
$address = trim($data['residential_address'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$state = trim($data['state'] ?? 'Karnataka');
$pinCode = trim($data['pin_code'] ?? '560038');
$isAdult = !empty($data['is_adult']) ? 1 : 0;
$hasSmartphone = !empty($data['has_smartphone']) ? 1 : 0;
$languages = is_array($data['languages'] ?? null) ? implode(', ', $data['languages']) : ($data['languages'] ?? 'Kannada, English');
$preferredAreas = is_array($data['preferred_areas'] ?? null) ? implode(', ', $data['preferred_areas']) : ($data['preferred_areas'] ?? 'Indiranagar');
$workType = trim($data['preferred_work_type'] ?? 'Flexible');
$education = trim($data['education'] ?? '12th Pass');
$expYears = intval($data['previous_experience_years'] ?? 0);
$salesExp = !empty($data['sales_field_experience']) ? 1 : 0;
$skills = is_array($data['skills'] ?? null) ? implode(', ', $data['skills']) : ($data['skills'] ?? 'Field Operations');
$preferredRole = trim($data['preferred_role'] ?? 'Rider / Delivery Partner');
$prevEmployer = trim($data['previous_employer'] ?? '');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

$password = $data['password'] ?? '';
$cleanPhone = preg_replace('/[^\d+]/', '', $phone);
$digits = preg_replace('/\D/', '', $cleanPhone);

if (empty($fullName) || empty($cleanPhone) || empty($email) || !$isAdult || !$hasSmartphone) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Mandatory fields missing: Full name, phone, email, adult confirmation (18+), and smartphone availability are required.']);
    exit;
}

if (strlen($digits) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit mobile number.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}

// Strict Age Verification (Must be at least 18 years old)
try {
    $dobDate = new DateTime($dob);
    $today = new DateTime('today');
    $age = $dobDate->diff($today)->y;
    if ($age < 18) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Eligibility requirement: You must be at least 18 years of age to register as an independent field associate.']);
        exit;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Date of Birth (YYYY-MM-DD).']);
    exit;
}

// Password validation (if provided, must be at least 8 chars)
$passwordHash = null;
if (!empty($password)) {
    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Security requirement: Password must be at least 8 characters in length.']);
        exit;
    }
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
}

$currentEndpoint = 'freelancer_register';
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

    // 2. Check duplicates on phone or email (strict privacy: NEVER leak existing registration_ref)
    $checkStmt = $db->prepare("SELECT id FROM freelancers WHERE phone = ? OR email = ? LIMIT 1");
    $checkStmt->execute([$cleanPhone, $email]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        if (!empty($idempotencyKey)) {
            Idempotency::release($db, $idempotencyKey);
        }
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'An application with this mobile number or email address has already been submitted. Our operations team reviews all applications within 24-48 hours.'
        ]);
        exit;
    }

    $db->beginTransaction();

    $ref = 'WO-FR-' . date('Y') . '-' . str_pad((string)rand(100, 9999), 4, '0', STR_PAD_LEFT);

    $stmt = $db->prepare("INSERT INTO freelancers 
        (registration_ref, full_name, email, phone, dob, gender, residential_address, city, state, pin_code, is_adult, has_smartphone, languages, preferred_areas, preferred_work_type, education, previous_experience_years, sales_field_experience, skills, preferred_role, previous_employer, status, onboarding_status, language_preference, profile_completed_percent, password_hash) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'KYC Pending', 'en', 60, ?)");
    
    $stmt->execute([
        $ref, $fullName, $email, $cleanPhone, $dob, $gender, $address, $city, $state, $pinCode,
        $isAdult, $hasSmartphone, $languages, $preferredAreas, $workType, $education,
        $expYears, $salesExp, $skills, $preferredRole, $prevEmployer ?: null, $passwordHash
    ]);

    $newFreelancerId = (int)$db->lastInsertId();

    // Welcome Notification
    $notifStmt = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, 'Welcome to We Onboard', 'Your application has been received under our Zero Joining Fee guarantee. Next step: Upload your KYC identity documents to activate project assignments.', 'kyc')");
    $notifStmt->execute([$newFreelancerId]);

    // Record audit
    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Public Candidate', 'Freelancer Registration Submitted', 'Freelancer', $ref, "{$fullName} registered for {$preferredRole} in {$city} (Zero Fee Policy)", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'has_account' => !empty($passwordHash),
        'message' => 'Application submitted successfully under Zero Joining Fee policy. Our Bangalore team will review within 24-48 hours.'
    ]);

    $db->commit();

    // Commit idempotency record after successful transaction commit
    if (!empty($idempotencyKey)) {
        Idempotency::commit($db, $idempotencyKey, $responseJson);
    }

    echo $responseJson;
} catch (PDOException $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate entry') !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'An application with this mobile number or email address has already been submitted.']);
        exit;
    }
    error_log("Freelancer registration database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to complete registration at this time. Please try again or contact support at mail@weonboard.in.']);
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    error_log("Freelancer registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to complete registration at this time. Please try again or contact support at mail@weonboard.in.']);
}
