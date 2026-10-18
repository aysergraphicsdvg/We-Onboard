<?php
/**
 * Safe First-Super-Admin Provisioning CLI Tool
 * We Onboard Platform
 *
 * Usage via CLI:
 *   php scripts/create_super_admin.php "Full Name" "admin@weonboard.in" "StrongPassword123"
 *   php scripts/create_super_admin.php "Full Name" "admin@weonboard.in" "NewStrongPassword123" --force
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("Access Denied: This script must be executed via CLI only for security.\n");
}

require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

$name = $argv[1] ?? null;
$email = $argv[2] ?? null;
$pass = $argv[3] ?? null;
$force = in_array('--force', $argv, true) || in_array('-f', $argv, true);

if (empty($name)) {
    echo "Enter Admin Full Name: ";
    $name = trim(fgets(STDIN));
}

if (empty($email)) {
    echo "Enter Admin Email: ";
    $email = trim(fgets(STDIN));
}

if (empty($pass)) {
    echo "Enter Strong Password (min 12 chars): ";
    $pass = trim(fgets(STDIN));
}

if (strlen($pass) < 12) {
    die("Error: Super Administrator password must be at least 12 characters long for security.\n");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Error: Invalid email format.\n");
}

try {
    $db = Database::getConnection();

    // Ensure Super Admin role exists
    $roleCheck = $db->query("SELECT id FROM roles WHERE id = 1")->fetch();
    if (!$roleCheck) {
        $db->exec("INSERT INTO roles (id, name, description) VALUES (1, 'Super Admin', 'Full access to all platform records, settings, and team users')");
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $db->prepare("SELECT id, name FROM admin_users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        if (!$force) {
            echo "NOTICE: An administrator account with email [{$email}] already exists (User ID: {$existing['id']}).\n";
            echo "To confirm password reset, type 'CONFIRM': ";
            $confirm = trim(fgets(STDIN));
            if ($confirm !== 'CONFIRM') {
                die("Aborted: Password reset cancelled. Existing credentials were NOT modified.\n");
            }
        }

        $update = $db->prepare("UPDATE admin_users SET name = ?, password_hash = ?, role_id = 1, is_active = 1, updated_at = NOW() WHERE id = ?");
        $update->execute([$name, $hash, $existing['id']]);
        echo "SUCCESS: Super Admin account [{$email}] successfully updated and secured.\n";

        // Audit log
        $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES ('CLI Provisioner', 'Super Admin Password Reset', 'User', ?, 'Password reset via confirmed CLI tool', '127.0.0.1')");
        $audit->execute([$email]);
    } else {
        $insert = $db->prepare("INSERT INTO admin_users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, 1, 1)");
        $insert->execute([$name, $email, $hash]);
        $newId = $db->lastInsertId();
        echo "SUCCESS: Super Admin account [{$email}] successfully created with ID: {$newId}\n";

        // Audit log
        $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES ('CLI Provisioner', 'Super Admin Provisioned', 'User', ?, 'Account provisioned via secure CLI tool', '127.0.0.1')");
        $audit->execute([$email]);
    }

} catch (Exception $e) {
    error_log("[CLI Admin Provisioner Error] " . $e->getMessage());
    echo "Error provisioning Super Admin. Please check database connectivity and server logs.\n";
    exit(1);
}
