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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in to upload KYC documents.']);
    exit;
}

// Enforce CSRF validation on file upload
verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];
$documentType = trim($_POST['document_type'] ?? '');

$allowedTypes = [
    'Aadhaar / National ID',
    'PAN / Tax ID',
    'Driving License / Address Proof',
    'Bank Details / Cancelled Cheque',
    'Educational Certificate',
    'Other'
];

if (!in_array($documentType, $allowedTypes, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid document type. Allowed types: ' . implode(', ', $allowedTypes)
    ]);
    exit;
}

if (empty($_FILES['document']) || !is_uploaded_file($_FILES['document']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file was uploaded or file transfer failed.']);
    exit;
}

$file = $_FILES['document'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive specified in the form.',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder on server.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.'
    ];
    echo json_encode(['success' => false, 'error' => $uploadErrors[$file['error']] ?? 'File upload error.']);
    exit;
}

// Maximum file size: 5 MB
$maxBytes = 5 * 1024 * 1024;
if ($file['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds maximum allowed limit of 5 MB.']);
    exit;
}

// File extension check
$originalName = basename($file['name']);
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

if (!in_array($ext, $allowedExtensions, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid file extension. Only PDF, JPG, JPEG, PNG, and WEBP files are accepted.'
    ]);
    exit;
}

// Authoritative MIME type detection using finfo
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];

if (!in_array($mimeType, $allowedMimes, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid file content type (' . htmlspecialchars($mimeType, ENT_QUOTES, 'UTF-8') . '). File must be a valid PDF or image.'
    ]);
    exit;
}

// Ensure secure storage directory exists
$storageDir = STORAGE_PATH . '/kyc';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0750, true);
    // Write protection rules
    @file_put_contents($storageDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
    @file_put_contents($storageDir . '/index.html', "<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1></body></html>");
}

// Generate obfuscated, non-predictable filename to prevent direct enumeration
$docRef = 'DOC-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
$storedFilename = 'kyc_' . $freelancerId . '_' . bin2hex(random_bytes(12)) . '.' . $ext;
$targetPath = $storageDir . '/' . $storedFilename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to store document in secure private storage.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Check if an existing document of this type exists for this freelancer
    $checkStmt = $db->prepare("SELECT id, stored_filename FROM freelancer_documents WHERE freelancer_id = ? AND document_type = ? LIMIT 1");
    $checkStmt->execute([$freelancerId, $documentType]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        // Remove previous physical file if it exists
        $oldFile = $storageDir . '/' . $existing['stored_filename'];
        if (file_exists($oldFile)) {
            @unlink($oldFile);
        }

        // Update existing record
        $stmt = $db->prepare("UPDATE freelancer_documents SET 
            document_ref = ?,
            original_filename = ?,
            stored_filename = ?,
            file_path = ?,
            file_size = ?,
            mime_type = ?,
            status = 'Pending',
            rejection_reason = NULL,
            reviewed_by = NULL,
            reviewed_at = NULL,
            updated_at = NOW()
            WHERE id = ?");
        $stmt->execute([
            $docRef,
            $originalName,
            $storedFilename,
            'storage/kyc/' . $storedFilename,
            $file['size'],
            $mimeType,
            $existing['id']
        ]);
        $docId = $existing['id'];
    } else {
        // Insert new record
        $stmt = $db->prepare("INSERT INTO freelancer_documents 
            (document_ref, freelancer_id, document_type, original_filename, stored_filename, file_path, file_size, mime_type, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([
            $docRef,
            $freelancerId,
            $documentType,
            $originalName,
            $storedFilename,
            'storage/kyc/' . $storedFilename,
            $file['size'],
            $mimeType
        ]);
        $docId = (int)$db->lastInsertId();
    }

    // Update freelancer onboarding status to 'Under Review'
    $db->prepare("UPDATE freelancers SET onboarding_status = 'Under Review' WHERE id = ? AND onboarding_status IN ('KYC Pending', 'Action Required')")->execute([$freelancerId]);

    // Add notification
    $notifMsg = "Your {$documentType} ({$originalName}) has been securely submitted and is queued for verification by operations.";
    $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, 'KYC Document Submitted', ?, 'kyc')")
       ->execute([$freelancerId, $notifMsg]);

    // Audit log
    $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'KYC Upload', 'Freelancer Document', ?, ?, ?)")
       ->execute([
           $_SESSION['freelancer_name'] ?? 'Freelancer',
           $docRef,
           "Uploaded {$documentType} ({$originalName}, " . round($file['size'] / 1024, 1) . " KB)",
           $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
       ]);

    echo json_encode([
        'success' => true,
        'message' => "Document '{$originalName}' uploaded successfully. Status: Pending Verification.",
        'document' => [
            'id' => (string)$docId,
            'document_ref' => $docRef,
            'document_type' => $documentType,
            'original_filename' => $originalName,
            'file_size' => $file['size'],
            'status' => 'Pending',
            'submitted_at' => date('Y-m-d H:i:s')
        ]
    ]);
} catch (Exception $e) {
    error_log("KYC upload database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error while saving document metadata.']);
}
