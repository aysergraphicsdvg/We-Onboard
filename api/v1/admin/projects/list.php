<?php
/**
 * We Onboard — Admin Projects Listing API
 * GET /api/v1/admin/projects/list.php
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

    $statusFilter = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($statusFilter) && $statusFilter !== 'All') {
        $where[] = "p.status = ?";
        $params[] = $statusFilter;
    }
    if (!empty($search)) {
        $where[] = "(p.name LIKE ? OR p.project_ref LIKE ? OR p.client_name LIKE ? OR p.target_city LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $sql = "
        SELECT p.*, c.title as required_course_title,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as tasks_count,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'Approved') as approved_tasks_count,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status IN ('Submitted', 'Under Review')) as pending_qc_count
        FROM projects p
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY p.id DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $projectsRaw = $stmt->fetchAll();

    $projects = [];
    foreach ($projectsRaw as $row) {
        $targetAreas = array_map('trim', explode(',', $row['target_areas'] ?? ''));
        $evidenceSchema = json_decode($row['evidence_schema_json'] ?? '{}', true) ?: [];

        $projects[] = [
            'id' => (string)$row['id'],
            'projectRef' => $row['project_ref'],
            'name' => $row['name'],
            'clientName' => $row['client_name'],
            'clientId' => $row['client_id'] ? (string)$row['client_id'] : null,
            'serviceCategory' => $row['service_category'],
            'description' => $row['description'],
            'targetCity' => $row['target_city'],
            'targetAreas' => $targetAreas,
            'targetUnits' => (int)$row['target_units'],
            'completedUnits' => (int)$row['completed_units'],
            'maxTasksPerFreelancer' => (int)($row['max_tasks_per_freelancer'] ?? 5),
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'paymentModel' => $row['payment_model'],
            'payoutRate' => (float)$row['payout_rate'],
            'budget' => (float)($row['budget'] ?? 0),
            'status' => $row['status'],
            'requiredTrainingCourseId' => $row['required_training_course_id'] ? (int)$row['required_training_course_id'] : null,
            'requiredCourseTitle' => $row['required_course_title'] ?? null,
            'requiredKycLevel' => $row['required_kyc_level'] ?? 'Approved',
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'evidenceSchema' => $evidenceSchema,
            'tasksCount' => (int)$row['tasks_count'],
            'approvedTasksCount' => (int)$row['approved_tasks_count'],
            'pendingQcCount' => (int)$row['pending_qc_count'],
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'total' => count($projects)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
