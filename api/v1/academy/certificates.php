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

    // 1. Public Verification Flow: if query has 'ref' or 'code'
    $ref = trim($_GET['ref'] ?? '');
    $code = trim($_GET['code'] ?? '');

    if (!empty($ref) || !empty($code)) {
        if (!empty($ref)) {
            $stmt = $db->prepare("SELECT cert.*, f.full_name as freelancer_name, c.title as course_title, c.course_code FROM freelancer_certificates cert JOIN freelancers f ON cert.freelancer_id = f.id JOIN courses c ON cert.course_id = c.id WHERE cert.certificate_ref = ? LIMIT 1");
            $stmt->execute([$ref]);
        } else {
            $stmt = $db->prepare("SELECT cert.*, f.full_name as freelancer_name, c.title as course_title, c.course_code FROM freelancer_certificates cert JOIN freelancers f ON cert.freelancer_id = f.id JOIN courses c ON cert.course_id = c.id WHERE cert.verification_code = ? LIMIT 1");
            $stmt->execute([$code]);
        }

        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'error' => 'Certificate record not found or verification code is invalid.'
            ]);
            exit;
        }

        // Mask name slightly for privacy if public lookup
        $nameParts = explode(' ', trim($row['freelancer_name']));
        $maskedName = count($nameParts) > 1 
            ? $nameParts[0] . ' ' . substr($nameParts[1], 0, 1) . '•••'
            : $nameParts[0];

        echo json_encode([
            'success' => true,
            'verified' => true,
            'certificate' => [
                'certificateRef' => $row['certificate_ref'],
                'recipient' => $maskedName,
                'courseTitle' => $row['course_title'],
                'courseCode' => $row['course_code'],
                'issueDate' => $row['issue_date'],
                'scorePercent' => (int)$row['score_percent'],
                'status' => 'Authentic & Valid',
                'issuer' => 'We Onboard Operational Academy'
            ]
        ]);
        exit;
    }

    // 2. Freelancer Personal Certificates Flow: requires freelancer login
    if (empty($_SESSION['freelancer_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to list certificates.']);
        exit;
    }

    $freelancerId = (int)$_SESSION['freelancer_id'];
    $stmt = $db->prepare("SELECT cert.*, c.title as course_title, c.course_code, c.category FROM freelancer_certificates cert JOIN courses c ON cert.course_id = c.id WHERE cert.freelancer_id = ? ORDER BY cert.issue_date DESC");
    $stmt->execute([$freelancerId]);
    $certs = $stmt->fetchAll();

    $output = [];
    foreach ($certs as $c) {
        $output[] = [
            'id' => (int)$c['id'],
            'certificateRef' => $c['certificate_ref'],
            'courseId' => (int)$c['course_id'],
            'courseTitle' => $c['course_title'],
            'courseCode' => $c['course_code'],
            'category' => $c['category'],
            'issueDate' => $c['issue_date'],
            'scorePercent' => (int)$c['score_percent'],
            'verificationCode' => $c['verification_code'],
            'createdAt' => $c['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($output),
        'certificates' => $output
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error retrieving certificates: ' . $e->getMessage()
    ]);
}
