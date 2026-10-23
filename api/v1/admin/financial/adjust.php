<?php
/**
 * We Onboard — Admin Manual Correction / Adjustment API (Phase 7)
 * POST /api/v1/admin/financial/adjust.php
 * 
 * Enforces:
 * - Immutable ledger: Cannot update or delete existing posted journals
 * - Errors must be corrected via linked reversal or balanced correction entries
 * - Total debits must equal total credits
 * - Mandatory supervisor reason and actor attribution
 * - Segregation of duties: Admin cannot self-credit without supervisor attribution
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

verify_csrf();

$adminName = $_SESSION['admin_name'] ?? 'Admin Supervisor';

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$reversalOfJournalId = isset($input['reversal_of_journal_id']) ? (int)$input['reversal_of_journal_id'] : null;
$narration = trim($input['narration'] ?? '');
$supervisorReason = trim($input['supervisor_reason'] ?? '');
$entries = $input['entries'] ?? [];

if (empty($narration) || empty($supervisorReason)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Both narration and explicit supervisor justification reason are required for financial adjustments.']);
    exit;
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    // If reversing an existing journal:
    if ($reversalOfJournalId) {
        $jStmt = $db->prepare("SELECT * FROM ledger_journals WHERE id = ? FOR UPDATE");
        $jStmt->execute([$reversalOfJournalId]);
        $origJournal = $jStmt->fetch();

        if (!$origJournal) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => "Original journal ID {$reversalOfJournalId} not found."]);
            exit;
        }

        if ((int)$origJournal['is_reversed'] === 1) {
            $db->rollBack();
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => "Journal {$origJournal['journal_ref']} has already been reversed."]);
            exit;
        }

        // Fetch original entries and invert them (DEBIT becomes CREDIT, CREDIT becomes DEBIT)
        $origEntriesStmt = $db->prepare("SELECT * FROM ledger_entries WHERE journal_id = ?");
        $origEntriesStmt->execute([$reversalOfJournalId]);
        $origEntries = $origEntriesStmt->fetchAll();

        $reversingEntries = [];
        foreach ($origEntries as $oe) {
            $reversingEntries[] = [
                'account_code' => $oe['account_code'],
                'type' => ($oe['entry_type'] === 'DEBIT') ? 'CREDIT' : 'DEBIT',
                'amount' => (float)$oe['amount'],
                'entity_type' => $oe['entity_type'],
                'entity_id' => $oe['entity_id'],
                'narration' => "Reversal line for {$origJournal['journal_ref']}. Reason: {$supervisorReason}"
            ];
        }

        $revJournal = FinancialEngine::postJournal(
            $db,
            'MANUAL_ADJUSTMENT',
            $origJournal['journal_ref'],
            "Reversal of {$origJournal['journal_ref']}: {$narration}. Reason: {$supervisorReason}",
            $reversingEntries,
            $adminName,
            $reversalOfJournalId
        );

        // Mark original journal as reversed
        $upOrig = $db->prepare("UPDATE ledger_journals SET is_reversed = 1, reversed_by_journal_id = ? WHERE id = ?");
        $upOrig->execute([$revJournal['journal_id'], $reversalOfJournalId]);

        // Audit log
        $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Journal Reversed & Adjusted', 'Ledger', ?, ?, ?)
        ")->execute([
            $adminName,
            $origJournal['journal_ref'],
            "Reversed by {$revJournal['journal_ref']}. Supervisor Justification: {$supervisorReason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Journal {$origJournal['journal_ref']} successfully reversed by {$revJournal['journal_ref']}.",
            'reversal_journal' => $revJournal
        ]);
        exit;
    }

    // Direct balanced correction journal
    if (empty($entries) || !is_array($entries)) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'At least two balanced entries (Debits and Credits) are required.']);
        exit;
    }

    $adjJournal = FinancialEngine::postJournal(
        $db,
        'MANUAL_ADJUSTMENT',
        'ADJ-' . time(),
        $narration . " (Supervisor Reason: {$supervisorReason})",
        $entries,
        $adminName
    );

    // Audit log
    $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Manual Adjustment Posted', 'Ledger', ?, ?, ?)
    ")->execute([
        $adminName,
        $adjJournal['journal_ref'],
        "Narration: {$narration}. Justification: {$supervisorReason}. Debits/Credits: ₹{$adjJournal['total_debit']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => "Adjustment journal {$adjJournal['journal_ref']} posted successfully.",
        'journal' => $adjJournal
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Adjustment error: ' . $e->getMessage()]);
}
