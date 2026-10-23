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

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Your role (' . ($admin['role_name'] ?? 'Unknown') . ') does not have permission to view or manage freelancer identity profiles.'
        ]);
        exit;
    }

    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $onboardingStatus = trim($_GET['onboarding_status'] ?? '');
    $city = trim($_GET['city'] ?? '');
    $role = trim($_GET['role'] ?? '');

    $where = [];
    $params = [];

    if (!empty($search)) {
        $where[] = "(f.full_name LIKE ? OR f.phone LIKE ? OR f.email LIKE ? OR f.registration_ref LIKE ? OR f.city LIKE ?)";
        $wildcard = '%' . $search . '%';
        $params = array_merge($params, [$wildcard, $wildcard, $wildcard, $wildcard, $wildcard]);
    }

    if (!empty($status) && $status !== 'All') {
        $where[] = "f.status = ?";
        $params[] = $status;
    }

    if (!empty($onboardingStatus) && $onboardingStatus !== 'All') {
        $where[] = "f.onboarding_status = ?";
        $params[] = $onboardingStatus;
    }

    if (!empty($city) && $city !== 'All') {
        $where[] = "f.city = ?";
        $params[] = $city;
    }

    if (!empty($role) && $role !== 'All') {
        $where[] = "f.preferred_role = ?";
        $params[] = $role;
    }

    $whereSql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT f.*, 
            COUNT(d.id) as total_docs,
            SUM(CASE WHEN d.status = 'Approved' THEN 1 ELSE 0 END) as approved_docs,
            SUM(CASE WHEN d.status = 'Pending' THEN 1 ELSE 0 END) as pending_docs,
            SUM(CASE WHEN d.status = 'Resubmission Required' THEN 1 ELSE 0 END) as resubmission_docs,
            SUM(CASE WHEN d.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_docs
            FROM freelancers f
            LEFT JOIN freelancer_documents d ON f.id = d.freelancer_id
            {$whereSql}
            GROUP BY f.id
            ORDER BY f.created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $freelancers = $stmt->fetchAll();

    // Format results
    $formatted = [];
    foreach ($freelancers as $row) {
        $formatted[] = [
            'id' => (string)$row['id'],
            'registrationRef' => $row['registration_ref'],
            'fullName' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'dob' => $row['dob'],
            'gender' => $row['gender'],
            'residentialAddress' => $row['residential_address'],
            'city' => $row['city'],
            'state' => $row['state'],
            'pinCode' => $row['pin_code'],
            'languages' => array_map('trim', explode(',', $row['languages'] ?? '')),
            'preferredAreas' => array_map('trim', explode(',', $row['preferred_areas'] ?? '')),
            'preferredWorkType' => $row['preferred_work_type'],
            'education' => $row['education'],
            'previousExperienceYears' => (int)$row['previous_experience_years'],
            'salesFieldExperience' => (bool)$row['sales_field_experience'],
            'skills' => array_map('trim', explode(',', $row['skills'] ?? '')),
            'preferredRole' => $row['preferred_role'],
            'previousEmployer' => $row['previous_employer'],
            'status' => $row['status'],
            'onboardingStatus' => $row['onboarding_status'] ?? 'KYC Pending',
            'languagePreference' => $row['language_preference'] ?? 'en',
            'profileCompletedPercent' => (int)($row['profile_completed_percent'] ?? 60),
            'verificationNotes' => $row['verification_notes'],
            'registeredAt' => $row['created_at'],
            'docSummary' => [
                'total' => (int)$row['total_docs'],
                'approved' => (int)$row['approved_docs'],
                'pending' => (int)$row['pending_docs'],
                'resubmission' => (int)$row['resubmission_docs'],
                'rejected' => (int)$row['rejected_docs']
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($formatted),
        'freelancers' => $formatted
    ]);
} catch (Exception $e) {
    error_log("Admin freelancer list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to load freelancer applications.']);
}
