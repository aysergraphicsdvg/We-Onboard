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
    die(json_encode(['status' => 'error', 'message' => 'Configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

$dbStatus = 'unavailable';
try {
    $db = Database::getConnection();
    if ($db) {
        $stmt = $db->query("SELECT 1");
        if ($stmt && $stmt->fetchColumn() == 1) {
            $dbStatus = 'available';
        }
    }
} catch (Exception $e) {
    error_log("Health check database failure: " . $e->getMessage());
    $dbStatus = 'unavailable';
}

$isHealthy = ($dbStatus === 'available');
http_response_code($isHealthy ? 200 : 503);

echo json_encode([
    'status' => $isHealthy ? 'healthy' : 'degraded',
    'service' => 'weonboard-api',
    'version' => '1.0.0',
    'database' => $dbStatus,
    'timestamp' => date('c')
], JSON_UNESCAPED_SLASHES);
