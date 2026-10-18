<?php
/**
 * Strict CORS origin verification for We Onboard API
 * Enforces authorized frontend origins; disallows wildcard with credentials
 */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://weonboard.in',
    'https://www.weonboard.in',
    'https://api.weonboard.in',
    'https://aysergraphicsdvg.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

$isAllowed = false;
if (in_array($origin, $allowedOrigins, true)) {
    $isAllowed = true;
} elseif (preg_match('/^https:\/\/[a-z0-9\-]+\.run\.app$/', $origin)) {
    // Development / Google Cloud Run preview environments
    $isAllowed = true;
}

if ($isAllowed && !empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key");
    header("Access-Control-Max-Age: 86400");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
