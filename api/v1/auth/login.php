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

$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

// Security: Use authoritative REMOTE_ADDR only. Never trust client-supplied headers (X-Forwarded-For, etc.)
// which can be trivially forged to bypass IP-based rate limiting.
$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Rate limiting: Check failed attempts within last 15 minutes by IP or by Email
    $rateStmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR email = ?) AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $rateStmt->execute([$ip, $email]);
    $failedCount = (int)$rateStmt->fetchColumn();

    if ($failedCount >= 5) {
        http_response_code(429);
        echo json_encode([
            'success' => false, 
            'error' => 'Too many failed login attempts. Account access is temporarily locked for 15 minutes.'
        ]);
        exit;
    }

    // 2. Fetch active user
    $stmt = $db->prepare("SELECT u.id, u.name, u.email, u.password_hash, u.role_id, u.is_active, r.name as role_name 
                          FROM admin_users u 
                          JOIN roles r ON u.role_id = r.id 
                          WHERE LOWER(u.email) = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // 3. Verify password hash
    if ($user && (int)$user['is_active'] === 1 && password_verify($password, $user['password_hash'])) {
        // Clear failed login attempts on success
        $clearStmt = $db->prepare("DELETE FROM login_attempts WHERE ip_address = ? OR email = ?");
        $clearStmt->execute([$ip, $email]);

        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);
        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_name'] = $user['name'];
        $_SESSION['admin_email'] = $user['email'];
        $_SESSION['admin_role'] = $user['role_name'];
        $_SESSION['admin_role_id'] = $user['role_id'];

        // Update last_login
        $db->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

        // Audit log (NEVER log password or session ID)
        $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Login', 'Auth', ?, 'Successful admin authentication via API', ?)");
        $auditStmt->execute([$user['name'], (string)$user['id'], $ip]);

        echo json_encode([
            'success' => true,
            'message' => 'Authentication successful.',
            'user' => [
                'id' => (string)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role_name']
            ]
        ]);
        exit;
    }

    // 4. Failed authentication: log attempt and return generic error
    $logAttempt = $db->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)");
    $logAttempt->execute([$ip, $email]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Failed Login', 'Auth', 'SECURITY_EVENT', 'Failed login attempt', ?)");
    $auditStmt->execute([$email, $ip]);

    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'error' => 'Invalid credentials. Please check your email and password.'
    ]);
} catch (Exception $e) {
    error_log("Login server error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Authentication service temporarily unavailable. Please try again shortly.']);
}
