<?php
/**
 * We Onboard — Task Acceptance API
 * POST /api/v1/tasks/accept.php
 * 
 * Enforces:
 * - Freelancer authentication and KYC Approved status
 * - Required training course certification check
 * - Project active status
 * - Maximum concurrent active tasks limit
 * - Atomic assignment transaction preventing race condition over-claiming
 */

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
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$taskId = (int)($data['task_id'] ?? 0);
if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Verify freelancer account & KYC
    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, status, onboarding_status FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
        exit;
    }

    if ($fl['status'] !== 'Active' && $fl['onboarding_status'] !== 'Approved') {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Eligibility Error: Your KYC documents must be reviewed and approved by administrators before claiming field tasks.'
        ]);
        exit;
    }

    // 2. Fetch task and project
    $taskStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.status as project_status, 
               p.required_training_course_id, p.max_tasks_per_freelancer,
               p.end_date, p.completed_units, p.target_units,
               c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE t.id = ? LIMIT 1
    ");
    $taskStmt->execute([$taskId]);
    $task = $taskStmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // Check freelancer fraud/disciplinary flag
    if (!empty($fl['fraud_flag']) && (int)$fl['fraud_flag'] === 1) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Account Disciplinary Restriction: Task claims are currently suspended due to an active policy review. Reason: ' . ($fl['fraud_reason'] ?: 'Policy compliance review.')
        ]);
        exit;
    }

    // Check project status
    if ($task['project_status'] !== 'Active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Task cannot be accepted because the parent project is '{$task['project_status']}', not Active."]);
        exit;
    }

    // Check project expiration
    if (!empty($task['end_date']) && $task['end_date'] < date('Y-m-d')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Project expired on {$task['end_date']}. New task assignments are closed."]);
        exit;
    }

    // Check project overall completion capacity
    if (!empty($task['target_units']) && (int)$task['completed_units'] >= (int)$task['target_units']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project target units quota has been fully reached. No further tasks can be claimed.']);
        exit;
    }

    // Idempotency: If already accepted by THIS freelancer
    if ((int)$task['assigned_freelancer_id'] === $freelancerId && in_array($task['status'], ['Accepted', 'In Progress'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Task is already accepted and in your active workload.',
            'task_id' => $taskId,
            'status' => $task['status']
        ]);
        exit;
    }

    // 3. Verify Required Training Course Certification
    if (!empty($task['required_training_course_id'])) {
        $reqCourseId = (int)$task['required_training_course_id'];
        
        $certStmt = $db->prepare("
            SELECT id FROM freelancer_certificates 
            WHERE freelancer_id = ? AND course_id = ? 
            LIMIT 1
        ");
        $certStmt->execute([$freelancerId, $reqCourseId]);
        $hasCert = $certStmt->fetch();

        if (!$hasCert) {
            // Also check course completion
            $compStmt = $db->prepare("
                SELECT id FROM course_enrollments 
                WHERE freelancer_id = ? AND course_id = ? AND status = 'Completed' 
                LIMIT 1
            ");
            $compStmt->execute([$freelancerId, $reqCourseId]);
            $hasCompleted = $compStmt->fetch();

            if (!$hasCompleted) {
                http_response_code(403);
                $courseName = $task['required_course_title'] ?: 'Mandatory Academy Course';
                echo json_encode([
                    'success' => false,
                    'error' => "Prerequisite Training Required: You must complete and pass the '{$courseName}' academy assessment before accepting tasks for this project."
                ]);
                exit;
            }
        }
    }

    // 4. Verify Active Tasks Capacity
    $maxCapacity = (int)($task['max_tasks_per_freelancer'] ?? 5);
    $activeCountStmt = $db->prepare("
        SELECT COUNT(*) FROM tasks 
        WHERE assigned_freelancer_id = ? 
          AND status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required')
    ");
    $activeCountStmt->execute([$freelancerId]);
    $activeCount = (int)$activeCountStmt->fetchColumn();

    if ($activeCount >= $maxCapacity) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => "Workload Limit Reached: You already have {$activeCount} active tasks (maximum allowed is {$maxCapacity}). Please complete or submit pending tasks before accepting new ones."
        ]);
        exit;
    }

    // 5. Atomic database transaction to claim task
    $db->beginTransaction();

    $claimStmt = $db->prepare("
        UPDATE tasks 
        SET assigned_freelancer_id = ?, 
            status = 'Accepted', 
            accepted_at = NOW() 
        WHERE id = ? 
          AND (assigned_freelancer_id IS NULL OR assigned_freelancer_id = 0 OR assigned_freelancer_id = ?)
          AND status IN ('Available', 'Assigned')
    ");
    $claimStmt->execute([$freelancerId, $taskId, $freelancerId]);

    if ($claimStmt->rowCount() === 0) {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Conflict: This task was just claimed by another freelancer or is no longer available.'
        ]);
        exit;
    }

    // Record notification
    $notifStmt = $db->prepare("
        INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
        VALUES (?, 'Task Accepted', ?, 'task_assignment')
    ");
    $notifStmt->execute([
        $freelancerId,
        "You accepted task '{$task['title']}' ({$task['task_ref']}). Deadline: {$task['deadline']}."
    ]);

    // Record audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Accepted by Freelancer', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $fl['full_name'],
        $task['task_ref'],
        "Claimed task {$task['task_ref']} for project {$task['project_name']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Task successfully accepted! You can now start field execution.',
        'task_id' => $taskId,
        'task_ref' => $task['task_ref'],
        'status' => 'Accepted'
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
