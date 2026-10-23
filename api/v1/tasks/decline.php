<?php
/**
 * We Onboard — Task Decline API
 * POST /api/v1/tasks/decline.php
 * 
 * Allows a freelancer to release an assigned task back to the available pool.
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
$reason = trim($data['reason'] ?? '');

if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ? AND assigned_freelancer_id = ? LIMIT 1");
    $stmt->execute([$taskId, $freelancerId]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found or not assigned to you.']);
        exit;
    }

    if (!in_array($task['status'], ['Assigned', 'Accepted'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Cannot decline a task in '{$task['status']}' state."]);
        exit;
    }

    $update = $db->prepare("
        UPDATE tasks 
        SET assigned_freelancer_id = NULL, 
            status = 'Available', 
            accepted_at = NULL 
        WHERE id = ? AND assigned_freelancer_id = ?
    ");
    $update->execute([$taskId, $freelancerId]);

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Declined by Freelancer', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['freelancer_name'] ?? 'Freelancer #' . $freelancerId,
        $task['task_ref'],
        "Released task back to available pool. Reason: " . ($reason ?: 'None specified'),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Task declined and returned to project pool.',
        'task_id' => $taskId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
