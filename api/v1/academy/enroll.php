<?php
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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer to enroll.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;
if ($courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid or missing course_id']);
    exit;
}

// Validate CSRF
$sessionCsrf = $_SESSION['csrf_token'] ?? '';
$clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Security token invalid or expired. Please refresh the page.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify course exists and is published
    $cStmt = $db->prepare("SELECT id, title, status FROM courses WHERE id = ? LIMIT 1");
    $cStmt->execute([$courseId]);
    $course = $cStmt->fetch();

    if (!$course || $course['status'] !== 'Published') {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course is not currently available for enrollment.']);
        exit;
    }

    // Check if already enrolled
    $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
    $enrStmt->execute([$freelancerId, $courseId]);
    $existing = $enrStmt->fetch();

    if ($existing) {
        echo json_encode([
            'success' => true,
            'message' => 'Already enrolled in course.',
            'enrollment' => [
                'id' => (int)$existing['id'],
                'status' => $existing['status'],
                'progressPercent' => (int)$existing['progress_percent'],
                'enrolledAt' => $existing['enrolled_at']
            ]
        ]);
        exit;
    }

    // Insert new enrollment
    $ins = $db->prepare("INSERT INTO course_enrollments (freelancer_id, course_id, status, progress_percent, enrolled_at) VALUES (?, ?, 'Enrolled', 0, NOW())");
    $ins->execute([$freelancerId, $courseId]);
    $newId = (int)$db->lastInsertId();

    // Log notification
    $notif = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'academy')");
    $notif->execute([
        $freelancerId,
        'Enrolled in Academy Course',
        'You have successfully enrolled in "' . $course['title'] . '". Complete all lessons and pass the final assessment to earn your official certification.'
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Successfully enrolled in course.',
        'enrollment' => [
            'id' => $newId,
            'status' => 'Enrolled',
            'progressPercent' => 0,
            'enrolledAt' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to process course enrollment: ' . $e->getMessage()
    ]);
}
