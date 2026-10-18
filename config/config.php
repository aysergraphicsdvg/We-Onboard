<?php
/**
 * We Onboard Business Platform
 * Configuration File — Hostinger Business Shared Hosting
 */

// Error reporting: Disabled in production for security; logged to error log
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Session Security Configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// Database Credentials (Must be explicitly configured via server environment or config/db_credentials.php)
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? ($_SERVER['DB_HOST'] ?? 'localhost'));
$dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? ($_SERVER['DB_NAME'] ?? ''));
$dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? ($_SERVER['DB_USER'] ?? ''));
$dbPass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? ($_SERVER['DB_PASS'] ?? ''));

// Optional: support an uncommitted, protected server credentials file if the PHP SAPI does not expose environment variables
$localDbConfig = __DIR__ . '/db_credentials.php';
if (file_exists($localDbConfig)) {
    $creds = include $localDbConfig;
    if (is_array($creds)) {
        $dbHost = $creds['DB_HOST'] ?? $dbHost;
        $dbName = $creds['DB_NAME'] ?? $dbName;
        $dbUser = $creds['DB_USER'] ?? $dbUser;
        $dbPass = $creds['DB_PASS'] ?? $dbPass;
    }
}

define('DB_HOST', $dbHost);
define('DB_NAME', $dbName);
define('DB_USER', $dbUser);
define('DB_PASS', $dbPass);
define('DB_CHARSET', 'utf8mb4');
define('ALLOW_WEB_INSTALL', (getenv('ALLOW_WEB_INSTALL') === 'true' || (isset($_ENV['ALLOW_WEB_INSTALL']) && $_ENV['ALLOW_WEB_INSTALL'] === 'true')));

// Application Paths & URLs
define('APP_NAME', 'We Onboard');
define('APP_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
define('ROOT_PATH', dirname(__DIR__));
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('INSTALL_LOCK_FILE', ROOT_PATH . '/config/install.lock');

// CSRF Protection Token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function verify_csrf() {
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        die(json_encode(['success' => false, 'error' => 'Security validation (CSRF) failed. Please refresh the page.']));
    }
}

function sanitize_output($str) {
    return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8');
}
