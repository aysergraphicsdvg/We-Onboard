<?php
/**
 * We Onboard Secure Database Installer
 * Designed for CLI execution or tightly guarded non-production setup.
 * Web-based execution is disabled by default in production.
 */
session_start();

$lock_file = __DIR__ . '/config/install.lock';

// 1. Strict Permanent Lock Check
if (file_exists($lock_file)) {
    if (php_sapi_name() === 'cli') {
        echo "LOCKED: The system is already installed (config/install.lock exists).\n";
        exit(0);
    }
    http_response_code(403);
    die("<h2>Installation Locked</h2><p>The system is already installed and permanently locked for security.</p><p><a href='/admin/login.php'>Go to Admin Login &rarr;</a></p>");
}

// 2. Check Execution Mode & Web Installer Authorization
$isCli = (php_sapi_name() === 'cli');

require_once __DIR__ . '/config/config.php';

if (!$isCli) {
    // If running in browser: Verify that web installer is explicitly enabled for non-production
    if (!defined('ALLOW_WEB_INSTALL') || !ALLOW_WEB_INSTALL) {
        http_response_code(403);
        die("<!DOCTYPE html><html><head><title>Access Denied</title></head><body style='font-family:sans-serif;padding:40px;line-height:1.6;'><h2 style='color:#b91c1c;'>Web Installation Disabled</h2><p>For security, web-based installation is disabled in production. Please run the installer via SSH / CLI:</p><pre style='background:#f1f5f9;padding:12px;border-radius:6px;'>php scripts/install.php</pre><p>Or provision an administrator via:</p><pre style='background:#f1f5f9;padding:12px;border-radius:6px;'>php scripts/create_super_admin.php \"Admin Name\" \"admin@weonboard.in\" \"StrongPassword\"</pre></body></html>");
    }

    // Require one-time install authorization token via GET parameter ?key=...
    $requiredKey = getenv('INSTALL_KEY') ?: 'setup-authorized-token';
    $providedKey = $_GET['key'] ?? ($_POST['install_key'] ?? '');
    if (empty($providedKey) || !hash_equals($requiredKey, $providedKey)) {
        http_response_code(403);
        die("<!DOCTYPE html><html><head><title>Installer Authorization Required</title></head><body style='font-family:sans-serif;padding:40px;'><h2 style='color:#b91c1c;'>Installer Authorization Required</h2><p>Provide the authorization key via <code>?key=...</code> to access this temporary non-production installer.</p></body></html>");
    }

    // Ensure CSRF token for web installer
    if (empty($_SESSION['installer_csrf'])) {
        $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
    }
}

// 3. CLI Automated Execution Mode
if ($isCli) {
    echo "========================================================\n";
    echo "WE ONBOARD CLI INSTALLER\n";
    echo "========================================================\n";

    $host = getenv('DB_HOST') ?: (defined('DB_HOST') && DB_HOST ? DB_HOST : 'localhost');
    $name = getenv('DB_NAME') ?: (defined('DB_NAME') && DB_NAME ? DB_NAME : '');
    $user = getenv('DB_USER') ?: (defined('DB_USER') && DB_USER ? DB_USER : '');
    $pass = getenv('DB_PASS') ?: (defined('DB_PASS') && DB_PASS ? DB_PASS : '');

    if (empty($name) || empty($user)) {
        echo "Enter Database Name: ";
        $name = trim(fgets(STDIN));
        echo "Enter Database Username: ";
        $user = trim(fgets(STDIN));
        echo "Enter Database Password: ";
        $pass = trim(fgets(STDIN));
    }

    try {
        $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        echo "1. Applying schema.sql...\n";
        $schema_sql = file_get_contents(__DIR__ . '/database/schema.sql');
        $pdo->exec($schema_sql);

        echo "2. Seeding default roles and settings...\n";
        $pdo->exec("INSERT IGNORE INTO roles (id, name, description) VALUES 
            (1, 'Super Admin', 'Full system access'),
            (2, 'Administrator', 'Standard operations access'),
            (3, 'Enquiry Manager', 'Manage and assign enquiries'),
            (4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
            (5, 'Project Manager', 'Manage field projects and tasks')");

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

        file_put_contents($lock_file, date('Y-m-d H:i:s') . " - Installed successfully via CLI\n");
        echo "SUCCESS: Database installed and locked. Run scripts/create_super_admin.php to create your Super Admin.\n";
        exit(0);
    } catch (Exception $e) {
        error_log("[CLI Installer Error] " . $e->getMessage());
        echo "ERROR: Database installation failed. Diagnostic logged privately.\n";
        exit(1);
    }
}

// 4. Guarded Non-Production Web Execution Mode
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['installer_csrf'] ?? '', $csrf)) {
        http_response_code(403);
        $error = 'CSRF validation failed. Please refresh the page.';
    } else {
        $db_host = trim($_POST['db_host'] ?? 'localhost');
        $db_name = trim($_POST['db_name'] ?? '');
        $db_user = trim($_POST['db_user'] ?? '');
        $db_pass = trim($_POST['db_pass'] ?? '');

        $admin_name = trim($_POST['admin_name'] ?? '');
        $admin_email = trim($_POST['admin_email'] ?? '');
        $admin_pass = trim($_POST['admin_pass'] ?? '');

        if (empty($db_name) || empty($db_user) || empty($admin_email) || strlen($admin_pass) < 12) {
            $error = 'Please fill all required fields. Administrator password must be at least 12 characters.';
        } elseif (!filter_var($admin_email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Please provide a valid administrator email address.';
        } else {
            try {
                $dsn = "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4";
                $pdo = new PDO($dsn, $db_user, $db_pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);

                // Apply base schema
                $schema_sql = file_get_contents(__DIR__ . '/database/schema.sql');
                $pdo->exec($schema_sql);

                // Seed Roles
                $pdo->exec("INSERT IGNORE INTO roles (id, name, description) VALUES 
                    (1, 'Super Admin', 'Full system access'),
                    (2, 'Administrator', 'Standard operations access'),
                    (3, 'Enquiry Manager', 'Manage and assign enquiries'),
                    (4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
                    (5, 'Project Manager', 'Manage field projects and tasks')");

                // CRITICAL SECURITY: Never allow resetting an existing administrator password via installer
                $checkAdmin = $pdo->prepare("SELECT id FROM admin_users WHERE email = ? LIMIT 1");
                $checkAdmin->execute([$admin_email]);
                if ($checkAdmin->fetch()) {
                    throw new RuntimeException("An administrator with this email already exists. Overwriting existing administrator passwords via the web installer is strictly prohibited.");
                }

                // Provision new Super Admin
                $hashed_pass = password_hash($admin_pass, PASSWORD_BCRYPT, ['cost' => 12]);
                $stmt = $pdo->prepare("INSERT INTO admin_users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, 1, 1)");
                $stmt->execute([$admin_name, $admin_email, $hashed_pass]);

                // Seed default settings
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

                // Write permanent lock file
                file_put_contents($lock_file, date('Y-m-d H:i:s') . " - Installed successfully by " . $admin_email . " [Remote IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "]\n");

                $success = "We Onboard installed successfully! The installer has been permanently locked.";
            } catch (Exception $e) {
                // Log detailed error privately; return generic safe message to user
                error_log("[Web Installer Error] " . $e->getMessage());
                if ($e instanceof RuntimeException && strpos($e->getMessage(), 'administrator with this email already exists') !== false) {
                    $error = $e->getMessage();
                } else {
                    $error = "Installation failed due to a database or configuration error. Please verify credentials and check the server error logs.";
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>We Onboard &mdash; Guarded Non-Production Installer</title>
    <style>
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #02167F; color: #1e293b; margin: 0; padding: 40px 20px; }
        .box { max-width: 580px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
        h1 { color: #02167F; margin-top: 0; font-size: 24px; }
        .alert-error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .alert-success { background: #dcfce7; color: #166534; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        label { display: block; font-weight: 600; font-size: 13px; margin: 12px 0 6px; }
        input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
        .btn { display: block; width: 100%; background: #FFD014; color: #02167F; font-weight: 700; border: none; padding: 14px; border-radius: 8px; font-size: 15px; cursor: pointer; margin-top: 24px; }
        .btn:hover { background: #e6bc0f; }
        .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h1 style="margin:0;">We Onboard Installer</h1>
            <span class="badge">Non-Production</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">One-time guarded setup of MySQL database and initial Super Administrator account.</p>

        <?php if ($error): ?>
            <div class="alert-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="alert-success">
                <strong>Congratulations!</strong> <?= htmlspecialchars($success) ?>
                <div style="margin-top: 14px;">
                    <a href="/admin/login.php" style="color: #02167F; font-weight: bold; text-decoration: underline;">Open Admin Login &rarr;</a>
                </div>
            </div>
        <?php else: ?>
            <form method="POST">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['installer_csrf'] ?? '') ?>">
                <input type="hidden" name="install_key" value="<?= htmlspecialchars($providedKey ?? '') ?>">

                <h3 style="color: #02167F; font-size: 16px; margin-top: 18px;">1. MySQL Database Details</h3>
                <label>Database Host</label>
                <input type="text" name="db_host" value="localhost" required>

                <label>Database Name</label>
                <input type="text" name="db_name" placeholder="Database Name" required>

                <label>Database Username</label>
                <input type="text" name="db_user" placeholder="Database Username" required>

                <label>Database Password</label>
                <input type="password" name="db_pass" placeholder="Database Password">

                <h3 style="color: #02167F; font-size: 16px; margin-top: 24px;">2. Super Admin Credentials</h3>
                <label>Full Name</label>
                <input type="text" name="admin_name" placeholder="Administrator Name" required>

                <label>Admin Email</label>
                <input type="email" name="admin_email" placeholder="admin@weonboard.in" required>

                <label>Admin Password (min. 12 characters)</label>
                <input type="password" name="admin_pass" minlength="12" required>

                <button type="submit" class="btn">Run Installation & Lock System &rarr;</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
