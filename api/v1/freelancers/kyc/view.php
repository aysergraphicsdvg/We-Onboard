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
    die("System configuration not found.");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

$docId = $_GET['id'] ?? ($_GET['doc_ref'] ?? '');

if (empty($docId)) {
    http_response_code(400);
    die("Document identifier is required.");
}

try {
    $db = Database::getConnection();

    // Fetch document record
    $stmt = $db->prepare("SELECT d.*, f.full_name as freelancer_name, f.email as freelancer_email 
                          FROM freelancer_documents d 
                          JOIN freelancers f ON d.freelancer_id = f.id 
                          WHERE d.id = ? OR d.document_ref = ? LIMIT 1");
    $stmt->execute([$docId, $docId]);
    $doc = $stmt->fetch();

    if (!$doc) {
        http_response_code(404);
        die("Document not found.");
    }

    // Authorization Verification:
    // 1. Is the requester the owning freelancer?
    $isOwner = (!empty($_SESSION['freelancer_id']) && (int)$_SESSION['freelancer_id'] === (int)$doc['freelancer_id']);

    // 2. Is the requester an authorized administrator?
    $isAdmin = false;
    if (!empty($_SESSION['admin_id'])) {
        $admStmt = $db->prepare("SELECT u.id, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
        $admStmt->execute([$_SESSION['admin_id']]);
        $admin = $admStmt->fetch();
        if ($admin && in_array($admin['role_name'], ['Super Admin', 'Administrator', 'Freelancer Coordinator'], true)) {
            $isAdmin = true;
        }
    }

    if (!$isOwner && !$isAdmin) {
        http_response_code(403);
        die("Access denied: You are not authorized to view this confidential identity document.");
    }

    $filePath = STORAGE_PATH . '/kyc/' . basename($doc['stored_filename']);

    if (!file_exists($filePath)) {
        http_response_code(404);
        die("Document file was not found on private storage.");
    }

    // Set secure delivery headers
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Disposition: inline; filename="' . addslashes($doc['original_filename']) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    readfile($filePath);
    exit;
} catch (Exception $e) {
    error_log("KYC document view error: " . $e->getMessage());
    http_response_code(500);
    die("Server error accessing document.");
}
