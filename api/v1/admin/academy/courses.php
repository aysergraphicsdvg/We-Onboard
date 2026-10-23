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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify Admin Role & Permissions
    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Role (' . ($admin['role_name'] ?? 'Unknown') . ') does not have permission to manage Academy courses.'
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $category = trim($_GET['category'] ?? '');

        $where = ["1=1"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(c.title LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)";
            $w = '%' . $search . '%';
            $params = array_merge($params, [$w, $w, $w]);
        }
        if (!empty($status) && $status !== 'All') {
            $where[] = "c.status = ?";
            $params[] = $status;
        }
        if (!empty($category) && $category !== 'All') {
            $where[] = "c.category = ?";
            $params[] = $category;
        }

        $sql = "SELECT c.*,
                (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as modules_count,
                (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id) as lessons_count,
                (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id) as enrollments_count,
                (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id AND e.status = 'Completed') as completions_count,
                (SELECT COUNT(*) FROM freelancer_certificates cert WHERE cert.course_id = c.id) as certificates_issued_count,
                (SELECT a.passing_score FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as passing_score_conf
                FROM courses c
                WHERE " . implode(' AND ', $where) . "
                ORDER BY c.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll();

        $output = [];
        foreach ($courses as $c) {
            $objs = [];
            if (!empty($c['learning_objectives'])) {
                $objs = array_filter(array_map('trim', explode(';', $c['learning_objectives'])));
            }

            $output[] = [
                'id' => (int)$c['id'],
                'courseCode' => $c['course_code'],
                'title' => $c['title'],
                'slug' => $c['slug'],
                'description' => $c['description'],
                'learningObjectives' => $objs,
                'category' => $c['category'],
                'language' => $c['language'],
                'estimatedMinutes' => (int)$c['estimated_minutes'],
                'thumbnailUrl' => $c['thumbnail_url'],
                'status' => $c['status'],
                'passingScore' => (int)$c['passing_score'],
                'maxAssessmentAttempts' => (int)$c['max_assessment_attempts'],
                'isMandatory' => (bool)$c['is_mandatory'],
                'modulesCount' => (int)$c['modules_count'],
                'lessonsCount' => (int)$c['lessons_count'],
                'enrollmentsCount' => (int)$c['enrollments_count'],
                'completionsCount' => (int)$c['completions_count'],
                'certificatesCount' => (int)$c['certificates_issued_count'],
                'createdAt' => $c['created_at'],
                'updatedAt' => $c['updated_at']
            ];
        }

        echo json_encode([
            'success' => true,
            'count' => count($output),
            'courses' => $output
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? 'create'); // create, update, set_status, delete
        $courseId = !empty($data['id']) ? (int)$data['id'] : 0;

        // CSRF verification for mutations
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'set_status') {
            $newStatus = trim($data['status'] ?? '');
            if (!in_array($newStatus, ['Draft', 'Published', 'Archived'], true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid status value']);
                exit;
            }

            $upd = $db->prepare("UPDATE courses SET status = ? WHERE id = ?");
            $upd->execute([$newStatus, $courseId]);

            // Audit log
            $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
            $audit->execute([
                $admin['name'],
                'Updated Course Status',
                (string)$courseId,
                "Status set to {$newStatus}"
            ]);

            echo json_encode(['success' => true, 'message' => "Course status updated to {$newStatus}"]);
            exit;
        }

        if ($action === 'create' || $action === 'update') {
            $title = trim($data['title'] ?? '');
            $code = trim($data['course_code'] ?? '');
            $desc = trim($data['description'] ?? '');
            $category = trim($data['category'] ?? 'Field Operations');
            $language = trim($data['language'] ?? 'en');
            $minutes = max(5, (int)($data['estimated_minutes'] ?? 45));
            $passingScore = min(100, max(50, (int)($data['passing_score'] ?? 80)));
            $maxAttempts = min(10, max(1, (int)($data['max_assessment_attempts'] ?? 3)));
            $isMandatory = !empty($data['is_mandatory']) ? 1 : 0;
            $status = in_array($data['status'] ?? '', ['Draft', 'Published', 'Archived']) ? $data['status'] : 'Published';
            $objectives = is_array($data['learning_objectives'] ?? null) 
                ? implode('; ', array_map('trim', $data['learning_objectives'])) 
                : trim($data['learning_objectives'] ?? '');

            if (empty($title) || empty($desc)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Title and description are required']);
                exit;
            }

            // Generate slug and code if missing
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
            if (empty($code)) {
                $code = 'WO-CRS-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $title), 0, 4)) . '-' . rand(10, 99);
            }

            if ($action === 'create') {
                $ins = $db->prepare("INSERT INTO courses (course_code, title, slug, description, learning_objectives, category, language, estimated_minutes, status, passing_score, max_assessment_attempts, is_mandatory, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
                $ins->execute([
                    $code,
                    $title,
                    $slug,
                    $desc,
                    $objectives,
                    $category,
                    $language,
                    $minutes,
                    $status,
                    $passingScore,
                    $maxAttempts,
                    $isMandatory,
                    (int)$admin['id']
                ]);
                $newId = (int)$db->lastInsertId();

                // Create default assessment for this course
                $insAss = $db->prepare("INSERT INTO course_assessments (course_id, title, description, passing_score, time_limit_minutes, max_attempts) VALUES (?, ?, ?, ?, 15, ?)");
                $insAss->execute([
                    $newId,
                    $title . ' Certification Exam',
                    'Comprehensive knowledge verification exam for ' . $title,
                    $passingScore,
                    $maxAttempts
                ]);

                // Audit log
                $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
                $audit->execute([
                    $admin['name'],
                    'Created Course',
                    (string)$newId,
                    "Created course {$code}: {$title}"
                ]);

                echo json_encode(['success' => true, 'message' => 'Course created successfully', 'courseId' => $newId]);
                exit;
            } else {
                $upd = $db->prepare("UPDATE courses SET title = ?, description = ?, learning_objectives = ?, category = ?, language = ?, estimated_minutes = ?, status = ?, passing_score = ?, max_assessment_attempts = ?, is_mandatory = ? WHERE id = ?");
                $upd->execute([
                    $title,
                    $desc,
                    $objectives,
                    $category,
                    $language,
                    $minutes,
                    $status,
                    $passingScore,
                    $maxAttempts,
                    $isMandatory,
                    $courseId
                ]);

                // Also update assessment passing score and max attempts
                $updAss = $db->prepare("UPDATE course_assessments SET passing_score = ?, max_attempts = ? WHERE course_id = ?");
                $updAss->execute([$passingScore, $maxAttempts, $courseId]);

                // Audit log
                $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
                $audit->execute([
                    $admin['name'],
                    'Updated Course',
                    (string)$courseId,
                    "Updated course {$title}"
                ]);

                echo json_encode(['success' => true, 'message' => 'Course updated successfully']);
                exit;
            }
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error handling admin courses: ' . $e->getMessage()
    ]);
}
