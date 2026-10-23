<?php
/**
 * We Onboard — Private Task Evidence File Streamer
 * GET /api/v1/tasks/evidence_file.php?task_id={id}&file_id={id}
 * 
 * Enforces server-side authorization:
 * - Only the freelancer assigned to the task OR an active administrator can access evidence files.
 * - Files stored safely in storage/evidence/ without public URL exposure.
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
    die("Configuration error");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

$freelancerId = $_SESSION['freelancer_id'] ?? null;
$adminId = $_SESSION['admin_id'] ?? null;

if (!$freelancerId && !$adminId) {
    http_response_code(401);
    die("Unauthorized");
}

$taskId = (int)($_GET['task_id'] ?? 0);
$fileId = (int)($_GET['file_id'] ?? 0);

if ($taskId <= 0 || $fileId <= 0) {
    http_response_code(400);
    die("Invalid request");
}

try {
    $db = Database::getConnection();

    // 1. Fetch file record
    $stmt = $db->prepare("
        SELECT f.*, t.assigned_freelancer_id 
        FROM task_evidence_files f
        JOIN tasks t ON f.task_id = t.id
        WHERE f.id = ? AND f.task_id = ?
        LIMIT 1
    ");
    $stmt->execute([$fileId, $taskId]);
    $fileRecord = $stmt->fetch();

    if (!$fileRecord) {
        http_response_code(404);
        die("File not found");
    }

    // 2. Authorization check
    if ($freelancerId && !$adminId) {
        if ((int)$fileRecord['assigned_freelancer_id'] !== (int)$freelancerId) {
            http_response_code(403);
            die("Access Denied: You do not have permission to view evidence for this task.");
        }
    }

    $allowedDir = realpath($root . '/storage/evidence');
    $realTarget = realpath($root . '/' . $fileRecord['storage_path']);
    if (!$realTarget || !$allowedDir || strpos($realTarget, $allowedDir) !== 0 || !file_exists($realTarget)) {
        http_response_code(404);
        die("Physical file missing or disallowed path");
    }
    $filePath = $realTarget;

    // 3. Stream file safely
    $mime = $fileRecord['mime_type'] ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: inline; filename="' . basename($fileRecord['original_filename']) . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, max-age=3600');

    readfile($filePath);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    die("Server error");
}
