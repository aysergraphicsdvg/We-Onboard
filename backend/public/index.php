<?php
declare(strict_types=1);

/**
 * We Onboard API foundation.
 * Starter public endpoints only; authenticated workflows are not production-ready yet.
 * Requires PHP 8.2+, pdo_mysql and mbstring.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$allowedOrigin = getenv('WO_ALLOWED_ORIGIN') ?: '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $allowedOrigin !== '' && hash_equals($allowedOrigin, $origin)) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Request-Id');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 65536) {
        respond(413, ['ok' => false, 'error' => ['code' => 'BODY_TOO_LARGE', 'message' => 'Request body is too large.']]);
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || array_is_list($decoded)) {
        respond(400, ['ok' => false, 'error' => ['code' => 'INVALID_JSON', 'message' => 'Send a valid JSON object.']]);
    }
    return $decoded;
}

function requiredString(array $data, string $key, int $maxLength): string {
    $raw = $data[$key] ?? '';
    if (!is_string($raw) && !is_numeric($raw)) {
        respond(422, ['ok' => false, 'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Please check the required fields.']]);
    }
    $value = trim((string)$raw);
    if ($value === '' || mb_strlen($value) > $maxLength) {
        respond(422, ['ok' => false, 'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Please check the required fields.']]);
    }
    return $value;
}

function optionalString(array $data, string $key, int $maxLength): ?string {
    $raw = $data[$key] ?? '';
    if (!is_string($raw) && !is_numeric($raw)) {
        respond(422, ['ok' => false, 'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'A field has an invalid format.']]);
    }
    $value = trim((string)$raw);
    if ($value === '') return null;
    if (mb_strlen($value) > $maxLength) {
        respond(422, ['ok' => false, 'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'A field exceeds the allowed length.']]);
    }
    return $value;
}

function publicId(): string {
    // Opaque display identifier; database auto-increment IDs remain internal.
    return strtoupper(substr(bin2hex(random_bytes(16)), 0, 26));
}

function recordConsent(PDO $pdo, ?int $userId, string $subjectType, string $subjectPublicId, array $data): void {
    $noticeVersion = optionalString($data, 'consentTextVersion', 40) ?? 'v1';
    $language = (string)($data['preferredLanguage'] ?? 'en');
    if (!in_array($language, ['en', 'hi', 'kn', 'te', 'ta', 'ur'], true)) $language = 'en';
    $stmt = $pdo->prepare(
        'INSERT INTO consent_records (public_id, user_id, subject_type, subject_public_id, purpose_key, notice_version, status, language_code) VALUES (?, ?, ?, ?, ?, ?, \'granted\', ?)'
    );
    $stmt->execute([publicId(), $userId, $subjectType, $subjectPublicId, 'public_form_submission', $noticeVersion, $language]);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $uriPath) ?: '/';

if ($method === 'GET' && $path === '/health') {
    respond(200, ['ok' => true, 'service' => 'we-onboard-api', 'status' => 'available']);
}

$dbHost = getenv('WO_DB_HOST') ?: '';
$dbPort = getenv('WO_DB_PORT') ?: '3306';
$dbName = getenv('WO_DB_NAME') ?: '';
$dbUser = getenv('WO_DB_USER') ?: '';
$dbPassword = getenv('WO_DB_PASSWORD');

if ($dbHost === '' || $dbName === '' || $dbUser === '' || $dbPassword === false) {
    respond(503, ['ok' => false, 'error' => ['code' => 'API_NOT_CONFIGURED', 'message' => 'The API database is not configured.']]);
}

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $dbName),
        $dbUser,
        $dbPassword,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (Throwable $e) {
    error_log('We Onboard API database connection failed: ' . $e->getMessage());
    respond(503, ['ok' => false, 'error' => ['code' => 'DATABASE_UNAVAILABLE', 'message' => 'The service is temporarily unavailable.']]);
}

try {
    if ($method === 'POST' && $path === '/enquiries') {
        $data = readJsonBody();
        $fullName = requiredString($data, 'fullName', 160);
        $phone = requiredString($data, 'phone', 30);
        $city = requiredString($data, 'city', 120);
        $enquiryType = requiredString($data, 'enquiryType', 80);
        $serviceRequired = requiredString($data, 'serviceRequired', 160);
        $email = optionalString($data, 'email', 254);
        $companyName = optionalString($data, 'companyName', 200);
        $message = optionalString($data, 'message', 5000);
        $source = optionalString($data, 'source', 120);
        $utmSource = optionalString($data, 'utmSource', 160);
        $utmMedium = optionalString($data, 'utmMedium', 160);
        $utmCampaign = optionalString($data, 'utmCampaign', 160);
        $consent = ($data['consentGiven'] ?? false) === true;

        if (!$consent) {
            respond(422, ['ok' => false, 'error' => ['code' => 'CONSENT_REQUIRED', 'message' => 'Please provide consent before submitting.']]);
        }
        if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(422, ['ok' => false, 'error' => ['code' => 'INVALID_EMAIL', 'message' => 'Enter a valid email address.']]);
        }

        $id = publicId();
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO enquiries (public_id, full_name, company_name, email, phone, city, enquiry_type, service_required, message, source, utm_source, utm_medium, utm_campaign, consent_given, consent_text_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
        );
        $stmt->execute([$id, $fullName, $companyName, $email, $phone, $city, $enquiryType, $serviceRequired, $message, $source, $utmSource, $utmMedium, $utmCampaign, optionalString($data, 'consentTextVersion', 40) ?? 'v1']);
        recordConsent($pdo, null, 'enquiry', $id, $data);

        $audit = $pdo->prepare('INSERT INTO audit_events (event_id, action, entity_type, entity_public_id, details) VALUES (?, ?, ?, ?, ?)');
        $audit->execute([publicId(), 'public_enquiry_created', 'enquiry', $id, json_encode(['city' => $city, 'enquiryType' => $enquiryType], JSON_UNESCAPED_UNICODE)]);
        $pdo->commit();

        respond(201, ['ok' => true, 'data' => ['id' => $id, 'status' => 'new', 'message' => 'Your enquiry has been received.']]);
    }

    if ($method === 'POST' && $path === '/freelancers') {
        $data = readJsonBody();
        $fullName = requiredString($data, 'fullName', 160);
        $phone = requiredString($data, 'phone', 20);
        $city = requiredString($data, 'city', 120);
        $role = (string)($data['preferredRole'] ?? 'team_member');
        $allowedRoles = ['trainee', 'team_member', 'team_leader', 'manager', 'city_regional_head'];
        if (!in_array($role, $allowedRoles, true)) {
            respond(422, ['ok' => false, 'error' => ['code' => 'INVALID_ROLE', 'message' => 'Select a valid role.']]);
        }
        $email = optionalString($data, 'email', 254);
        $state = optionalString($data, 'state', 120);
        $language = (string)($data['preferredLanguage'] ?? 'en');
        if (!in_array($language, ['en', 'hi', 'kn', 'te', 'ta', 'ur'], true)) {
            respond(422, ['ok' => false, 'error' => ['code' => 'INVALID_LANGUAGE', 'message' => 'Select a supported language.']]);
        }
        if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(422, ['ok' => false, 'error' => ['code' => 'INVALID_EMAIL', 'message' => 'Enter a valid email address.']]);
        }
        if (($data['consentGiven'] ?? false) !== true) {
            respond(422, ['ok' => false, 'error' => ['code' => 'CONSENT_REQUIRED', 'message' => 'Please provide consent before submitting.']]);
        }

        $id = publicId();
        $pdo->beginTransaction();
        $userStmt = $pdo->prepare('INSERT INTO users (public_id, email, phone_e164, full_name, preferred_language, status) VALUES (?, ?, ?, ?, ?, \'pending\')');
        $userStmt->execute([$id, $email, $phone, $fullName, $language]);
        $userId = (int)$pdo->lastInsertId();

        $profileStmt = $pdo->prepare('INSERT INTO freelancer_profiles (user_id, role_interest, current_rank, city, state, preferred_language, onboarding_status) VALUES (?, ?, \'trainee\', ?, ?, ?, \'submitted\')');
        $profileStmt->execute([$userId, $role, $city, $state, $language]);

        $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE role_key = \'trainee\' LIMIT 1');
        $roleStmt->execute();
        $traineeRoleId = $roleStmt->fetchColumn();
        if ($traineeRoleId !== false) {
            $assignRole = $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
            $assignRole->execute([$userId, (int)$traineeRoleId]);
        }

        recordConsent($pdo, $userId, 'user', $id, $data);
        $audit = $pdo->prepare('INSERT INTO audit_events (event_id, actor_user_id, action, entity_type, entity_public_id, details) VALUES (?, ?, ?, ?, ?, ?)');
        $audit->execute([publicId(), $userId, 'freelancer_registration_submitted', 'user', $id, json_encode(['city' => $city, 'roleInterest' => $role], JSON_UNESCAPED_UNICODE)]);
        $pdo->commit();

        respond(201, ['ok' => true, 'data' => ['id' => $id, 'status' => 'submitted', 'message' => 'Your registration has been received.']]);
    }

    respond(404, ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Endpoint not found.']]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ($e->getCode() === '23000') {
        respond(409, ['ok' => false, 'error' => ['code' => 'DUPLICATE_OR_CONFLICT', 'message' => 'A record with those details may already exist.']]);
    }
    error_log('We Onboard API database operation failed: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'The request could not be completed.']]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('We Onboard API request failed: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'The request could not be completed.']]);
}
