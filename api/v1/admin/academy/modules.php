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

    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient privileges to manage course modules.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        if ($courseId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing valid course_id']);
            exit;
        }

        $mStmt = $db->prepare("SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC");
        $mStmt->execute([$courseId]);
        $rawModules = $mStmt->fetchAll();

        $modules = [];
        foreach ($rawModules as $rm) {
            $mId = (int)$rm['id'];
            $lStmt = $db->prepare("SELECT * FROM course_lessons WHERE module_id = ? ORDER BY sort_order ASC, id ASC");
            $lStmt->execute([$mId]);
            $rawLessons = $lStmt->fetchAll();

            $lessons = [];
            foreach ($rawLessons as $rl) {
                $lessons[] = [
                    'id' => (int)$rl['id'],
                    'moduleId' => $mId,
                    'courseId' => $courseId,
                    'title' => $rl['title'],
                    'contentType' => $rl['content_type'],
                    'content' => $rl['content'],
                    'mediaUrl' => $rl['media_url'],
                    'durationMinutes' => (int)$rl['duration_minutes'],
                    'sortOrder' => (int)$rl['sort_order']
                ];
            }

            $modules[] = [
                'id' => $mId,
                'courseId' => $courseId,
                'title' => $rm['title'],
                'description' => $rm['description'],
                'sortOrder' => (int)$rm['sort_order'],
                'lessons' => $lessons
            ];
        }

        echo json_encode(['success' => true, 'modules' => $modules]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');

        // CSRF check
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'create_module') {
            $courseId = (int)($data['course_id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $desc = trim($data['description'] ?? '');
            $order = (int)($data['sort_order'] ?? 1);

            if ($courseId <= 0 || empty($title)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Valid course_id and title are required.']);
                exit;
            }

            $ins = $db->prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)");
            $ins->execute([$courseId, $title, $desc, $order]);
            $modId = (int)$db->lastInsertId();

            echo json_encode(['success' => true, 'message' => 'Module created', 'moduleId' => $modId]);
            exit;
        }

        if ($action === 'create_lesson') {
            $moduleId = (int)($data['module_id'] ?? 0);
            $courseId = (int)($data['course_id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $type = in_array($data['content_type'] ?? '', ['text', 'video_ref', 'interactive']) ? $data['content_type'] : 'text';
            $content = trim($data['content'] ?? '');
            $mediaUrl = trim($data['media_url'] ?? '');
            $duration = max(1, (int)($data['duration_minutes'] ?? 10));
            $order = (int)($data['sort_order'] ?? 1);

            if ($moduleId <= 0 || $courseId <= 0 || empty($title) || empty($content)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Module, course, title, and content are required.']);
                exit;
            }

            $ins = $db->prepare("INSERT INTO course_lessons (module_id, course_id, title, content_type, content, media_url, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([$moduleId, $courseId, $title, $type, $content, $mediaUrl ?: null, $duration, $order]);
            $lesId = (int)$db->lastInsertId();

            echo json_encode(['success' => true, 'message' => 'Lesson created', 'lessonId' => $lesId]);
            exit;
        }

        if ($action === 'delete_lesson') {
            $lessonId = (int)($data['lesson_id'] ?? 0);
            $del = $db->prepare("DELETE FROM course_lessons WHERE id = ?");
            $del->execute([$lessonId]);
            echo json_encode(['success' => true, 'message' => 'Lesson deleted']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error managing modules/lessons: ' . $e->getMessage()
    ]);
}
