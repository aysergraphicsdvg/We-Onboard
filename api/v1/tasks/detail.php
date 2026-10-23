<?php
/**
 * We Onboard — Task Detail & Evidence API
 * GET /api/v1/tasks/detail.php?id={id}
 * 
 * Enforces ownership check: Freelancers can only view their own tasks or unassigned Available pool tasks.
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

$freelancerId = $_SESSION['freelancer_id'] ?? null;
$adminId = $_SESSION['admin_id'] ?? null;

if (!$freelancerId && !$adminId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in.']);
    exit;
}

$taskId = (int)($_GET['id'] ?? 0);
$taskRef = trim($_GET['ref'] ?? '');

if ($taskId <= 0 && empty($taskRef)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Task identifier (id or ref) is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, 
               p.description as project_description, p.evidence_schema_json,
               p.required_training_course_id, c.title as required_course_title,
               f.full_name as assigned_freelancer_name, f.phone as assigned_freelancer_phone
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        WHERE " . ($taskId > 0 ? "t.id = ?" : "t.task_ref = ?") . "
        LIMIT 1
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([$taskId > 0 ? $taskId : $taskRef]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // Server-side ownership verification:
    // If requester is a freelancer, task must either be assigned to them OR be in 'Available' state
    if ($freelancerId && !$adminId) {
        $assignedTo = (int)($task['assigned_freelancer_id'] ?? 0);
        if ($assignedTo > 0 && $assignedTo !== (int)$freelancerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Forbidden: You do not have permission to access another freelancer\'s task.']);
            exit;
        }
    }

    // Load recent submission if exists
    $subStmt = $db->prepare("
        SELECT * FROM task_evidence_submissions 
        WHERE task_id = ? 
        ORDER BY id DESC LIMIT 1
    ");
    $subStmt->execute([$task['id']]);
    $submission = $subStmt->fetch();

    $files = [];
    if ($submission) {
        $fileStmt = $db->prepare("
            SELECT id, field_name, original_filename, file_size, mime_type, uploaded_at 
            FROM task_evidence_files 
            WHERE task_id = ? AND submission_id = ?
            ORDER BY id ASC
        ");
        $fileStmt->execute([$task['id'], $submission['id']]);
        $filesRaw = $fileStmt->fetchAll();
        foreach ($filesRaw as $f) {
            $files[] = [
                'id' => (string)$f['id'],
                'fieldName' => $f['field_name'],
                'originalFilename' => $f['original_filename'],
                'fileSize' => (int)$f['file_size'],
                'mimeType' => $f['mime_type'],
                'uploadedAt' => $f['uploaded_at'],
                'viewUrl' => "/api/v1/tasks/evidence_file.php?task_id={$task['id']}&file_id={$f['id']}"
            ];
        }
    }

    $evidenceSchema = json_decode($task['evidence_schema_json'] ?? '{}', true) ?: [];
    $evidenceReqs = json_decode($task['evidence_requirements_json'] ?? '[]', true) ?: [];

    $formattedEvidence = null;
    if ($submission) {
        $formData = json_decode($submission['form_data_json'] ?? '{}', true) ?: [];
        $geoTag = null;
        if (!empty($submission['location_lat']) && !empty($submission['location_lng'])) {
            $geoTag = [
                'latitude' => (float)$submission['location_lat'],
                'longitude' => (float)$submission['location_lng'],
                'address' => $submission['location_address'] ?? ''
            ];
        }

        $formattedEvidence = [
            'id' => (string)$submission['id'],
            'submittedAt' => $submission['submitted_at'],
            'freelancerNotes' => $formData['notes'] ?? '',
            'formData' => $formData,
            'geoTag' => $geoTag,
            'files' => $files,
            'status' => $submission['status'],
            'reviewComment' => $submission['review_comment']
        ];
    }

    echo json_encode([
        'success' => true,
        'task' => [
            'id' => (string)$task['id'],
            'taskRef' => $task['task_ref'],
            'projectId' => (string)$task['project_id'],
            'projectName' => $task['project_name'],
            'clientName' => $task['client_name'],
            'serviceCategory' => $task['service_category'],
            'projectDescription' => $task['project_description'],
            'title' => $task['title'],
            'description' => $task['description'],
            'instructions' => $task['instructions'] ?? '',
            'assignedFreelancerId' => $task['assigned_freelancer_id'] ? (string)$task['assigned_freelancer_id'] : null,
            'assignedFreelancerName' => $task['assigned_freelancer_name'] ?? null,
            'city' => $task['city'],
            'targetArea' => $task['target_area'],
            'deadline' => $task['deadline'],
            'payoutAmount' => (float)$task['payout_amount'],
            'status' => $task['status'],
            'evidenceRequirements' => $evidenceReqs,
            'evidenceSchema' => $evidenceSchema,
            'requiresLocation' => (bool)($task['requires_location'] ?? 0),
            'acceptedAt' => $task['accepted_at'] ?? null,
            'submittedAt' => $task['submitted_at'] ?? null,
            'reviewedBy' => $task['reviewed_by_name'] ?? null,
            'reviewedAt' => $task['reviewed_at'] ?? null,
            'reviewComment' => $task['review_comment'] ?? null,
            'reworkCount' => (int)($task['rework_count'] ?? 0),
            'requiredTrainingCourseId' => $task['required_training_course_id'] ?? null,
            'requiredCourseTitle' => $task['required_course_title'] ?? null,
            'evidence' => $formattedEvidence
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
