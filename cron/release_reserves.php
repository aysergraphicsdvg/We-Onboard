<?php
/**
 * We Onboard — Scheduled Reserve Release Worker (Phase 7)
 * Command line or cron invocation:
 * php cron/release_reserves.php
 * 
 * Automatically scans reserve_records where status = 'Held' AND release_due_at <= NOW().
 * Posts balanced double-entry journals moving funds from 2004 (Reserve Liability) to 2001 (Freelancer Available).
 * Updates wallet projections.
 */

$rootCandidates = [dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    die("System configuration not found\n");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

$isCli = (php_sapi_name() === 'cli');

// If HTTP request, require CRON_KEY secret
if (!$isCli) {
    $cronKey = $_GET['cron_key'] ?? '';
    $configuredKey = getenv('CRON_KEY') ?: 'weonboard_cron_secret_key_2026';
    if ($cronKey !== $configuredKey) {
        http_response_code(403);
        die(json_encode(['success' => false, 'error' => 'Unauthorized cron execution.']));
    }
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    $result = FinancialEngine::releaseMaturedReserves($db, 'CRON_SCHEDULER');

    $db->commit();

    $output = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'matured_reserves_released' => $result['released_count'],
        'total_amount_released' => $result['total_amount'],
        'released_references' => $result['released_refs']
    ];

    if ($isCli) {
        echo "[" . date('Y-m-d H:i:s') . "] Reserve Release Worker Completed. Released: {$result['released_count']} reserves, Total: ₹{$result['total_amount']}\n";
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($output, JSON_PRETTY_PRINT);
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($isCli) {
        fwrite(STDERR, "Error releasing reserves: " . $e->getMessage() . "\n");
        exit(1);
    } else {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
