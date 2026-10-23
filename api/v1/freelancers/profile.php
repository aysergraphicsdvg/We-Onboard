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

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in to manage your profile.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    // CSRF verification for cookie-authenticated state modification
    verify_csrf();

    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    $data = is_array($jsonInput) ? $jsonInput : $_POST;

    $action = $data['action'] ?? 'update_settings';

    try {
        $db = Database::getConnection();

        if ($action === 'update_settings') {
            $lang = trim($data['language_preference'] ?? 'en');
            $allowedLangs = ['en', 'kn', 'hi', 'ta', 'te'];
            if (!in_array($lang, $allowedLangs, true)) {
                $lang = 'en';
            }

            $skills = is_array($data['skills'] ?? null) ? implode(', ', $data['skills']) : ($data['skills'] ?? null);
            $workType = trim($data['preferred_work_type'] ?? '');
            $address = trim($data['residential_address'] ?? '');

            $fields = ['language_preference = ?'];
            $params = [$lang];

            if (!empty($skills)) {
                $fields[] = 'skills = ?';
                $params[] = $skills;
            }
            if (!empty($workType) && in_array($workType, ['Full-time', 'Part-time', 'Flexible'], true)) {
                $fields[] = 'preferred_work_type = ?';
                $params[] = $workType;
            }
            if (!empty($address)) {
                $fields[] = 'residential_address = ?';
                $params[] = $address;
            }

            $params[] = $freelancerId;
            $sql = "UPDATE freelancers SET " . implode(', ', $fields) . " WHERE id = ?";
            $db->prepare($sql)->execute($params);

            echo json_encode([
                'success' => true,
                'message' => 'Profile settings updated successfully.',
                'language_preference' => $lang
            ]);
            exit;
        }

        if ($action === 'change_password') {
            $currentPass = $data['current_password'] ?? '';
            $newPass = $data['new_password'] ?? '';

            if (empty($currentPass) || empty($newPass)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password and new password are required.']);
                exit;
            }

            if (strlen($newPass) < 8) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters long.']);
                exit;
            }

            $stmt = $db->prepare("SELECT password_hash FROM freelancers WHERE id = ?");
            $stmt->execute([$freelancerId]);
            $hash = $stmt->fetchColumn();

            if (!$hash || !password_verify($currentPass, $hash)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
                exit;
            }

            $newHash = password_hash($newPass, PASSWORD_DEFAULT);
            $db->prepare("UPDATE freelancers SET password_hash = ? WHERE id = ?")->execute([$newHash, $freelancerId]);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Password Change', 'Freelancer', ?, 'Freelancer changed their password', ?)")
               ->execute([$_SESSION['freelancer_name'] ?? 'Freelancer', (string)$freelancerId, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

            echo json_encode([
                'success' => true,
                'message' => 'Your password has been changed securely.'
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown action requested.']);
    } catch (Exception $e) {
        error_log("Profile update error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error updating profile settings.']);
    }
}
