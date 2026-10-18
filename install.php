<?php
/**
 * We Onboard Secure Web Installer
 * Runs once to initialize MySQL database and create the Super Admin account.
 */
session_start();

$lock_file = __DIR__ . '/config/install.lock';

if (file_exists($lock_file)) {
    die("<h2>Installation Completed</h2><p>The system is already installed and locked for security. To re-run, remove <code>config/install.lock</code>.</p><p><a href='/admin/login.php'>Go to Admin Login &rarr;</a></p>");
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $db_host = trim($_POST['db_host'] ?? 'localhost');
    $db_name = trim($_POST['db_name'] ?? '');
    $db_user = trim($_POST['db_user'] ?? '');
    $db_pass = trim($_POST['db_pass'] ?? '');

    $admin_name = trim($_POST['admin_name'] ?? 'Muhammad Ali Shoaib');
    $admin_email = trim($_POST['admin_email'] ?? 'admin@weonboard.in');
    $admin_pass = trim($_POST['admin_pass'] ?? '');

    if (empty($db_name) || empty($db_user) || empty($admin_email) || strlen($admin_pass) < 8) {
        $error = 'Please fill all required fields. Password must be at least 8 characters.';
    } else {
        try {
            $dsn = "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4";
            $pdo = new PDO($dsn, $db_user, $db_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);

            // Execute schema
            $schema_sql = file_get_contents(__DIR__ . '/database/schema.sql');
            $pdo->exec($schema_sql);

            // Seed Roles
            $pdo->exec("INSERT IGNORE INTO roles (id, name, description) VALUES 
                (1, 'Super Admin', 'Full system access'),
                (2, 'Administrator', 'Standard operations access'),
                (3, 'Enquiry Manager', 'Manage and assign enquiries'),
                (4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
                (5, 'Project Manager', 'Manage field projects and tasks')");

            // Seed Super Admin
            $hashed_pass = password_hash($admin_pass, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("INSERT INTO admin_users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, 1, 1) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)");
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

            // Write lock file
            file_put_contents($lock_file, date('Y-m-d H:i:s') . " - Installed successfully by " . $admin_email);

            $success = "We Onboard installed successfully! You can now log into your Admin Panel.";
        } catch (Exception $e) {
            $error = "Installation Error: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>We Onboard &mdash; Database Installer</title>
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
    </style>
</head>
<body>
    <div class="box">
        <h1>We Onboard Installer</h1>
        <p style="color: #64748b; font-size: 14px;">Setup MySQL database and create the initial Super Administrator account.</p>

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
                <h3 style="color: #02167F; font-size: 16px; margin-top: 18px;">1. MySQL Database Details (Hostinger hPanel)</h3>
                <label>Database Host</label>
                <input type="text" name="db_host" value="localhost" required>

                <label>Database Name</label>
                <input type="text" name="db_name" placeholder="e.g. u123456789_weonboard" required>

                <label>Database Username</label>
                <input type="text" name="db_user" placeholder="e.g. u123456789_admin" required>

                <label>Database Password</label>
                <input type="password" name="db_pass" placeholder="Your database password">

                <h3 style="color: #02167F; font-size: 16px; margin-top: 24px;">2. Super Admin Credentials</h3>
                <label>Full Name</label>
                <input type="text" name="admin_name" value="Muhammad Ali Shoaib" required>

                <label>Admin Email</label>
                <input type="email" name="admin_email" value="admin@weonboard.in" required>

                <label>Admin Password (min. 8 characters)</label>
                <input type="password" name="admin_pass" required>

                <button type="submit" class="btn">Run Installation & Secure System &rarr;</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
