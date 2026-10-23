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
    echo json_encode(['success' => false, 'authenticated' => false, 'error' => 'No active freelancer session.']);
    exit;
}

try {
    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id, registration_ref, full_name, email, phone, dob, gender, residential_address, city, state, pin_code, is_adult, has_smartphone, languages, preferred_areas, preferred_work_type, education, previous_experience_years, sales_field_experience, skills, preferred_role, previous_employer, status, onboarding_status, language_preference, profile_completed_percent, created_at 
                          FROM freelancers WHERE id = ? LIMIT 1");
    $stmt->execute([$_SESSION['freelancer_id']]);
    $fl = $stmt->fetch();

    if (!$fl) {
        unset($_SESSION['freelancer_id'], $_SESSION['freelancer_ref'], $_SESSION['freelancer_email'], $_SESSION['freelancer_name']);
        http_response_code(401);
        echo json_encode(['success' => false, 'authenticated' => false, 'error' => 'Freelancer account not found.']);
        exit;
    }

    // Load KYC documents
    $docsStmt = $db->prepare("SELECT id, document_ref, document_type, original_filename, status, rejection_reason, created_at, reviewed_at FROM freelancer_documents WHERE freelancer_id = ? ORDER BY created_at ASC");
    $docsStmt->execute([$fl['id']]);
    $documents = $docsStmt->fetchAll();

    // Load notifications
    $notifStmt = $db->prepare("SELECT id, title, message, type, is_read, created_at FROM freelancer_notifications WHERE freelancer_id = ? ORDER BY created_at DESC LIMIT 20");
    $notifStmt->execute([$fl['id']]);
    $notifications = $notifStmt->fetchAll();

    // Calculate real dynamic profile completion percent based on filled fields and submitted documents
    $filledPoints = 0;
    $totalPoints = 100;
    // Core profile (60 points)
    if (!empty($fl['full_name'])) $filledPoints += 10;
    if (!empty($fl['phone']) && !empty($fl['email'])) $filledPoints += 10;
    if (!empty($fl['residential_address']) && !empty($fl['city'])) $filledPoints += 10;
    if (!empty($fl['skills'])) $filledPoints += 10;
    if (!empty($fl['preferred_role'])) $filledPoints += 10;
    if (!empty($fl['education'])) $filledPoints += 10;
    // Documents (40 points: up to 4 document types)
    $uniqueDocTypes = [];
    foreach ($documents as $d) {
        $uniqueDocTypes[$d['document_type']] = true;
    }
    $docPoints = min(40, count($uniqueDocTypes) * 10);
    $calculatedPercent = min(100, $filledPoints + $docPoints);

    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'csrf_token' => $_SESSION['csrf_token'],
        'user' => [
            'id' => (string)$fl['id'],
            'registrationRef' => $fl['registration_ref'],
            'fullName' => $fl['full_name'],
            'email' => $fl['email'],
            'phone' => $fl['phone'],
            'dob' => $fl['dob'],
            'gender' => $fl['gender'],
            'residentialAddress' => $fl['residential_address'],
            'city' => $fl['city'],
            'state' => $fl['state'],
            'pinCode' => $fl['pin_code'],
            'languages' => array_map('trim', explode(',', $fl['languages'] ?? '')),
            'preferredAreas' => array_map('trim', explode(',', $fl['preferred_areas'] ?? '')),
            'preferredWorkType' => $fl['preferred_work_type'],
            'education' => $fl['education'],
            'previousExperienceYears' => (int)$fl['previous_experience_years'],
            'salesFieldExperience' => (bool)$fl['sales_field_experience'],
            'skills' => array_map('trim', explode(',', $fl['skills'] ?? '')),
            'preferredRole' => $fl['preferred_role'],
            'status' => $fl['status'],
            'onboardingStatus' => $fl['onboarding_status'] ?? 'KYC Pending',
            'languagePreference' => $fl['language_preference'] ?? 'en',
            'profileCompletedPercent' => $calculatedPercent,
            'registeredAt' => $fl['created_at'],
            'documents' => $documents,
            'notifications' => $notifications
        ]
    ]);
} catch (Exception $e) {
    error_log("Freelancer session check error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to retrieve freelancer profile.']);
}
