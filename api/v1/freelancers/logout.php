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

header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['freelancer_id'])) {
    unset(
        $_SESSION['freelancer_id'],
        $_SESSION['freelancer_ref'],
        $_SESSION['freelancer_name'],
        $_SESSION['freelancer_email'],
        $_SESSION['user_type']
    );
}

// Regenerate session id on logout to prevent fixation
if (session_status() === PHP_SESSION_ACTIVE) {
    session_regenerate_id(true);
}

echo json_encode([
    'success' => true,
    'message' => 'Freelancer session invalidated successfully.'
]);
