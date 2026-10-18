<?php
$rootCandidates = [dirname(__DIR__), dirname(__DIR__, 2), __DIR__];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die("System configuration error: config/config.php not found.");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

if (empty($_SESSION['admin_id'])) {
    header('Location: /admin/login.php');
    exit;
}

$db = Database::getConnection();
$stmt = $db->prepare("SELECT u.*, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
$stmt->execute([$_SESSION['admin_id']]);
$currentAdmin = $stmt->fetch();

if (!$currentAdmin) {
    session_destroy();
    header('Location: /admin/login.php?error=session_expired');
    exit;
}

/**
 * Server-authoritative Role Verification Helper
 * Enforces role capabilities on the server rather than trusting frontend state
 */
function require_role($allowed_roles = ['Super Admin']) {
    global $currentAdmin;
    $allowed = (array)$allowed_roles;
    if (!$currentAdmin || !in_array($currentAdmin['role_name'], $allowed, true)) {
        http_response_code(403);
        die("<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style='font-family: sans-serif; padding: 40px; text-align: center;'><h1 style='color: #02167F;'>403 Forbidden</h1><p>You do not have the required permissions to access this administrative resource.</p><p><a href='/admin/dashboard.php'>&larr; Return to Dashboard</a></p></body></html>");
    }
}
