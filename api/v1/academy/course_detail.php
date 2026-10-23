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

try {
    $db = Database::getConnection();

    $courseId = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
    $slug = trim($_GET['slug'] ?? '');
    $freelancerId = $_SESSION['freelancer_id'] ?? null;

    if ($courseId > 0) {
        $cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
        $cStmt->execute([$courseId]);
    } elseif (!empty($slug)) {
        $cStmt = $db->prepare("SELECT * FROM courses WHERE slug = ? LIMIT 1");
        $cStmt->execute([$slug]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing course id or slug']);
        exit;
    }

    $course = $cStmt->fetch();
    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course not found']);
        exit;
    }

    $cId = (int)$course['id'];

    // Modules and Lessons
    $mStmt = $db->prepare("SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC");
    $mStmt->execute([$cId]);
    $rawModules = $mStmt->fetchAll();

    // Completed lessons set if freelancer logged in
    $completedLessonIds = [];
    $enrollment = null;
    $certificate = null;
    $attemptCount = 0;
    $highestScore = 0;

    if ($freelancerId) {
        $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $enrStmt->execute([$freelancerId, $cId]);
        $enrRow = $enrStmt->fetch();
        if ($enrRow) {
            $clStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
            $clStmt->execute([$freelancerId, $cId]);
            $completedLessonIds = array_map('intval', $clStmt->fetchAll(PDO::FETCH_COLUMN));

            $enrollment = [
                'id' => (int)$enrRow['id'],
                'status' => $enrRow['status'],
                'progressPercent' => (int)$enrRow['progress_percent'],
                'lastLessonId' => $enrRow['last_lesson_id'] ? (int)$enrRow['last_lesson_id'] : null,
                'enrolledAt' => $enrRow['enrolled_at'],
                'completedAt' => $enrRow['completed_at'],
                'completedLessons' => $completedLessonIds
            ];
        }

        $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $certStmt->execute([$freelancerId, $cId]);
        $certRow = $certStmt->fetch();
        if ($certRow) {
            $certificate = [
                'id' => (int)$certRow['id'],
                'certificateRef' => $certRow['certificate_ref'],
                'issueDate' => $certRow['issue_date'],
                'scorePercent' => (int)$certRow['score_percent'],
                'verificationCode' => $certRow['verification_code'],
                'createdAt' => $certRow['created_at']
            ];
        }

        // Count assessment attempts
        $attStmt = $db->prepare("SELECT COUNT(*) as cnt, MAX(score_percent) as highest FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ?");
        $attStmt->execute([$freelancerId, $cId]);
        $attRow = $attStmt->fetch();
        if ($attRow) {
            $attemptCount = (int)$attRow['cnt'];
            $highestScore = (int)($attRow['highest'] ?? 0);
        }
    }

    $modules = [];
    $allLessonsFlat = [];

    foreach ($rawModules as $rm) {
        $mId = (int)$rm['id'];
        $lStmt = $db->prepare("SELECT * FROM course_lessons WHERE module_id = ? ORDER BY sort_order ASC, id ASC");
        $lStmt->execute([$mId]);
        $rawLessons = $lStmt->fetchAll();

        $lessons = [];
        foreach ($rawLessons as $rl) {
            $lId = (int)$rl['id'];
            $isComp = in_array($lId, $completedLessonIds, true);
            $lessonObj = [
                'id' => $lId,
                'moduleId' => $mId,
                'courseId' => $cId,
                'title' => $rl['title'],
                'contentType' => $rl['content_type'],
                'content' => $rl['content'],
                'mediaUrl' => $rl['media_url'],
                'durationMinutes' => (int)$rl['duration_minutes'],
                'sortOrder' => (int)$rl['sort_order'],
                'isCompleted' => $isComp
            ];
            $lessons[] = $lessonObj;
            $allLessonsFlat[] = $lessonObj;
        }

        $modules[] = [
            'id' => $mId,
            'courseId' => $cId,
            'title' => $rm['title'],
            'description' => $rm['description'],
            'sortOrder' => (int)$rm['sort_order'],
            'lessons' => $lessons
        ];
    }

    // Assessment metadata
    $assStmt = $db->prepare("SELECT a.*, (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) as questions_count FROM course_assessments a WHERE a.course_id = ? LIMIT 1");
    $assStmt->execute([$cId]);
    $rawAss = $assStmt->fetch();

    $assessment = null;
    if ($rawAss) {
        $assessment = [
            'id' => (int)$rawAss['id'],
            'courseId' => $cId,
            'title' => $rawAss['title'],
            'description' => $rawAss['description'],
            'passingScore' => (int)$rawAss['passing_score'],
            'timeLimitMinutes' => (int)$rawAss['time_limit_minutes'],
            'maxAttempts' => (int)$rawAss['max_attempts'],
            'questionsCount' => (int)$rawAss['questions_count'],
            'attemptsUsed' => $attemptCount,
            'highestScore' => $highestScore,
            'hasPassed' => ($highestScore >= (int)$rawAss['passing_score']) || ($certificate !== null)
        ];
    }

    // Determine resume lesson id
    $resumeLessonId = null;
    foreach ($allLessonsFlat as $l) {
        if (!$l['isCompleted']) {
            $resumeLessonId = $l['id'];
            break;
        }
    }
    if ($resumeLessonId === null && count($allLessonsFlat) > 0) {
        $resumeLessonId = $allLessonsFlat[0]['id'];
    }

    $objs = [];
    if (!empty($course['learning_objectives'])) {
        $objs = array_filter(array_map('trim', explode(';', $course['learning_objectives'])));
    }

    echo json_encode([
        'success' => true,
        'course' => [
            'id' => $cId,
            'courseCode' => $course['course_code'],
            'title' => $course['title'],
            'slug' => $course['slug'],
            'description' => $course['description'],
            'learningObjectives' => $objs,
            'category' => $course['category'],
            'language' => $course['language'],
            'estimatedMinutes' => (int)$course['estimated_minutes'],
            'thumbnailUrl' => $course['thumbnail_url'],
            'status' => $course['status'],
            'passingScore' => (int)$course['passing_score'],
            'maxAssessmentAttempts' => (int)$course['max_assessment_attempts'],
            'isMandatory' => (bool)$course['is_mandatory'],
            'modulesCount' => count($modules),
            'lessonsCount' => count($allLessonsFlat),
            'modules' => $modules,
            'assessment' => $assessment,
            'enrollment' => $enrollment,
            'certificate' => $certificate,
            'resumeLessonId' => $resumeLessonId
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading course detail: ' . $e->getMessage()
    ]);
}
