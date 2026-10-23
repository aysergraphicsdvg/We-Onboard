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

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to take assessments.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;

if ($courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid course_id']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify course & assessment
    $cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
    $cStmt->execute([$courseId]);
    $course = $cStmt->fetch();

    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course not found']);
        exit;
    }

    $assStmt = $db->prepare("SELECT * FROM course_assessments WHERE course_id = ? LIMIT 1");
    $assStmt->execute([$courseId]);
    $assessment = $assStmt->fetch();

    if (!$assessment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No assessment is configured for this course.']);
        exit;
    }

    $assessmentId = (int)$assessment['id'];

    // Check existing attempts
    $attStmt = $db->prepare("SELECT COUNT(*) as attempt_count, MAX(score_percent) as highest_score, SUM(passed) as any_passed FROM assessment_attempts WHERE freelancer_id = ? AND assessment_id = ?");
    $attStmt->execute([$freelancerId, $assessmentId]);
    $attStats = $attStmt->fetch();

    $attemptCount = (int)($attStats['attempt_count'] ?? 0);
    $highestScore = (int)($attStats['highest_score'] ?? 0);
    $hasPassed = (int)($attStats['any_passed'] ?? 0) > 0;
    $maxAttempts = (int)$assessment['max_attempts'];

    if ($hasPassed) {
        // Already certified
        $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $certStmt->execute([$freelancerId, $courseId]);
        $cert = $certStmt->fetch();

        echo json_encode([
            'success' => true,
            'status' => 'ALREADY_PASSED',
            'message' => 'You have already passed this assessment and earned your certificate.',
            'certificate' => $cert ? [
                'certificateRef' => $cert['certificate_ref'],
                'issueDate' => $cert['issue_date'],
                'scorePercent' => (int)$cert['score_percent'],
                'verificationCode' => $cert['verification_code']
            ] : null,
            'assessment' => [
                'id' => $assessmentId,
                'courseId' => $courseId,
                'title' => $assessment['title'],
                'passingScore' => (int)$assessment['passing_score'],
                'attemptsUsed' => $attemptCount,
                'maxAttempts' => $maxAttempts
            ]
        ]);
        exit;
    }

    if ($attemptCount >= $maxAttempts) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'status' => 'ATTEMPTS_EXHAUSTED',
            'error' => 'You have reached the maximum allowed attempts (' . $maxAttempts . ') for this assessment. Please contact your coordinator to request an attempt reset.',
            'attemptsUsed' => $attemptCount,
            'maxAttempts' => $maxAttempts,
            'highestScore' => $highestScore
        ]);
        exit;
    }

    // Fetch questions: STRIP correct_answers_json and explanation!
    $qStmt = $db->prepare("SELECT id, question_text, question_type, options_json, points, sort_order FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order ASC, id ASC");
    $qStmt->execute([$assessmentId]);
    $rawQuestions = $qStmt->fetchAll();

    $questions = [];
    foreach ($rawQuestions as $rq) {
        $options = json_decode($rq['options_json'], true) ?: [];
        $questions[] = [
            'id' => (int)$rq['id'],
            'questionText' => $rq['question_text'],
            'questionType' => $rq['question_type'],
            'options' => $options,
            'points' => (int)$rq['points'],
            'sortOrder' => (int)$rq['sort_order']
        ];
    }

    echo json_encode([
        'success' => true,
        'status' => 'READY',
        'assessment' => [
            'id' => $assessmentId,
            'courseId' => $courseId,
            'courseTitle' => $course['title'],
            'title' => $assessment['title'],
            'description' => $assessment['description'],
            'passingScore' => (int)$assessment['passing_score'],
            'timeLimitMinutes' => (int)$assessment['time_limit_minutes'],
            'maxAttempts' => $maxAttempts,
            'attemptNumber' => $attemptCount + 1,
            'questionsCount' => count($questions),
            'questions' => $questions
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading assessment: ' . $e->getMessage()
    ]);
}
