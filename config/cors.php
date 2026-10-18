<?php
/**
 * Strict CORS origin verification for We Onboard API
 * Enforces authorized frontend origins; disallows wildcard with credentials
 */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Explicitly approved production and development origins
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

// Optional: allow explicit, non-wildcard additional origins via server environment
$extraOrigins = getenv('ADDITIONAL_ALLOWED_ORIGINS') ?: ($_ENV['ADDITIONAL_ALLOWED_ORIGINS'] ?? '');
if (!empty($extraOrigins)) {
    $parsedExtras = array_filter(array_map('trim', explode(',', $extraOrigins)));
    foreach ($parsedExtras as $extra) {
        if (preg_match('#^https?://[a-zA-Z0-9\-\.]+(:\d+)?$#', $extra)) {
            $allowedOrigins[] = $extra;
        }
    }
}

$isAllowed = (!empty($origin) && in_array($origin, $allowedOrigins, true));

// Handle CORS Preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (!empty($origin) && !$isAllowed) {
        // Explicit rejection for unapproved origins
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => 'CORS origin not allowed']);
        exit;
    }

    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key");
        header("Access-Control-Max-Age: 86400");
        header("Vary: Origin");
        http_response_code(204);
        exit;
    }

    // Direct OPTIONS request without Origin header
    http_response_code(204);
    exit;
}

// For actual requests (GET, POST, etc.)
if ($isAllowed) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key");
    header("Vary: Origin");
}
