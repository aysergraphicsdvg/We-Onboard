<?php
/**
 * We Onboard — Admin Tasks Listing API
 * GET /api/v1/admin/tasks/list.php
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $projectId = (int)($_GET['project_id'] ?? 0);
    $statusFilter = trim($_GET['status'] ?? '');
    $freelancerId = (int)($_GET['freelancer_id'] ?? 0);
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if ($projectId > 0) {
        $where[] = "t.project_id = ?";
        $params[] = $projectId;
    }
    if (!empty($statusFilter) && $statusFilter !== 'All') {
        $where[] = "t.status = ?";
        $params[] = $statusFilter;
    }
    if ($freelancerId > 0) {
        $where[] = "t.assigned_freelancer_id = ?";
        $params[] = $freelancerId;
    }
    if (!empty($search)) {
        $where[] = "(t.title LIKE ? OR t.task_ref LIKE ? OR t.target_area LIKE ? OR f.full_name LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, 
               f.full_name as assigned_freelancer_name, f.phone as assigned_freelancer_phone
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.id DESC
        LIMIT 100
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $tasksRaw = $stmt->fetchAll();

    $tasks = [];
    foreach ($tasksRaw as $row) {
        $tasks[] = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => $row['assigned_freelancer_id'] ? (string)$row['assigned_freelancer_id'] : null,
            'assignedFreelancerName' => $row['assigned_freelancer_name'] ?? null,
            'assignedFreelancerPhone' => $row['assigned_freelancer_phone'] ?? null,
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [],
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'acceptedAt' => $row['accepted_at'] ?? null,
            'submittedAt' => $row['submitted_at'] ?? null,
            'reviewedBy' => $row['reviewed_by_name'] ?? null,
            'reviewedAt' => $row['reviewed_at'] ?? null,
            'reviewComment' => $row['review_comment'] ?? null,
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'tasks' => $tasks,
        'total' => count($tasks)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
