<?php
/**
 * We Onboard — Admin Task Management & Dispatch API
 * POST /api/v1/admin/tasks/manage.php
 * 
 * Supports:
 * - action = 'create': Creates new task with ref TSK-YYYY-XXXX
 * - action = 'assign': Assigns task to a specific freelancer
 * - action = 'cancel': Cancels task
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

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? 'create');

try {
    $db = Database::getConnection();

    // ACTION: ASSIGN TASK TO FREELANCER DIRECTLY
    if ($action === 'assign') {
        $taskId = (int)($data['task_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($taskId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid task_id and freelancer_id are required.']);
            exit;
        }

        // Verify freelancer exists and active
        $flStmt = $db->prepare("SELECT id, full_name, status, onboarding_status FROM freelancers WHERE id = ? LIMIT 1");
        $flStmt->execute([$freelancerId]);
        $fl = $flStmt->fetch();

        if (!$fl) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
            exit;
        }

        $taskStmt = $db->prepare("SELECT * FROM tasks WHERE id = ? LIMIT 1");
        $taskStmt->execute([$taskId]);
        $task = $taskStmt->fetch();

        if (!$task) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Task not found.']);
            exit;
        }

        $up = $db->prepare("UPDATE tasks SET assigned_freelancer_id = ?, status = 'Assigned' WHERE id = ?");
        $up->execute([$freelancerId, $taskId]);

        // Send notification to freelancer
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'New Task Assigned', ?, 'task_assignment')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been assigned task '{$task['title']}' ({$task['task_ref']}). Deadline: {$task['deadline']}."
        ]);

        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Task Assigned to Freelancer', 'Task', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            $task['task_ref'],
            "Assigned to {$fl['full_name']} (ID #{$freelancerId})",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Task successfully assigned to {$fl['full_name']}.",
            'task_id' => $taskId
        ]);
        exit;
    }

    // ACTION: CANCEL TASK
    if ($action === 'cancel') {
        $taskId = (int)($data['task_id'] ?? 0);
        $reason = trim($data['reason'] ?? 'Cancelled by administrator');

        $up = $db->prepare("UPDATE tasks SET status = 'Cancelled', review_comment = ? WHERE id = ?");
        $up->execute([$reason, $taskId]);

        echo json_encode(['success' => true, 'message' => 'Task cancelled.']);
        exit;
    }

    // ACTION: CREATE TASK
    $projectId = (int)($data['project_id'] ?? 0);
    $title = trim($data['title'] ?? '');
    $description = trim($data['description'] ?? '');
    $instructions = trim($data['instructions'] ?? '');
    $freelancerId = !empty($data['freelancer_id']) ? (int)$data['freelancer_id'] : null;
    $city = trim($data['city'] ?? 'Bengaluru');
    $targetArea = trim($data['target_area'] ?? 'General Area');
    $deadline = trim($data['deadline'] ?? date('Y-m-d', strtotime('+7 days')));
    $payoutAmount = (float)($data['payout_amount'] ?? 0);
    $requiresLocation = !empty($data['requires_location']) ? 1 : 0;
    $evidenceReqs = $data['evidence_requirements'] ?? [];
    $evidenceReqsJson = is_array($evidenceReqs) ? json_encode($evidenceReqs) : trim($data['evidence_requirements_json'] ?? '[]');

    if ($projectId <= 0 || empty($title)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID and Task Title are required.']);
        exit;
    }

    $projStmt = $db->prepare("SELECT id, name FROM projects WHERE id = ? LIMIT 1");
    $projStmt->execute([$projectId]);
    $project = $projStmt->fetch();

    if (!$project) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Parent Project not found.']);
        exit;
    }

    $taskRef = 'TSK-' . date('Y') . '-' . str_pad((string)mt_rand(100, 9999), 4, '0', STR_PAD_LEFT);
    $initialStatus = $freelancerId ? 'Assigned' : 'Available';

    $stmt = $db->prepare("
        INSERT INTO tasks (
            task_ref, project_id, title, description, instructions,
            evidence_requirements_json, requires_location, assigned_freelancer_id,
            city, target_area, deadline, payout_amount, status
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    ");
    $stmt->execute([
        $taskRef, $projectId, $title, $description, $instructions,
        $evidenceReqsJson, $requiresLocation, $freelancerId,
        $city, $targetArea, $deadline, $payoutAmount, $initialStatus
    ]);

    $newId = (int)$db->lastInsertId();

    // If assigned immediately, notify freelancer
    if ($freelancerId) {
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'New Task Assigned', ?, 'task_assignment')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been assigned task '{$title}' ({$taskRef}). Deadline: {$deadline}."
        ]);
    }

    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Created', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
        $taskRef,
        "Created task in project {$project['name']}" . ($freelancerId ? " (Assigned to #{$freelancerId})" : " (Available pool)"),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Task {$taskRef} created successfully.",
        'task_id' => $newId,
        'task_ref' => $taskRef
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
