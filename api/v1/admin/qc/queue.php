<?php
/**
 * We Onboard — Quality Control Queue API
 * GET /api/v1/admin/qc/queue.php
 * 
 * Returns all field submissions currently awaiting quality review.
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
    $where = ["t.status IN ('Submitted', 'Under Review')"];
    $params = [];

    if ($projectId > 0) {
        $where[] = "t.project_id = ?";
        $params[] = $projectId;
    }

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, p.service_category,
               p.requires_location as project_requires_location,
               f.full_name as freelancer_name, f.phone as freelancer_phone, f.city as freelancer_city,
               f.registration_ref as freelancer_ref,
               sub.id as submission_id, sub.form_data_json, sub.location_lat, sub.location_lng,
               sub.location_address, sub.submitted_at as evidence_submitted_at
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        LEFT JOIN task_evidence_submissions sub ON (sub.task_id = t.id AND sub.status = 'Pending Review')
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.submitted_at ASC, t.id ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $queueRaw = $stmt->fetchAll();

    $queue = [];
    foreach ($queueRaw as $row) {
        $files = [];
        if (!empty($row['submission_id'])) {
            $fStmt = $db->prepare("
                SELECT id, field_name, original_filename, file_size, mime_type, uploaded_at 
                FROM task_evidence_files 
                WHERE submission_id = ?
            ");
            $fStmt->execute([$row['submission_id']]);
            $filesRaw = $fStmt->fetchAll();
            foreach ($filesRaw as $f) {
                $files[] = [
                    'id' => (string)$f['id'],
                    'fieldName' => $f['field_name'],
                    'originalFilename' => $f['original_filename'],
                    'fileSize' => (int)$f['file_size'],
                    'mimeType' => $f['mime_type'],
                    'uploadedAt' => $f['uploaded_at'],
                    'viewUrl' => "/api/v1/tasks/evidence_file.php?task_id={$row['id']}&file_id={$f['id']}"
                ];
            }
        }

        $formData = json_decode($row['form_data_json'] ?? '{}', true) ?: [];
        $geoTag = null;
        if (!empty($row['location_lat']) && !empty($row['location_lng'])) {
            $geoTag = [
                'latitude' => (float)$row['location_lat'],
                'longitude' => (float)$row['location_lng'],
                'address' => $row['location_address'] ?? ''
            ];
        }

        $queue[] = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'serviceCategory' => $row['service_category'],
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => (string)$row['assigned_freelancer_id'],
            'freelancerName' => $row['freelancer_name'] ?? 'Unknown',
            'freelancerPhone' => $row['freelancer_phone'] ?? '',
            'freelancerCity' => $row['freelancer_city'] ?? '',
            'freelancerRef' => $row['freelancer_ref'] ?? '',
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [],
            'requiresLocation' => (bool)($row['requires_location'] ?? $row['project_requires_location'] ?? 0),
            'submittedAt' => $row['evidence_submitted_at'] ?? $row['submitted_at'],
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'submission' => [
                'id' => $row['submission_id'] ? (string)$row['submission_id'] : null,
                'formData' => $formData,
                'geoTag' => $geoTag,
                'files' => $files
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'queue' => $queue,
        'count' => count($queue)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
