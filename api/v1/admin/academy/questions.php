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
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient privileges.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        $assessmentId = !empty($_GET['assessment_id']) ? (int)$_GET['assessment_id'] : 0;

        if ($courseId > 0 && $assessmentId <= 0) {
            $assStmt = $db->prepare("SELECT id FROM course_assessments WHERE course_id = ? LIMIT 1");
            $assStmt->execute([$courseId]);
            $assessmentId = (int)$assStmt->fetchColumn();
        }

        if ($assessmentId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing valid course_id or assessment_id']);
            exit;
        }

        $qStmt = $db->prepare("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order ASC, id ASC");
        $qStmt->execute([$assessmentId]);
        $questions = $qStmt->fetchAll();

        $output = [];
        foreach ($questions as $q) {
            $options = json_decode($q['options_json'], true) ?: [];
            $correct = json_decode($q['correct_answers_json'], true) ?: [];
            $output[] = [
                'id' => (int)$q['id'],
                'assessmentId' => (int)$q['assessment_id'],
                'questionText' => $q['question_text'],
                'questionType' => $q['question_type'],
                'options' => $options,
                'correctAnswers' => $correct,
                'explanation' => $q['explanation'],
                'sortOrder' => (int)$q['sort_order'],
                'points' => (int)$q['points']
            ];
        }

        echo json_encode(['success' => true, 'assessmentId' => $assessmentId, 'questions' => $output]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? 'save'); // save, delete

        // CSRF verification
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'delete') {
            $qId = (int)($data['id'] ?? 0);
            $del = $db->prepare("DELETE FROM assessment_questions WHERE id = ?");
            $del->execute([$qId]);
            echo json_encode(['success' => true, 'message' => 'Question deleted']);
            exit;
        }

        if ($action === 'save') {
            $assessmentId = (int)($data['assessment_id'] ?? 0);
            $qText = trim($data['question_text'] ?? '');
            $type = in_array($data['question_type'] ?? '', ['single_choice', 'multi_choice', 'true_false']) ? $data['question_type'] : 'single_choice';
            $options = is_array($data['options'] ?? null) ? $data['options'] : [];
            $correct = is_array($data['correct_answers'] ?? null) ? $data['correct_answers'] : [];
            $explanation = trim($data['explanation'] ?? '');
            $points = max(1, (int)($data['points'] ?? 1));
            $order = (int)($data['sort_order'] ?? 1);
            $qId = !empty($data['id']) ? (int)$data['id'] : 0;

            if ($assessmentId <= 0 || empty($qText) || empty($options) || empty($correct)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assessment ID, question text, options, and correct answers are required.']);
                exit;
            }

            if ($qId > 0) {
                $upd = $db->prepare("UPDATE assessment_questions SET question_text = ?, question_type = ?, options_json = ?, correct_answers_json = ?, explanation = ?, sort_order = ?, points = ? WHERE id = ?");
                $upd->execute([
                    $qText,
                    $type,
                    json_encode($options),
                    json_encode($correct),
                    $explanation,
                    $order,
                    $points,
                    $qId
                ]);
                echo json_encode(['success' => true, 'message' => 'Question updated']);
                exit;
            } else {
                $ins = $db->prepare("INSERT INTO assessment_questions (assessment_id, question_text, question_type, options_json, correct_answers_json, explanation, sort_order, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([
                    $assessmentId,
                    $qText,
                    $type,
                    json_encode($options),
                    json_encode($correct),
                    $explanation,
                    $order,
                    $points
                ]);
                $newQId = (int)$db->lastInsertId();
                echo json_encode(['success' => true, 'message' => 'Question created', 'questionId' => $newQId]);
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
        'error' => 'Database error handling questions: ' . $e->getMessage()
    ]);
}
