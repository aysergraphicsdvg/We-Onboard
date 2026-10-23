<?php
/**
 * We Onboard — Admin Double-Entry Journal Inspector API (Phase 7)
 * GET /api/v1/admin/financial/journals.php
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $typeFilter = $_GET['type'] ?? '';
    $refFilter = $_GET['ref'] ?? '';
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));

    $query = "SELECT * FROM ledger_journals WHERE 1=1";
    $params = [];

    if (!empty($typeFilter)) {
        $query .= " AND transaction_type = ?";
        $params[] = $typeFilter;
    }
    if (!empty($refFilter)) {
        $query .= " AND (journal_ref LIKE ? OR reference_id LIKE ?)";
        $params[] = "%{$refFilter}%";
        $params[] = "%{$refFilter}%";
    }

    $query .= " ORDER BY id DESC LIMIT " . $limit;

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $journals = $stmt->fetchAll();

    // Fetch entries for all retrieved journals
    if (!empty($journals)) {
        $journalIds = array_column($journals, 'id');
        $placeholders = implode(',', array_fill(0, count($journalIds), '?'));

        $entryStmt = $db->prepare("
            SELECT 
                le.*,
                la.account_name,
                la.account_type
            FROM ledger_entries le
            JOIN ledger_accounts la ON le.account_code = la.account_code
            WHERE le.journal_id IN ({$placeholders})
            ORDER BY le.journal_id DESC, le.id ASC
        ");
        $entryStmt->execute($journalIds);
        $allEntries = $entryStmt->fetchAll();

        $entriesByJournal = [];
        foreach ($allEntries as $e) {
            $entriesByJournal[$e['journal_id']][] = $e;
        }

        foreach ($journals as &$j) {
            $j['lines'] = $entriesByJournal[$j['id']] ?? [];
        }
    }

    echo json_encode([
        'success' => true,
        'journals' => $journals,
        'count' => count($journals)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
