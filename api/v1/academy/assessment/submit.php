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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to submit assessments.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;
$assessmentId = !empty($data['assessment_id']) ? (int)$data['assessment_id'] : 0;
$answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];

if ($courseId <= 0 || $assessmentId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid course_id or assessment_id']);
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

    // Verify assessment exists and matches course
    $assStmt = $db->prepare("SELECT a.*, c.title as course_title, c.course_code FROM course_assessments a JOIN courses c ON a.course_id = c.id WHERE a.id = ? AND a.course_id = ? LIMIT 1");
    $assStmt->execute([$assessmentId, $courseId]);
    $assessment = $assStmt->fetch();

    if (!$assessment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Assessment not found for this course.']);
        exit;
    }

    $passingScore = (int)$assessment['passing_score'];
    $maxAttempts = (int)$assessment['max_attempts'];

    // Check existing attempts
    $attStmt = $db->prepare("SELECT COUNT(*) as attempt_count, SUM(passed) as any_passed FROM assessment_attempts WHERE freelancer_id = ? AND assessment_id = ?");
    $attStmt->execute([$freelancerId, $assessmentId]);
    $attStats = $attStmt->fetch();

    $attemptCount = (int)($attStats['attempt_count'] ?? 0);
    $hasPassed = (int)($attStats['any_passed'] ?? 0) > 0;

    if ($hasPassed) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'You have already passed this assessment and received your certificate.'
        ]);
        exit;
    }

    if ($attemptCount >= $maxAttempts) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Maximum allowed assessment attempts (' . $maxAttempts . ') have been reached.'
        ]);
        exit;
    }

    $currentAttemptNumber = $attemptCount + 1;

    // Load questions with correct answers from DB
    $qStmt = $db->prepare("SELECT id, correct_answers_json, points, explanation FROM assessment_questions WHERE assessment_id = ? ORDER BY id ASC");
    $qStmt->execute([$assessmentId]);
    $questions = $qStmt->fetchAll();

    if (empty($questions)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No questions found in this assessment.']);
        exit;
    }

    $totalPoints = 0;
    $earnedPoints = 0;
    $questionResults = [];

    foreach ($questions as $q) {
        $qId = (int)$q['id'];
        $pts = (int)$q['points'];
        $totalPoints += $pts;

        $correctArr = json_decode($q['correct_answers_json'], true) ?: [];
        $submittedAns = $answers[$qId] ?? ($answers[(string)$qId] ?? null);

        // Normalize submitted answer to array
        $subArr = [];
        if (is_array($submittedAns)) {
            $subArr = array_map('strval', $submittedAns);
        } elseif ($submittedAns !== null && $submittedAns !== '') {
            $subArr = [(string)$submittedAns];
        }

        sort($correctArr);
        sort($subArr);

        $isCorrect = ($correctArr == $subArr);
        if ($isCorrect) {
            $earnedPoints += $pts;
        }

        $questionResults[] = [
            'questionId' => $qId,
            'isCorrect' => $isCorrect,
            'explanation' => $q['explanation'] ?? ''
        ];
    }

    $scorePercent = ($totalPoints > 0) ? min(100, (int)round(($earnedPoints / $totalPoints) * 100)) : 0;
    $passed = ($scorePercent >= $passingScore);

    // Save attempt in transaction
    $db->beginTransaction();

    $insAtt = $db->prepare("INSERT INTO assessment_attempts (assessment_id, course_id, freelancer_id, attempt_number, answers_json, score_percent, passed, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    $insAtt->execute([
        $assessmentId,
        $courseId,
        $freelancerId,
        $currentAttemptNumber,
        json_encode($answers),
        $scorePercent,
        $passed ? 1 : 0
    ]);

    $certificate = null;

    if ($passed) {
        // Generate verifiable certificate reference
        $refSuffix = strtoupper(bin2hex(random_bytes(4)));
        $certRef = 'WO-CERT-' . date('Y') . '-' . $refSuffix;
        $verifCode = 'V-' . strtoupper(bin2hex(random_bytes(3)));

        // Insert certificate (INSERT IGNORE to prevent duplicate)
        $insCert = $db->prepare("INSERT INTO freelancer_certificates (certificate_ref, freelancer_id, course_id, issue_date, score_percent, verification_code, metadata_json, created_at) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score_percent = GREATEST(score_percent, VALUES(score_percent))");
        
        $meta = [
            'courseTitle' => $assessment['course_title'],
            'courseCode' => $assessment['course_code'],
            'attemptNumber' => $currentAttemptNumber,
            'passingScore' => $passingScore,
            'achievedScore' => $scorePercent
        ];

        $insCert->execute([
            $certRef,
            $freelancerId,
            $courseId,
            $scorePercent,
            $verifCode,
            json_encode($meta)
        ]);

        // Update enrollment to Completed
        $updEnr = $db->prepare("UPDATE course_enrollments SET status = 'Completed', progress_percent = 100, completed_at = NOW() WHERE freelancer_id = ? AND course_id = ?");
        $updEnr->execute([$freelancerId, $courseId]);

        // Send congratulatory notification
        $notif = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'academy')");
        $notif->execute([
            $freelancerId,
            'Certificate Earned: ' . $assessment['course_title'],
            'Congratulations! You scored ' . $scorePercent . '% and earned official certificate ' . $certRef . '. Your operational eligibility has been elevated.'
        ]);

        $certificate = [
            'certificateRef' => $certRef,
            'courseTitle' => $assessment['course_title'],
            'courseCode' => $assessment['course_code'],
            'issueDate' => date('Y-m-d'),
            'scorePercent' => $scorePercent,
            'verificationCode' => $verifCode
        ];
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'passed' => $passed,
        'scorePercent' => $scorePercent,
        'passingScore' => $passingScore,
        'earnedPoints' => $earnedPoints,
        'totalPoints' => $totalPoints,
        'attemptNumber' => $currentAttemptNumber,
        'maxAttempts' => $maxAttempts,
        'attemptsRemaining' => max(0, $maxAttempts - $currentAttemptNumber),
        'questionResults' => $questionResults,
        'certificate' => $certificate
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to process assessment submission: ' . $e->getMessage()
    ]);
}
