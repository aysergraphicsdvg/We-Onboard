<?php
/**
 * We Onboard — Quality Score Recalculator API
 * POST /api/v1/admin/performance/recalculate.php
 */

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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$targetFreelancerId = !empty($data['freelancer_id']) ? (int)$data['freelancer_id'] : 0;

try {
    $db = Database::getConnection();

    if ($targetFreelancerId > 0) {
        // Recalculate single freelancer
        $result = QualityScoreEngine::calculateFreelancerScore($db, $targetFreelancerId);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Quality Score Recalculated', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$targetFreelancerId,
            "Quality Score recalculated: " . ($result['quality_score'] !== null ? "{$result['quality_score']} pts" : "Insufficient Data"),
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Quality score recalculated for {$result['full_name']}.",
            'result' => $result
        ]);
        exit;
    }

    // Recalculate all freelancers
    $flStmt = $db->query("SELECT id FROM freelancers ORDER BY id ASC");
    $ids = $flStmt->fetchAll(PDO::FETCH_COLUMN);

    $recalculated = 0;
    $errors = 0;

    foreach ($ids as $fId) {
        try {
            QualityScoreEngine::calculateFreelancerScore($db, (int)$fId);
            $recalculated++;
        } catch (Exception $e) {
            $errors++;
        }
    }

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Bulk Quality Score Recalculation', 'System', 'ALL', ?, ?)
    ");
    $auditStmt->execute([
        $adminName,
        "Recalculated Quality Scores for {$recalculated} freelancers ({$errors} errors)",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Successfully recalculated Quality Scores for {$recalculated} freelancers.",
        'recalculated_count' => $recalculated,
        'error_count' => $errors
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
