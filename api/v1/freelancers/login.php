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

$identifier = trim($data['identifier'] ?? ($data['email'] ?? ($data['phone'] ?? '')));
$password = $data['password'] ?? '';

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

if (empty($identifier) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Login identifier (email, phone, or registration reference) and password are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Rate limiting check (5 attempts per 15 minutes by IP or identifier)
    $rateStmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR email = ?) AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $rateStmt->execute([$ip, $identifier]);
    $failedCount = (int)$rateStmt->fetchColumn();

    if ($failedCount >= 5) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Too many failed login attempts. For security, your account login is temporarily locked for 15 minutes.'
        ]);
        exit;
    }

    // 2. Fetch freelancer by email, clean phone, or registration_ref
    $cleanPhone = preg_replace('/[^\d+]/', '', $identifier);
    $stmt = $db->prepare("SELECT * FROM freelancers WHERE LOWER(email) = LOWER(?) OR registration_ref = ? OR (phone = ? AND LENGTH(?) >= 10) LIMIT 1");
    $stmt->execute([$identifier, $identifier, $cleanPhone, $cleanPhone]);
    $fl = $stmt->fetch();

    // 3. Verify password hash using secure password_verify
    if ($fl && !empty($fl['password_hash']) && password_verify($password, $fl['password_hash'])) {
        // Check if account is suspended or inactive
        if (in_array($fl['status'], ['Suspended', 'Inactive'], true)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'This account is currently ' . strtolower($fl['status']) . '. Please reach out to operations at mail@weonboard.in.'
            ]);
            exit;
        }

        // Clear failed login attempts
        $clearStmt = $db->prepare("DELETE FROM login_attempts WHERE ip_address = ? OR email = ?");
        $clearStmt->execute([$ip, $identifier]);

        // Regenerate session ID to prevent session fixation attacks
        session_regenerate_id(true);

        // Strict Session Isolation: Clear any admin session attributes
        unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_email'], $_SESSION['admin_role'], $_SESSION['admin_role_id']);

        // Set freelancer session
        $_SESSION['freelancer_id'] = (int)$fl['id'];
        $_SESSION['freelancer_ref'] = $fl['registration_ref'];
        $_SESSION['freelancer_name'] = $fl['full_name'];
        $_SESSION['freelancer_email'] = $fl['email'];
        $_SESSION['user_type'] = 'freelancer';

        // Audit log (Never log password or raw session token)
        $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Freelancer Login', 'Auth', ?, 'Successful freelancer self-service authentication', ?)");
        $auditStmt->execute([$fl['full_name'], (string)$fl['registration_ref'], $ip]);

        // Load KYC documents status
        $docsStmt = $db->prepare("SELECT id, document_ref, document_type, original_filename, status, rejection_reason, created_at, reviewed_at FROM freelancer_documents WHERE freelancer_id = ? ORDER BY created_at ASC");
        $docsStmt->execute([$fl['id']]);
        $documents = $docsStmt->fetchAll();

        // Load recent notifications
        $notifStmt = $db->prepare("SELECT id, title, message, type, is_read, created_at FROM freelancer_notifications WHERE freelancer_id = ? ORDER BY created_at DESC LIMIT 10");
        $notifStmt->execute([$fl['id']]);
        $notifications = $notifStmt->fetchAll();

        echo json_encode([
            'success' => true,
            'message' => 'Freelancer authentication successful.',
            'csrf_token' => $_SESSION['csrf_token'],
            'user' => [
                'id' => (string)$fl['id'],
                'registrationRef' => $fl['registration_ref'],
                'fullName' => $fl['full_name'],
                'email' => $fl['email'],
                'phone' => $fl['phone'],
                'city' => $fl['city'],
                'state' => $fl['state'],
                'preferredRole' => $fl['preferred_role'],
                'status' => $fl['status'],
                'onboardingStatus' => $fl['onboarding_status'] ?? 'KYC Pending',
                'languagePreference' => $fl['language_preference'] ?? 'en',
                'profileCompletedPercent' => (int)($fl['profile_completed_percent'] ?? 60),
                'registeredAt' => $fl['created_at'],
                'documents' => $documents,
                'notifications' => $notifications
            ]
        ]);
        exit;
    }

    // 4. Record failed attempt
    $logAttempt = $db->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)");
    $logAttempt->execute([$ip, $identifier]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Failed Freelancer Login', 'Auth', 'SECURITY_EVENT', 'Failed login attempt for freelancer identifier', ?)");
    $auditStmt->execute([$identifier, $ip]);

    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid credentials. Please verify your registered email/phone and password.'
    ]);
} catch (Exception $e) {
    error_log("Freelancer login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Authentication service temporarily unavailable. Please try again shortly.']);
}
