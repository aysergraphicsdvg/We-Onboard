<?php
/**
 * We Onboard — Task Field Evidence Submission API
 * POST /api/v1/tasks/submit.php
 * 
 * Supports:
 * - Structured form answers (JSON or form parameters)
 * - Photo / document uploads with mime and size validation (max 5MB)
 * - Optional location capture (strictly validated when required)
 * - Private storage in storage/evidence/
 * - Idempotency key conflict prevention and duplicate prevention
 * - Ownership & state transition validation
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

// Parse input (supports JSON body or multipart/form-data)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$formData = [];
$taskId = 0;
$notes = '';
$lat = null;
$lng = null;
$address = '';
$idempotencyKey = '';

if (strpos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];
    $taskId = (int)($data['task_id'] ?? 0);
    $notes = trim($data['freelancer_notes'] ?? $data['notes'] ?? '');
    $formData = $data['form_data'] ?? [];
    $lat = isset($data['latitude']) && $data['latitude'] !== '' ? (float)$data['latitude'] : null;
    $lng = isset($data['longitude']) && $data['longitude'] !== '' ? (float)$data['longitude'] : null;
    $address = trim($data['address'] ?? '');
    $idempotencyKey = trim($data['idempotency_key'] ?? '');
} else {
    // multipart / form-data
    $taskId = (int)($_POST['task_id'] ?? 0);
    $notes = trim($_POST['freelancer_notes'] ?? $_POST['notes'] ?? '');
    $idempotencyKey = trim($_POST['idempotency_key'] ?? '');
    $lat = isset($_POST['latitude']) && $_POST['latitude'] !== '' ? (float)$_POST['latitude'] : null;
    $lng = isset($_POST['longitude']) && $_POST['longitude'] !== '' ? (float)$_POST['longitude'] : null;
    $address = trim($_POST['address'] ?? '');
    if (!empty($_POST['form_data'])) {
        $formData = is_array($_POST['form_data']) ? $_POST['form_data'] : (json_decode($_POST['form_data'], true) ?: []);
    }
}

if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Validate task ownership and state
    $stmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.requires_location as project_requires_location,
               p.evidence_schema_json
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? LIMIT 1
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    if ((int)$task['assigned_freelancer_id'] !== $freelancerId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: You are not assigned to this task.']);
        exit;
    }

    if (!in_array($task['status'], ['Accepted', 'In Progress', 'Rework Required'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Cannot submit evidence for task in '{$task['status']}' state. Only Accepted, In Progress, or Rework Required tasks can be submitted."
        ]);
        exit;
    }

    // 2. Idempotency Check: if this key was already used for this task submission
    if (!empty($idempotencyKey)) {
        $idemStmt = $db->prepare("
            SELECT id, status, submitted_at FROM task_evidence_submissions 
            WHERE task_id = ? AND idempotency_key = ? 
            LIMIT 1
        ");
        $idemStmt->execute([$taskId, $idempotencyKey]);
        $existingSub = $idemStmt->fetch();

        if ($existingSub) {
            echo json_encode([
                'success' => true,
                'message' => 'Task evidence was already successfully submitted (idempotent replay).',
                'submission_id' => $existingSub['id'],
                'status' => 'Submitted',
                'idempotent' => true
            ]);
            exit;
        }
    }

    // 3. Geolocation Validation (when required by project or task)
    $requiresLocation = ((int)($task['requires_location'] ?? 0) === 1 || (int)($task['project_requires_location'] ?? 0) === 1);
    if ($requiresLocation) {
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Location Requirement: Valid GPS coordinates (latitude and longitude) are required for this field project.'
            ]);
            exit;
        }
    }

    // 4. File uploads validation and secure storage
    $uploadDir = $root . '/storage/evidence';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0750, true);
    }
    // Verify .htaccess exists
    if (!file_exists($uploadDir . '/.htaccess')) {
        @file_put_contents($uploadDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
    }

    $allowedMimes = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
        'application/pdf' => '.pdf'
    ];
    $maxFileSize = 5 * 1024 * 1024; // 5 MB

    $savedFiles = [];

    // Check files uploaded via standard $_FILES
    if (!empty($_FILES)) {
        foreach ($_FILES as $fieldName => $fileInfo) {
            // Support single file or multiple files under key
            $filesToProcess = [];
            if (is_array($fileInfo['name'])) {
                for ($i = 0; $i < count($fileInfo['name']); $i++) {
                    if ($fileInfo['error'][$i] === UPLOAD_ERR_OK) {
                        $filesToProcess[] = [
                            'name' => $fileInfo['name'][$i],
                            'type' => $fileInfo['type'][$i],
                            'tmp_name' => $fileInfo['tmp_name'][$i],
                            'size' => $fileInfo['size'][$i],
                            'field' => $fieldName
                        ];
                    }
                }
            } else {
                if ($fileInfo['error'] === UPLOAD_ERR_OK) {
                    $filesToProcess[] = [
                        'name' => $fileInfo['name'],
                        'type' => $fileInfo['type'],
                        'tmp_name' => $fileInfo['tmp_name'],
                        'size' => $fileInfo['size'],
                        'field' => $fieldName
                    ];
                }
            }

            foreach ($filesToProcess as $f) {
                if ($f['size'] > $maxFileSize) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "File '{$f['name']}' exceeds maximum size of 5MB."]);
                    exit;
                }

                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $detectedMime = finfo_file($finfo, $f['tmp_name']);
                finfo_close($finfo);

                if (!isset($allowedMimes[$detectedMime])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Disallowed file type for '{$f['name']}'. Allowed types: JPG, PNG, WEBP, PDF."]);
                    exit;
                }

                $ext = $allowedMimes[$detectedMime];
                $storageFilename = 'ev_' . $taskId . '_' . bin2hex(random_bytes(16)) . $ext;
                $targetPath = $uploadDir . '/' . $storageFilename;

                if (move_uploaded_file($f['tmp_name'], $targetPath)) {
                    $savedFiles[] = [
                        'field_name' => $f['field'],
                        'original_filename' => basename($f['name']),
                        'storage_path' => 'storage/evidence/' . $storageFilename,
                        'file_size' => $f['size'],
                        'mime_type' => $detectedMime
                    ];
                }
            }
        }
    }

    // 5. Atomic database transaction
    $db->beginTransaction();

    // Insert task evidence submission record
    $subStmt = $db->prepare("
        INSERT INTO task_evidence_submissions 
        (task_id, freelancer_id, form_data_json, location_lat, location_lng, location_address, idempotency_key, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Review', NOW())
    ");
    $subStmt->execute([
        $taskId,
        $freelancerId,
        json_encode(array_merge($formData, ['notes' => $notes])),
        $lat,
        $lng,
        $address,
        $idempotencyKey ?: null
    ]);
    $submissionId = (int)$db->lastInsertId();

    // Insert saved files
    $fileStmt = $db->prepare("
        INSERT INTO task_evidence_files 
        (task_id, submission_id, field_name, original_filename, storage_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($savedFiles as $sf) {
        $fileStmt->execute([
            $taskId,
            $submissionId,
            $sf['field_name'],
            $sf['original_filename'],
            $sf['storage_path'],
            $sf['file_size'],
            $sf['mime_type']
        ]);
    }

    // Update task status to Submitted
    $updateTask = $db->prepare("
        UPDATE tasks 
        SET status = 'Submitted', 
            submitted_at = NOW(),
            review_comment = NULL 
        WHERE id = ? AND assigned_freelancer_id = ?
    ");
    $updateTask->execute([$taskId, $freelancerId]);

    // Send notification to freelancer
    $notifStmt = $db->prepare("
        INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
        VALUES (?, 'Evidence Submitted', ?, 'task_submission')
    ");
    $notifStmt->execute([
        $freelancerId,
        "Your evidence for task '{$task['title']}' ({$task['task_ref']}) was submitted and queued for Quality Control review."
    ]);

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Field Evidence Submitted', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['freelancer_name'] ?? 'Freelancer #' . $freelancerId,
        $task['task_ref'],
        "Submitted evidence (Submission #{$submissionId}, " . count($savedFiles) . " attachments)",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Evidence successfully submitted! The task is now under Quality Control review.',
        'submission_id' => $submissionId,
        'task_id' => $taskId,
        'status' => 'Submitted',
        'files_count' => count($savedFiles)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
