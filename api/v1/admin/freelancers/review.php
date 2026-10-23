<?php
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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Administrator authentication required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify Admin Role & Permissions
    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Your role (' . ($admin['role_name'] ?? 'Unknown') . ') is not authorized for freelancer KYC verification.'
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $freelancerId = (int)($_GET['freelancer_id'] ?? 0);
        if ($freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'freelancer_id parameter is required.']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
        $stmt->execute([$freelancerId]);
        $fl = $stmt->fetch();

        if (!$fl) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
            exit;
        }

        // Fetch documents
        $docsStmt = $db->prepare("SELECT d.*, u.name as reviewer_name 
                                  FROM freelancer_documents d 
                                  LEFT JOIN admin_users u ON d.reviewed_by = u.id 
                                  WHERE d.freelancer_id = ? 
                                  ORDER BY d.created_at ASC");
        $docsStmt->execute([$freelancerId]);
        $documents = $docsStmt->fetchAll();

        // Fetch audit logs for this freelancer
        $auditStmt = $db->prepare("SELECT * FROM audit_logs WHERE (record_type = 'Freelancer' AND record_id = ?) OR (record_type = 'Freelancer Document' AND record_id LIKE ?) ORDER BY created_at DESC LIMIT 25");
        $auditStmt->execute([$fl['registration_ref'], 'DOC-%']);
        $audits = $auditStmt->fetchAll();

        echo json_encode([
            'success' => true,
            'freelancer' => $fl,
            'documents' => $documents,
            'auditLogs' => $audits
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Enforce CSRF protection for sensitive review transitions
        verify_csrf();

        $rawInput = file_get_contents('php://input');
        $jsonInput = json_decode($rawInput, true);
        $data = is_array($jsonInput) ? $jsonInput : $_POST;

        $action = $data['action'] ?? '';

        if ($action === 'review_document') {
            $docId = (int)($data['document_id'] ?? 0);
            $decision = trim($data['decision'] ?? '');
            $reason = trim($data['reason'] ?? '');

            $allowedDecisions = ['Approved', 'Rejected', 'Resubmission Required'];
            if (!in_array($decision, $allowedDecisions, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid decision. Allowed: Approved, Rejected, Resubmission Required.']);
                exit;
            }

            if (in_array($decision, ['Rejected', 'Resubmission Required'], true) && empty($reason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A clear review reason is mandatory when rejecting or requesting resubmission of an identity document.']);
                exit;
            }

            $docStmt = $db->prepare("SELECT d.*, f.id as fl_id, f.full_name as fl_name, f.registration_ref FROM freelancer_documents d JOIN freelancers f ON d.freelancer_id = f.id WHERE d.id = ? LIMIT 1");
            $docStmt->execute([$docId]);
            $doc = $docStmt->fetch();

            if (!$doc) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Document not found.']);
                exit;
            }

            $updateStmt = $db->prepare("UPDATE freelancer_documents SET 
                status = ?, 
                rejection_reason = ?, 
                reviewed_by = ?, 
                reviewed_at = NOW(), 
                updated_at = NOW() 
                WHERE id = ?");
            $updateStmt->execute([
                $decision,
                !empty($reason) ? $reason : null,
                $_SESSION['admin_id'],
                $docId
            ]);

            // Add notification to freelancer
            $notifTitle = "KYC Document: {$doc['document_type']} {$decision}";
            $notifMsg = $decision === 'Approved' 
                ? "Your {$doc['document_type']} has been verified and approved by operations."
                : ($decision === 'Resubmission Required' 
                    ? "Resubmission required for {$doc['document_type']}. Reason: {$reason}. Please upload a clear replacement."
                    : "Your {$doc['document_type']} was rejected. Reason: {$reason}.");

            $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'kyc')")
               ->execute([$doc['fl_id'], $notifTitle, $notifMsg]);

            // Recalculate freelancer onboarding status
            $statusCheck = $db->prepare("SELECT status FROM freelancer_documents WHERE freelancer_id = ?");
            $statusCheck->execute([$doc['fl_id']]);
            $docStatuses = $statusCheck->fetchAll(PDO::FETCH_COLUMN);

            $newOnboarding = 'Under Review';
            if (in_array('Resubmission Required', $docStatuses, true) || in_array('Rejected', $docStatuses, true)) {
                $newOnboarding = 'Action Required';
            } elseif (count($docStatuses) > 0 && !in_array('Pending', $docStatuses, true) && !in_array('Rejected', $docStatuses, true) && !in_array('Resubmission Required', $docStatuses, true)) {
                $newOnboarding = 'Approved';
            }

            $db->prepare("UPDATE freelancers SET onboarding_status = ? WHERE id = ?")->execute([$newOnboarding, $doc['fl_id']]);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, 'Freelancer Document', ?, ?, ?)")
               ->execute([
                   $admin['name'],
                   "KYC Document {$decision}",
                   $doc['document_ref'],
                   "Reviewed {$doc['document_type']} for {$doc['fl_name']} ({$doc['registration_ref']}). Decision: {$decision}" . (!empty($reason) ? " Reason: {$reason}" : ""),
                   $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
               ]);

            echo json_encode([
                'success' => true,
                'message' => "Document '{$doc['document_type']}' marked as {$decision}.",
                'decision' => $decision,
                'onboarding_status' => $newOnboarding
            ]);
            exit;
        }

        if ($action === 'update_freelancer_status') {
            $freelancerId = (int)($data['freelancer_id'] ?? 0);
            $status = trim($data['status'] ?? '');
            $onboardingStatus = trim($data['onboarding_status'] ?? '');
            $verificationNotes = trim($data['verification_notes'] ?? '');

            $flStmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
            $flStmt->execute([$freelancerId]);
            $fl = $flStmt->fetch();

            if (!$fl) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
                exit;
            }

            $updateFields = [];
            $params = [];

            if (!empty($status)) {
                $updateFields[] = "status = ?";
                $params[] = $status;
            }
            if (!empty($onboardingStatus)) {
                $updateFields[] = "onboarding_status = ?";
                $params[] = $onboardingStatus;
            }
            if (!empty($verificationNotes)) {
                $updateFields[] = "verification_notes = ?";
                $params[] = $verificationNotes;
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No updates provided.']);
                exit;
            }

            $params[] = $freelancerId;
            $sql = "UPDATE freelancers SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $db->prepare($sql)->execute($params);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Freelancer Status Update', 'Freelancer', ?, ?, ?)")
               ->execute([
                   $admin['name'],
                   $fl['registration_ref'],
                   "Status updated to: {$status}, Onboarding: {$onboardingStatus}. Notes: {$verificationNotes}",
                   $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
               ]);

            echo json_encode([
                'success' => true,
                'message' => "Freelancer {$fl['registration_ref']} updated successfully."
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown review action requested.']);
    }
} catch (Exception $e) {
    error_log("Admin freelancer review error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error processing review action.']);
}
