<?php
/**
 * We Onboard — Admin Project Management API
 * POST /api/v1/admin/projects/manage.php
 * 
 * Supports:
 * - action = 'create': Creates new project with code PRJ-YYYY-XX
 * - action = 'update': Updates project details
 * - action = 'update_status': Changes status (Draft -> Active -> Paused -> Completed / Cancelled)
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

$allowedRoles = ['Super Admin', 'Administrator', 'Project Manager'];
$adminRole = $_SESSION['admin_role'] ?? 'Administrator';
if (!in_array($adminRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: Your role does not permit project management.']);
    exit;
}

verify_csrf();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? 'create');

try {
    $db = Database::getConnection();

    // ACTION: UPDATE STATUS (Publish, Pause, Close)
    if ($action === 'update_status') {
        $projectId = (int)($data['project_id'] ?? 0);
        $newStatus = trim($data['status'] ?? '');
        $allowedStatuses = ['Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled'];

        if ($projectId <= 0 || !in_array($newStatus, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid project_id and valid status required.']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM projects WHERE id = ? LIMIT 1");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();

        if (!$project) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Project not found.']);
            exit;
        }

        $oldStatus = $project['status'];
        $upStmt = $db->prepare("UPDATE projects SET status = ? WHERE id = ?");
        $upStmt->execute([$newStatus, $projectId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Project Status Changed', 'Project', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            $project['project_ref'],
            "Status transitioned from '{$oldStatus}' to '{$newStatus}'",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Project {$project['project_ref']} status successfully changed to {$newStatus}.",
            'project_id' => $projectId,
            'status' => $newStatus
        ]);
        exit;
    }

    // ACTION: CREATE OR UPDATE PROJECT
    $name = trim($data['name'] ?? '');
    $clientName = trim($data['client_name'] ?? '');
    $serviceCategory = trim($data['service_category'] ?? 'Field Operations');
    $description = trim($data['description'] ?? '');
    $targetCity = trim($data['target_city'] ?? 'Bengaluru');
    $targetAreas = trim($data['target_areas'] ?? '');
    $targetUnits = max(1, (int)($data['target_units'] ?? 100));
    $startDate = trim($data['start_date'] ?? date('Y-m-d'));
    $endDate = trim($data['end_date'] ?? date('Y-m-d', strtotime('+30 days')));
    $paymentModel = trim($data['payment_model'] ?? 'Per Activation');
    $payoutRate = (float)($data['payout_rate'] ?? 0);
    $budget = (float)($data['budget'] ?? 0);
    $status = trim($data['status'] ?? 'Active');
    $requiredTrainingId = !empty($data['required_training_course_id']) ? (int)$data['required_training_course_id'] : null;
    $requiredKyc = trim($data['required_kyc_level'] ?? 'Approved');
    $requiresLocation = !empty($data['requires_location']) ? 1 : 0;
    $maxTasks = max(1, (int)($data['max_tasks_per_freelancer'] ?? 5));
    $evidenceSchemaJson = is_array($data['evidence_schema'] ?? null) ? json_encode($data['evidence_schema']) : (trim($data['evidence_schema_json'] ?? '') ?: null);

    if (empty($name) || empty($clientName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project Name and Client Name are required fields.']);
        exit;
    }

    if ($action === 'update') {
        $projectId = (int)($data['project_id'] ?? 0);
        if ($projectId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid project_id required for update.']);
            exit;
        }

        $stmt = $db->prepare("
            UPDATE projects SET 
                name = ?, client_name = ?, service_category = ?, description = ?, 
                target_city = ?, target_areas = ?, target_units = ?, start_date = ?, 
                end_date = ?, payment_model = ?, payout_rate = ?, budget = ?, status = ?,
                required_training_course_id = ?, required_kyc_level = ?, requires_location = ?,
                max_tasks_per_freelancer = ?, evidence_schema_json = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $name, $clientName, $serviceCategory, $description,
            $targetCity, $targetAreas, $targetUnits, $startDate,
            $endDate, $paymentModel, $payoutRate, $budget, $status,
            $requiredTrainingId, $requiredKyc, $requiresLocation,
            $maxTasks, $evidenceSchemaJson,
            $projectId
        ]);

        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Project Updated', 'Project', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            (string)$projectId,
            "Updated project '{$name}' for client '{$clientName}'",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Project updated successfully.',
            'project_id' => $projectId
        ]);
        exit;
    }

    // CREATE NEW PROJECT
    $projectRef = 'PRJ-' . date('Y') . '-' . str_pad((string)mt_rand(1, 999), 3, '0', STR_PAD_LEFT);

    $stmt = $db->prepare("
        INSERT INTO projects (
            project_ref, name, client_name, service_category, description,
            target_city, target_areas, target_units, completed_units,
            start_date, end_date, payment_model, payout_rate, budget, status,
            required_training_course_id, required_kyc_level, requires_location,
            max_tasks_per_freelancer, evidence_schema_json
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, 0,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?
        )
    ");
    $stmt->execute([
        $projectRef, $name, $clientName, $serviceCategory, $description,
        $targetCity, $targetAreas, $targetUnits,
        $startDate, $endDate, $paymentModel, $payoutRate, $budget, $status,
        $requiredTrainingId, $requiredKyc, $requiresLocation,
        $maxTasks, $evidenceSchemaJson
    ]);

    $newId = (int)$db->lastInsertId();

    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Project Created', 'Project', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
        $projectRef,
        "Created new project '{$name}' for client '{$clientName}'",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Project {$projectRef} created successfully.",
        'project_id' => $newId,
        'project_ref' => $projectRef
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
