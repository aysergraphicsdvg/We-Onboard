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

    $category = trim($_GET['category'] ?? '');
    $language = trim($_GET['language'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $freelancerId = $_SESSION['freelancer_id'] ?? null;

    $where = ["c.status = 'Published'"];
    $params = [];

    if (!empty($category) && $category !== 'All') {
        $where[] = "c.category = ?";
        $params[] = $category;
    }

    if (!empty($language) && $language !== 'All') {
        $where[] = "c.language = ?";
        $params[] = $language;
    }

    if (!empty($search)) {
        $where[] = "(c.title LIKE ? OR c.description LIKE ? OR c.course_code LIKE ?)";
        $wildcard = '%' . $search . '%';
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $sql = "SELECT c.*, 
            (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as modules_count,
            (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id) as lessons_count,
            (SELECT a.passing_score FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as assessment_passing_score,
            (SELECT a.id FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as assessment_id
            FROM courses c
            WHERE " . implode(' AND ', $where) . "
            ORDER BY c.is_mandatory DESC, c.id ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rawCourses = $stmt->fetchAll();

    $courses = [];
    foreach ($rawCourses as $rc) {
        $courseId = (int)$rc['id'];
        $enrollment = null;
        $certificate = null;

        if ($freelancerId) {
            $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
            $enrStmt->execute([$freelancerId, $courseId]);
            $enrRow = $enrStmt->fetch();
            if ($enrRow) {
                // Fetch completed lessons
                $clStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
                $clStmt->execute([$freelancerId, $courseId]);
                $completedLessonIds = $clStmt->fetchAll(PDO::FETCH_COLUMN);

                $enrollment = [
                    'id' => (int)$enrRow['id'],
                    'status' => $enrRow['status'],
                    'progressPercent' => (int)$enrRow['progress_percent'],
                    'lastLessonId' => $enrRow['last_lesson_id'] ? (int)$enrRow['last_lesson_id'] : null,
                    'enrolledAt' => $enrRow['enrolled_at'],
                    'completedAt' => $enrRow['completed_at'],
                    'completedLessons' => array_map('intval', $completedLessonIds)
                ];
            }

            $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
            $certStmt->execute([$freelancerId, $courseId]);
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
        }

        // Split learning objectives
        $objs = [];
        if (!empty($rc['learning_objectives'])) {
            $objs = array_filter(array_map('trim', explode(';', $rc['learning_objectives'])));
        }

        $courses[] = [
            'id' => $courseId,
            'courseCode' => $rc['course_code'],
            'title' => $rc['title'],
            'slug' => $rc['slug'],
            'description' => $rc['description'],
            'learningObjectives' => $objs,
            'category' => $rc['category'],
            'language' => $rc['language'],
            'estimatedMinutes' => (int)$rc['estimated_minutes'],
            'thumbnailUrl' => $rc['thumbnail_url'],
            'status' => $rc['status'],
            'passingScore' => (int)$rc['passing_score'],
            'maxAssessmentAttempts' => (int)$rc['max_assessment_attempts'],
            'isMandatory' => (bool)$rc['is_mandatory'],
            'modulesCount' => (int)$rc['modules_count'],
            'lessonsCount' => (int)$rc['lessons_count'],
            'hasAssessment' => !empty($rc['assessment_id']),
            'enrollment' => $enrollment,
            'certificate' => $certificate
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($courses),
        'courses' => $courses
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading academy courses: ' . $e->getMessage()
    ]);
}
