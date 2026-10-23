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
        $viewType = trim($_GET['view'] ?? 'enrollments'); // enrollments, attempts, certificates
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        if ($viewType === 'attempts') {
            $where = ["1=1"];
            $params = [];
            if ($courseId > 0) {
                $where[] = "aa.course_id = ?";
                $params[] = $courseId;
            }
            if (!empty($search)) {
                $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ?)";
                $w = '%' . $search . '%';
                $params = array_merge($params, [$w, $w, $w]);
            }

            $sql = "SELECT aa.*, f.full_name as freelancer_name, f.email as freelancer_email, c.title as course_title, c.course_code 
                    FROM assessment_attempts aa 
                    JOIN freelancers f ON aa.freelancer_id = f.id 
                    JOIN courses c ON aa.course_id = c.id 
                    WHERE " . implode(' AND ', $where) . " 
                    ORDER BY aa.id DESC LIMIT 100";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $attempts = $stmt->fetchAll();

            $output = [];
            foreach ($attempts as $a) {
                $output[] = [
                    'id' => (int)$a['id'],
                    'assessmentId' => (int)$a['assessment_id'],
                    'courseId' => (int)$a['course_id'],
                    'courseTitle' => $a['course_title'],
                    'courseCode' => $a['course_code'],
                    'freelancerId' => (int)$a['freelancer_id'],
                    'freelancerName' => $a['freelancer_name'],
                    'freelancerEmail' => $a['freelancer_email'],
                    'attemptNumber' => (int)$a['attempt_number'],
                    'scorePercent' => (int)$a['score_percent'],
                    'passed' => (bool)$a['passed'],
                    'submittedAt' => $a['submitted_at']
                ];
            }

            echo json_encode(['success' => true, 'attempts' => $output]);
            exit;
        }

        if ($viewType === 'certificates') {
            $where = ["1=1"];
            $params = [];
            if ($courseId > 0) {
                $where[] = "cert.course_id = ?";
                $params[] = $courseId;
            }
            if (!empty($search)) {
                $where[] = "(f.full_name LIKE ? OR cert.certificate_ref LIKE ? OR cert.verification_code LIKE ?)";
                $w = '%' . $search . '%';
                $params = array_merge($params, [$w, $w, $w]);
            }

            $sql = "SELECT cert.*, f.full_name as freelancer_name, f.email as freelancer_email, f.phone as freelancer_phone, c.title as course_title, c.course_code 
                    FROM freelancer_certificates cert 
                    JOIN freelancers f ON cert.freelancer_id = f.id 
                    JOIN courses c ON cert.course_id = c.id 
                    WHERE " . implode(' AND ', $where) . " 
                    ORDER BY cert.id DESC LIMIT 100";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $certs = $stmt->fetchAll();

            $output = [];
            foreach ($certs as $c) {
                $output[] = [
                    'id' => (int)$c['id'],
                    'certificateRef' => $c['certificate_ref'],
                    'verificationCode' => $c['verification_code'],
                    'freelancerId' => (int)$c['freelancer_id'],
                    'freelancerName' => $c['freelancer_name'],
                    'freelancerEmail' => $c['freelancer_email'],
                    'freelancerPhone' => $c['freelancer_phone'],
                    'courseId' => (int)$c['course_id'],
                    'courseTitle' => $c['course_title'],
                    'courseCode' => $c['course_code'],
                    'scorePercent' => (int)$c['score_percent'],
                    'issueDate' => $c['issue_date'],
                    'createdAt' => $c['created_at']
                ];
            }

            echo json_encode(['success' => true, 'certificates' => $output]);
            exit;
        }

        // Default: Enrollments
        $where = ["1=1"];
        $params = [];
        if ($courseId > 0) {
            $where[] = "e.course_id = ?";
            $params[] = $courseId;
        }
        if (!empty($status) && $status !== 'All') {
            $where[] = "e.status = ?";
            $params[] = $status;
        }
        if (!empty($search)) {
            $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ?)";
            $w = '%' . $search . '%';
            $params = array_merge($params, [$w, $w, $w]);
        }

        $sql = "SELECT e.*, f.full_name as freelancer_name, f.email as freelancer_email, f.phone as freelancer_phone, f.city as freelancer_city,
                c.title as course_title, c.course_code,
                cert.certificate_ref, cert.score_percent as certified_score
                FROM course_enrollments e
                JOIN freelancers f ON e.freelancer_id = f.id
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN freelancer_certificates cert ON (cert.freelancer_id = e.freelancer_id AND cert.course_id = e.course_id)
                WHERE " . implode(' AND ', $where) . "
                ORDER BY e.id DESC LIMIT 100";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $enrollments = $stmt->fetchAll();

        $output = [];
        foreach ($enrollments as $e) {
            $output[] = [
                'id' => (int)$e['id'],
                'freelancerId' => (int)$e['freelancer_id'],
                'freelancerName' => $e['freelancer_name'],
                'freelancerEmail' => $e['freelancer_email'],
                'freelancerPhone' => $e['freelancer_phone'],
                'freelancerCity' => $e['freelancer_city'],
                'courseId' => (int)$e['course_id'],
                'courseTitle' => $e['course_title'],
                'courseCode' => $e['course_code'],
                'status' => $e['status'],
                'progressPercent' => (int)$e['progress_percent'],
                'enrolledAt' => $e['enrolled_at'],
                'completedAt' => $e['completed_at'],
                'certificateRef' => $e['certificate_ref'],
                'certifiedScore' => $e['certified_score'] !== null ? (int)$e['certified_score'] : null
            ];
        }

        echo json_encode(['success' => true, 'enrollments' => $output]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');

        // CSRF verification
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'reset_attempts') {
            $freelancerId = (int)($data['freelancer_id'] ?? 0);
            $courseId = (int)($data['course_id'] ?? 0);

            if ($freelancerId <= 0 || $courseId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing freelancer_id or course_id.']);
                exit;
            }

            // Remove failed attempts to allow retrying
            $del = $db->prepare("DELETE FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ? AND passed = 0");
            $del->execute([$freelancerId, $courseId]);

            // Audit log
            $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
            $audit->execute([
                $admin['name'],
                'Reset Assessment Attempts',
                (string)$courseId,
                "Reset failed attempts for freelancer ID {$freelancerId}"
            ]);

            echo json_encode(['success' => true, 'message' => 'Assessment attempts have been reset.']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error managing enrollments: ' . $e->getMessage()
    ]);
}
