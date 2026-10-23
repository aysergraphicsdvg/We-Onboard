<?php
/**
 * We Onboard — Hardened Quality Control Decision & Review API (Phase 6)
 * POST /api/v1/admin/qc/review.php
 * 
 * Enforces:
 * - Row locking (SELECT ... FOR UPDATE) inside atomic transaction
 * - Duplicate approval prevention (cannot approve already-approved tasks)
 * - Safe retry behavior for repeated client requests
 * - Overwrite protection (cannot overwrite a newer review decision)
 * - Comprehensive review audit history in `task_review_history`
 * - Automatic recalculation of verified Quality Score for freelancer
 * - Safe project completion counter updates
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';
if (file_exists($root . '/config/financial.php')) {
    require_once $root . '/config/financial.php';
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$taskId = (int)($data['task_id'] ?? 0);
$decision = trim($data['decision'] ?? '');
$reviewComment = trim($data['review_comment'] ?? '');

$validDecisions = ['Approved', 'Rework Required', 'Rejected'];
if ($taskId <= 0 || !in_array($decision, $validDecisions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id and decision (Approved, Rework Required, Rejected) are required.']);
    exit;
}

// Mandate review comment for Rejection and Rework
if (in_array($decision, ['Rework Required', 'Rejected']) && empty($reviewComment)) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => "A specific review reason or correction instructions must be provided when choosing '{$decision}'."
    ]);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Begin atomic transaction before reading to lock rows
    $db->beginTransaction();

    // Fetch task with row lock to prevent race conditions during concurrent review actions
    $stmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.id as project_id, p.completed_units, p.target_units
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? 
        FOR UPDATE
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // 2. Safe Retry Handling: If client is retrying an identical review decision
    if ($task['status'] === $decision && $task['reviewed_by'] === $adminId) {
        $db->rollBack();
        echo json_encode([
            'success' => true,
            'message' => "Task {$task['task_ref']} already recorded as {$decision} (safe idempotent replay).",
            'task_id' => $taskId,
            'decision' => $decision,
            'idempotent' => true
        ]);
        exit;
    }

    // 3. Duplicate Approval Prevention
    if ($task['status'] === 'Approved') {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => "Conflict: Task {$task['task_ref']} is already Approved and milestone is established. It cannot be re-approved."
        ]);
        exit;
    }

    // 4. Overwrite Protection: Task must be in Submitted or Under Review status
    if (!in_array($task['status'], ['Submitted', 'Under Review'])) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Task is in '{$task['status']}' state, not awaiting QC review. Cannot overwrite newer review state."
        ]);
        exit;
    }

    $freelancerId = (int)$task['assigned_freelancer_id'];

    // 5. Fetch latest submission record
    $subStmt = $db->prepare("
        SELECT id, status, submitted_at 
        FROM task_evidence_submissions 
        WHERE task_id = ? AND status = 'Pending Review' 
        ORDER BY id DESC LIMIT 1
    ");
    $subStmt->execute([$taskId]);
    $submission = $subStmt->fetch();
    $submissionId = $submission ? (int)$submission['id'] : null;

    // 6. Execute State Transition
    $commentToStore = $reviewComment ?: ($decision === 'Approved' ? 'Quality Verified and Approved' : '');

    if ($decision === 'Approved') {
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Approved',
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update latest submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Approved',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Increment project completed units (only if target not exceeded)
        $upProj = $db->prepare("
            UPDATE projects 
            SET completed_units = LEAST(target_units, completed_units + 1) 
            WHERE id = ?
        ");
        $upProj->execute([$task['project_id']]);

        // Phase 7: Financial Subsystem - Double-Entry Earning Recognition & 70/20/10 Split
        $financialResult = null;
        try {
            if (class_exists('FinancialEngine')) {
                $financialResult = FinancialEngine::recognizeTaskEarnings($db, $taskId, $adminName);
            }
        } catch (Exception $fe) {
            error_log("Financial earning recognition error for task {$taskId}: " . $fe->getMessage());
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Approved by Quality Control', ?, 'task_approved')
        ");
        $notif->execute([
            $freelancerId,
            "Congratulations! Your submission for task '{$task['title']}' ({$task['task_ref']}) has passed Quality Control review. Rate: ₹{$task['payout_amount']} established for milestone settlement."
        ]);

    } elseif ($decision === 'Rework Required') {
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Rework Required',
                rework_count = rework_count + 1,
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Rework Required',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Rework Required', ?, 'task_rework')
        ");
        $notif->execute([
            $freelancerId,
            "Quality Control review requested corrections on task '{$task['title']}' ({$task['task_ref']}). Notes: {$commentToStore}. Please resubmit corrected evidence."
        ]);

    } else { // Rejected
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Rejected',
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Rejected',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Evidence Rejected', ?, 'task_rejected')
        ");
        $notif->execute([
            $freelancerId,
            "Your submission for task '{$task['title']}' ({$task['task_ref']}) was rejected by Quality Control. Reason: {$commentToStore}."
        ]);
    }

    // 7. Record into Task Review History (Preserves permanent review history across iterations)
    $histStmt = $db->prepare("
        INSERT INTO task_review_history 
        (task_id, submission_id, freelancer_id, reviewer_id, reviewer_name, decision, review_comment, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $histStmt->execute([
        $taskId,
        $submissionId,
        $freelancerId,
        $adminId,
        $adminName,
        $decision,
        $commentToStore
    ]);

    // 8. Record audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Quality Control Review Completed', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $adminName,
        $task['task_ref'],
        "Decision: {$decision}. Submission #{$submissionId}. Notes: " . $commentToStore,
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    // 9. Recalculate Quality Score for the freelancer post-commit
    $qsResult = null;
    try {
        $qsResult = QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);
    } catch (Exception $e) {
        error_log("QS calculation warning for freelancer {$freelancerId}: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => "Task {$task['task_ref']} marked as {$decision}.",
        'task_id' => $taskId,
        'decision' => $decision,
        'quality_score' => $qsResult ? $qsResult['quality_score'] : null,
        'qs_status' => $qsResult ? $qsResult['qs_status'] : null,
        'financial_entitlement' => $financialResult ?? null
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
