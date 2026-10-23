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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to record lesson progress.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$lessonId = !empty($data['lesson_id']) ? (int)$data['lesson_id'] : 0;
$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;

if ($lessonId <= 0 || $courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid lesson_id or course_id.']);
    exit;
}

// CSRF check
$sessionCsrf = $_SESSION['csrf_token'] ?? '';
$clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify lesson exists and belongs to course
    $lStmt = $db->prepare("SELECT id, course_id, title FROM course_lessons WHERE id = ? AND course_id = ? LIMIT 1");
    $lStmt->execute([$lessonId, $courseId]);
    $lesson = $lStmt->fetch();

    if (!$lesson) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Lesson not found in the specified course.']);
        exit;
    }

    // Auto-enroll if not enrolled yet
    $enrCheck = $db->prepare("SELECT id, status FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
    $enrCheck->execute([$freelancerId, $courseId]);
    $enr = $enrCheck->fetch();

    if (!$enr) {
        $insEnr = $db->prepare("INSERT INTO course_enrollments (freelancer_id, course_id, status, progress_percent, last_lesson_id, enrolled_at) VALUES (?, ?, 'In Progress', 0, ?, NOW())");
        $insEnr->execute([$freelancerId, $courseId, $lessonId]);
    }

    // Record completion in lesson_completions (INSERT IGNORE)
    $compStmt = $db->prepare("INSERT IGNORE INTO lesson_completions (freelancer_id, course_id, lesson_id, completed_at) VALUES (?, ?, ?, NOW())");
    $compStmt->execute([$freelancerId, $courseId, $lessonId]);

    // Calculate total lessons in course
    $totalLessonsStmt = $db->prepare("SELECT COUNT(*) FROM course_lessons WHERE course_id = ?");
    $totalLessonsStmt->execute([$courseId]);
    $totalLessons = (int)$totalLessonsStmt->fetchColumn();

    // Calculate completed lessons by freelancer
    $completedStmt = $db->prepare("SELECT COUNT(DISTINCT lesson_id) FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
    $completedStmt->execute([$freelancerId, $courseId]);
    $completedLessons = (int)$completedStmt->fetchColumn();

    $progressPercent = ($totalLessons > 0) ? min(100, (int)round(($completedLessons / $totalLessons) * 100)) : 100;

    // Check if course has assessment
    $assCheck = $db->prepare("SELECT id FROM course_assessments WHERE course_id = ? LIMIT 1");
    $assCheck->execute([$courseId]);
    $hasAssessment = (bool)$assCheck->fetch();

    // Check if freelancer already passed assessment
    $passedCheck = $db->prepare("SELECT id FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ? AND passed = 1 LIMIT 1");
    $passedCheck->execute([$freelancerId, $courseId]);
    $hasPassed = (bool)$passedCheck->fetch();

    $newStatus = 'In Progress';
    if ($progressPercent >= 100) {
        if (!$hasAssessment || $hasPassed) {
            $newStatus = 'Completed';
        }
    }

    // Update enrollment record
    $updEnr = $db->prepare("UPDATE course_enrollments SET progress_percent = ?, last_lesson_id = ?, status = CASE WHEN status = 'Completed' THEN 'Completed' ELSE ? END WHERE freelancer_id = ? AND course_id = ?");
    $updEnr->execute([$progressPercent, $lessonId, $newStatus, $freelancerId, $courseId]);

    // Fetch list of all completed lesson IDs for this course
    $allCompStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
    $allCompStmt->execute([$freelancerId, $courseId]);
    $allCompletedIds = array_map('intval', $allCompStmt->fetchAll(PDO::FETCH_COLUMN));

    echo json_encode([
        'success' => true,
        'message' => 'Lesson marked as completed.',
        'lessonId' => $lessonId,
        'courseId' => $courseId,
        'progressPercent' => $progressPercent,
        'completedLessonsCount' => $completedLessons,
        'totalLessonsCount' => $totalLessons,
        'completedLessonIds' => $allCompletedIds,
        'status' => $newStatus,
        'isReadyForAssessment' => ($progressPercent >= 100 && $hasAssessment)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error updating lesson completion: ' . $e->getMessage()
    ]);
}
