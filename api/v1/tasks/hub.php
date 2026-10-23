<?php
/**
 * We Onboard — Freelancer Task Hub API
 * GET /api/v1/tasks/hub.php
 * 
 * Returns tasks segmented into:
 * - assigned: Active tasks currently assigned to/accepted by freelancer
 * - submitted: Tasks submitted by freelancer awaiting QC review
 * - completed: Tasks approved and verified
 * - available: Public/project task pool with per-task eligibility calculation
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

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

try {
    $db = Database::getConnection();

    // 1. Get freelancer profile, KYC status, and completed certifications
    $flStmt = $db->prepare("SELECT id, status, onboarding_status, city, preferred_areas FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
        exit;
    }

    $isKycApproved = ($fl['status'] === 'Active' || $fl['onboarding_status'] === 'Approved');

    // Get all certified courses for this freelancer
    $certStmt = $db->prepare("SELECT DISTINCT course_id FROM freelancer_certificates WHERE freelancer_id = ?");
    $certStmt->execute([$freelancerId]);
    $certifiedCourseIds = $certStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    // Also check completed enrollments as fallback
    $enrollStmt = $db->prepare("SELECT DISTINCT course_id FROM course_enrollments WHERE freelancer_id = ? AND status = 'Completed'");
    $enrollStmt->execute([$freelancerId]);
    $completedCourseIds = $enrollStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $allQualifiedCourseIds = array_unique(array_merge($certifiedCourseIds, $completedCourseIds));

    // 2. Fetch Assigned / Active tasks
    $assignedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, p.required_training_course_id, c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required')
        ORDER BY t.deadline ASC, t.id DESC
    ");
    $assignedStmt->execute([$freelancerId]);
    $assignedRaw = $assignedStmt->fetchAll();

    // 3. Fetch Submitted tasks (Under Review)
    $submittedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status IN ('Submitted', 'Under Review')
        ORDER BY t.submitted_at DESC, t.id DESC
    ");
    $submittedStmt->execute([$freelancerId]);
    $submittedRaw = $submittedStmt->fetchAll();

    // 4. Fetch Completed tasks (Approved)
    $completedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status = 'Approved'
        ORDER BY t.reviewed_at DESC, t.id DESC
        LIMIT 50
    ");
    $completedStmt->execute([$freelancerId]);
    $completedRaw = $completedStmt->fetchAll();

    // 5. Fetch Available tasks pool from Active projects
    $availableStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, 
               p.required_training_course_id, p.required_kyc_level, p.max_tasks_per_freelancer,
               c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE (t.assigned_freelancer_id IS NULL OR t.assigned_freelancer_id = 0)
          AND t.status = 'Available'
          AND p.status = 'Active'
        ORDER BY t.id DESC
        LIMIT 50
    ");
    $availableStmt->execute();
    $availableRaw = $availableStmt->fetchAll();

    $currentActiveCount = count($assignedRaw);

    // Format helper function
    $formatTask = function($row, $isAvailableCheck = false) use ($isKycApproved, $allQualifiedCourseIds, $currentActiveCount) {
        $evReqs = json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [];
        
        $item = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'serviceCategory' => $row['service_category'] ?? 'Field Operations',
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => $row['assigned_freelancer_id'] ? (string)$row['assigned_freelancer_id'] : undefined,
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => $evReqs,
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'acceptedAt' => $row['accepted_at'] ?? null,
            'submittedAt' => $row['submitted_at'] ?? null,
            'reviewedBy' => $row['reviewed_by_name'] ?? null,
            'reviewedAt' => $row['reviewed_at'] ?? null,
            'reviewComment' => $row['review_comment'] ?? null,
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'requiredTrainingCourseId' => $row['required_training_course_id'] ?? null,
            'requiredCourseTitle' => $row['required_course_title'] ?? null
        ];

        if ($isAvailableCheck) {
            $isEligible = true;
            $reason = '';

            // Check KYC requirement
            if (!$isKycApproved) {
                $isEligible = false;
                $reason = 'Identity KYC verification must be approved before accepting tasks.';
            }
            // Check Required Course Certification
            elseif (!empty($row['required_training_course_id'])) {
                $reqId = (int)$row['required_training_course_id'];
                if (!in_array($reqId, $allQualifiedCourseIds)) {
                    $isEligible = false;
                    $courseTitle = $row['required_course_title'] ?: 'Required Academy Course';
                    $reason = "Completion and certification of course '{$courseTitle}' required.";
                }
            }
            // Check Max Active Tasks Capacity
            if ($isEligible) {
                $maxAllowed = (int)($row['max_tasks_per_freelancer'] ?? 5);
                if ($currentActiveCount >= $maxAllowed) {
                    $isEligible = false;
                    $reason = "Maximum concurrent active tasks limit ({$maxAllowed}) reached.";
                }
            }

            $item['isEligible'] = $isEligible;
            $item['ineligibilityReason'] = $reason;
        }

        return $item;
    };

    $assigned = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $assignedRaw);
    $submitted = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $submittedRaw);
    $completed = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $completedRaw);
    $available = array_map(function($r) use ($formatTask) { return $formatTask($r, true); }, $availableRaw);

    echo json_encode([
        'success' => true,
        'counts' => [
            'assigned' => count($assigned),
            'submitted' => count($submitted),
            'completed' => count($completed),
            'available' => count($available)
        ],
        'isKycApproved' => $isKycApproved,
        'assigned' => $assigned,
        'submitted' => $submitted,
        'completed' => $completed,
        'available' => $available
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
