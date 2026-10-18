<?php
/**
 * We Onboard CLI Installer
 * Safe command-line database initialization and role seeding.
 *
 * Usage:
 *   php scripts/install.php
 *   php scripts/install.php --host=localhost --db=weonboard --user=weonboard_admin
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("Access Denied: scripts/install.php must be executed via CLI only.\n");
}

$lockFile = dirname(__DIR__) . '/config/install.lock';
if (file_exists($lockFile)) {
    echo "LOCKED: The system is already installed and locked ({$lockFile} exists).\n";
    echo "If you need to re-run, manually remove the lock file after taking a verified database backup.\n";
    exit(0);
}

require_once dirname(__DIR__) . '/config/config.php';

echo "========================================================\n";
echo "WE ONBOARD CLI DATABASE INSTALLER\n";
echo "========================================================\n";

$host = defined('DB_HOST') && DB_HOST ? DB_HOST : 'localhost';
$name = defined('DB_NAME') && DB_NAME ? DB_NAME : '';
$user = defined('DB_USER') && DB_USER ? DB_USER : '';
$pass = defined('DB_PASS') && DB_PASS ? DB_PASS : '';

if (empty($name) || empty($user) || $pass === '') {
    echo "Database credentials not fully set in config. Prompting:\n";
    if (empty($name)) {
        echo "Database Name: ";
        $name = trim(fgets(STDIN));
    }
    if (empty($user)) {
        echo "Database Username: ";
        $user = trim(fgets(STDIN));
    }
    if ($pass === '') {
        echo "Database Password: ";
        $pass = trim(fgets(STDIN));
    }
}

try {
    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "1. Applying database/schema.sql...\n";
    $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
    $pdo->exec($schema);

    echo "2. Seeding default roles...\n";
    $pdo->exec("INSERT IGNORE INTO roles (id, name, description) VALUES 
        (1, 'Super Admin', 'Full system access'),
        (2, 'Administrator', 'Standard operations access'),
        (3, 'Enquiry Manager', 'Manage and assign enquiries'),
        (4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
        (5, 'Project Manager', 'Manage field projects and tasks')");

    echo "3. Seeding default site settings...\n";
    $defaultSettings = [
        'companyName' => 'We Onboard',
        'tagline' => 'Your ground engine for growth',
        'phone' => '+91 96111 09490',
        'whatsapp' => '919611109490',
        'email' => 'mail@weonboard.in',
        'address' => 'Indiranagar, Bangalore, Karnataka 560038',
        'headerLogoUrl' => '',
        'footerLogoUrl' => ''
    ];
    foreach ($defaultSettings as $k => $v) {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute([$k, $v]);
    }

    file_put_contents($lockFile, date('Y-m-d H:i:s') . " - Installed successfully via CLI installer\n");
    echo "SUCCESS: Database initialized and locked.\n";
    echo "Next: Provision your initial administrator by running:\n";
    echo "  php scripts/create_super_admin.php \"Your Name\" \"admin@weonboard.in\" \"YourStrongPassword\"\n";
    exit(0);
} catch (Exception $e) {
    error_log("[CLI Installer Error] " . $e->getMessage());
    echo "ERROR: Installation failed: " . $e->getMessage() . "\n";
    exit(1);
}
