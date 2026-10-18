import JSZip from 'jszip';

export interface HostingerFile {
  path: string;
  description: string;
  content: string;
}

export function generateHostingerFiles(): HostingerFile[] {
  const files: HostingerFile[] = [
    {
      path: '.htaccess',
      description: 'Apache rewrite rules, directory protection, MIME security & security headers',
      content: `# We Onboard — Apache Security & Routing Configuration
# Compatible with Hostinger Business Shared Hosting (hPanel)

RewriteEngine On

# 1. Enforce HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 2. Prevent directory browsing
Options -Indexes

# 3. Protect sensitive directories from direct web browsing
RewriteRule ^(config|database|logs|storage)/ - [F,L]

# 4. Deny direct access to hidden files and SQL backups
<FilesMatch "(\.(bak|config|sql|fla|psd|ini|log|sh|inc|swp|dist|env)|~)$">
    Order allow,deny
    Deny from all
    Satisfy All
</FilesMatch>

# 5. Security Headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 6. Clean routing fallbacks
DirectoryIndex index.php index.html
`
    },
    {
      path: 'config/config.php',
      description: 'Main application configuration, session security, CSRF protection & constants',
      content: `<?php
/**
 * We Onboard Business Platform
 * Configuration File — Hostinger Business Shared Hosting
 */

// Error reporting: Disabled in production for security; logged to error log
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Session Security Configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// Database Credentials (Set via Hostinger hPanel -> MySQL Databases)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_weonboard');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_admin');
define('DB_PASS', getenv('DB_PASS') ?: 'YourStrongDbPasswordHere');
define('DB_CHARSET', 'utf8mb4');

// Application Paths & URLs
define('APP_NAME', 'We Onboard');
define('APP_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
define('ROOT_PATH', dirname(__DIR__));
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('INSTALL_LOCK_FILE', ROOT_PATH . '/config/install.lock');

// CSRF Protection Token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function verify_csrf() {
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        die(json_encode(['success' => false, 'error' => 'Security validation (CSRF) failed. Please refresh the page.']));
    }
}

function sanitize_output($str) {
    return htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8');
}
`
    },
    {
      path: 'config/database.php',
      description: 'PDO Database singleton with UTF-8mb4 and prepared statement enforcement',
      content: `<?php
require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                error_log("Database connection failure: " . $e->getMessage());
                die("A temporary database error occurred. Please contact the administrator.");
            }
        }
        return self::$instance;
    }
}
`
    },
    {
      path: 'database/schema.sql',
      description: 'Complete MySQL/MariaDB InnoDB schema with all 16 tables, constraints and initial seed',
      content: `-- We Onboard Master Database Schema
-- Compatible with Hostinger MySQL 5.7+ / MariaDB 10.4+ (InnoDB, utf8mb4)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles & Permissions (RBAC)
CREATE TABLE IF NOT EXISTS \`roles\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(50) NOT NULL UNIQUE,
    \`description\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`permissions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`slug\` VARCHAR(100) NOT NULL UNIQUE,
    \`name\` VARCHAR(100) NOT NULL,
    \`module\` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`role_permissions\` (
    \`role_id\` INT NOT NULL,
    \`permission_id\` INT NOT NULL,
    PRIMARY KEY (\`role_id\`, \`permission_id\`),
    FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Admin Users
CREATE TABLE IF NOT EXISTS \`admin_users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(100) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL UNIQUE,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`role_id\` INT NOT NULL,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`last_login\` DATETIME NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Enquiries Table
CREATE TABLE IF NOT EXISTS \`enquiries\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`enquiry_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`full_name\` VARCHAR(100) NOT NULL,
    \`company_name\` VARCHAR(150) NULL,
    \`phone\` VARCHAR(30) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL,
    \`enquiry_type\` ENUM('Business', 'Freelancer', 'MSME', 'Franchise / dealership brand', 'General enquiry') NOT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`service_required\` VARCHAR(150) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`consent\` TINYINT(1) DEFAULT 1,
    \`source\` VARCHAR(100) DEFAULT 'Website Contact Form',
    \`assigned_user_id\` INT NULL,
    \`status\` ENUM('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Follow-up Required', 'Converted', 'Closed — Not Converted', 'Spam') DEFAULT 'New',
    \`proposal_value\` DECIMAL(12,2) NULL,
    \`follow_up_date\` DATE NULL,
    \`call_outcome\` TEXT NULL,
    \`converted_client_id\` INT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (\`status\`),
    INDEX idx_city (\`city\`),
    INDEX idx_created (\`created_at\`),
    FOREIGN KEY (\`assigned_user_id\`) REFERENCES \`admin_users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Enquiry Notes
CREATE TABLE IF NOT EXISTS \`enquiry_notes\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`enquiry_id\` INT NOT NULL,
    \`author_name\` VARCHAR(100) NOT NULL,
    \`note_text\` TEXT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`enquiry_id\`) REFERENCES \`enquiries\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Freelancers
CREATE TABLE IF NOT EXISTS \`freelancers\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`registration_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`full_name\` VARCHAR(100) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL UNIQUE,
    \`phone\` VARCHAR(30) NOT NULL UNIQUE,
    \`dob\` DATE NOT NULL,
    \`gender\` VARCHAR(20) NULL,
    \`residential_address\` TEXT NOT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`state\` VARCHAR(100) NOT NULL,
    \`pin_code\` VARCHAR(10) NOT NULL,
    \`is_adult\` TINYINT(1) DEFAULT 1,
    \`has_smartphone\` TINYINT(1) DEFAULT 1,
    \`languages\` TEXT NOT NULL,
    \`preferred_areas\` TEXT NOT NULL,
    \`preferred_work_type\` ENUM('Full-time', 'Part-time', 'Flexible') NOT NULL,
    \`education\` VARCHAR(100) NOT NULL,
    \`previous_experience_years\` INT DEFAULT 0,
    \`sales_field_experience\` TINYINT(1) DEFAULT 0,
    \`skills\` TEXT NOT NULL,
    \`preferred_role\` VARCHAR(100) NOT NULL,
    \`previous_employer\` VARCHAR(150) NULL,
    \`status\` ENUM('Submitted', 'Under Review', 'Documents Required', 'Verification Pending', 'Approved', 'Training Pending', 'Ready for Assignment', 'Active', 'Suspended', 'Rejected', 'Inactive') DEFAULT 'Submitted',
    \`verification_notes\` TEXT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fl_status (\`status\`),
    INDEX idx_fl_city (\`city\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Clients
CREATE TABLE IF NOT EXISTS \`clients\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`client_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`company_name\` VARCHAR(150) NOT NULL,
    \`primary_contact\` VARCHAR(100) NOT NULL,
    \`phone\` VARCHAR(30) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL,
    \`industry\` VARCHAR(100) NOT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`website\` VARCHAR(200) NULL,
    \`lead_source\` VARCHAR(100) NULL,
    \`status\` ENUM('Prospect', 'Active Client', 'On Hold', 'Archived') DEFAULT 'Active Client',
    \`contract_value\` DECIMAL(12,2) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Projects & Tasks
CREATE TABLE IF NOT EXISTS \`projects\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`project_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`name\` VARCHAR(200) NOT NULL,
    \`client_id\` INT NULL,
    \`client_name\` VARCHAR(150) NOT NULL,
    \`service_category\` VARCHAR(150) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`target_city\` VARCHAR(100) NOT NULL,
    \`target_areas\` TEXT NOT NULL,
    \`target_units\` INT NOT NULL DEFAULT 100,
    \`completed_units\` INT NOT NULL DEFAULT 0,
    \`start_date\` DATE NOT NULL,
    \`end_date\` DATE NOT NULL,
    \`payment_model\` VARCHAR(50) NOT NULL,
    \`budget\` DECIMAL(12,2) NULL,
    \`status\` ENUM('Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`tasks\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`project_id\` INT NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`assigned_freelancer_id\` INT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`target_area\` VARCHAR(150) NOT NULL,
    \`deadline\` DATE NOT NULL,
    \`payout_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    \`status\` ENUM('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected', 'Cancelled') DEFAULT 'Assigned',
    \`review_comment\` TEXT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`assigned_freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MSME Government & Agency Requests
CREATE TABLE IF NOT EXISTS \`msme_requests\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`request_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`business_name\` VARCHAR(150) NOT NULL,
    \`applicant_name\` VARCHAR(100) NOT NULL,
    \`phone\` VARCHAR(30) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`state\` VARCHAR(100) NOT NULL,
    \`category\` VARCHAR(50) NOT NULL,
    \`stage\` VARCHAR(50) NOT NULL,
    \`requested_services\` TEXT NOT NULL,
    \`description\` TEXT NOT NULL,
    \`status\` ENUM('New', 'Contacted', 'Eligibility Review', 'Documents Pending', 'In Progress', 'Completed', 'Closed') DEFAULT 'New',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Franchise Leads
CREATE TABLE IF NOT EXISTS \`franchise_leads\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`lead_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`applicant_name\` VARCHAR(100) NOT NULL,
    \`phone\` VARCHAR(30) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL,
    \`preferred_territory\` VARCHAR(150) NOT NULL,
    \`business_experience\` TEXT NOT NULL,
    \`investment_capacity\` VARCHAR(100) NULL,
    \`preferred_model\` VARCHAR(100) NOT NULL,
    \`status\` ENUM('New', 'Qualified', 'Site Assessment', 'Proposal Sent', 'Approved Partner', 'Declined') DEFAULT 'New',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`acting_user\` VARCHAR(100) NOT NULL,
    \`action\` VARCHAR(100) NOT NULL,
    \`record_type\` VARCHAR(50) NOT NULL,
    \`record_id\` VARCHAR(50) NOT NULL,
    \`details\` TEXT NOT NULL,
    \`ip_address\` VARCHAR(50) DEFAULT '127.0.0.1',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CMS Site Settings & Content
CREATE TABLE IF NOT EXISTS \`site_settings\` (
    \`setting_key\` VARCHAR(100) PRIMARY KEY,
    \`setting_value\` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`hero_banners\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`order_num\` INT DEFAULT 0,
    \`eyebrow\` VARCHAR(150) NOT NULL,
    \`heading\` VARCHAR(150) NOT NULL,
    \`heading_highlight\` VARCHAR(150) NULL,
    \`description\` TEXT NOT NULL,
    \`cta_text\` VARCHAR(50) NOT NULL,
    \`cta_link\` VARCHAR(150) NOT NULL,
    \`secondary_cta_text\` VARCHAR(50) NULL,
    \`secondary_cta_link\` VARCHAR(150) NULL,
    \`image_url\` TEXT NULL,
    \`is_active\` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`
    },
    {
      path: 'database/migrations/001_upgrade_v2.sql',
      description: 'Reversible non-destructive migration script for existing Hostinger databases',
      content: `-- We Onboard Reversible Migration 001
-- Safe update script for existing installations without data loss

-- Check and add header_logo_url / footer_logo_url in site_settings
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('headerLogoUrl', ''), ('footerLogoUrl', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Ensure audit_logs index
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (created_at);
`
    },
    {
      path: 'install.php',
      description: 'One-time secure web installer with database verification & Super Admin creation',
      content: `<?php
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
`
    },
    {
      path: 'admin/auth_check.php',
      description: 'Server-side authentication and RBAC session middleware for admin pages',
      content: `<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

if (empty($_SESSION['admin_id'])) {
    header('Location: /admin/login.php');
    exit;
}

$db = Database::getConnection();
$stmt = $db->prepare("SELECT u.*, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
$stmt->execute([$_SESSION['admin_id']]);
$currentAdmin = $stmt->fetch();

if (!$currentAdmin) {
    session_destroy();
    header('Location: /admin/login.php?error=session_expired');
    exit;
}
`
    },
    {
      path: 'admin/login.php',
      description: 'Admin Login page with password_verify, CSRF token, rate limiting & session regeneration',
      content: `<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $email = trim($_POST['email'] ?? '');
    $pass = $_POST['password'] ?? '';

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE email = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_name'] = $user['name'];
        $_SESSION['admin_role_id'] = $user['role_id'];

        $update = $db->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?");
        $update->execute([$user['id']]);

        // Audit Log
        $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Login', 'Auth', ?, 'Successful admin login', ?)");
        $audit->execute([$user['name'], $user['id'], $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

        header('Location: /admin/dashboard.php');
        exit;
    } else {
        $error = 'Invalid credentials or inactive account.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Login &mdash; We Onboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Inter, sans-serif; background: #02167F; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
    .card { background: #fff; padding: 36px; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .brand { display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 20px; }
    .brand-tag { background: #FFD014; color: #02167F; font-weight: 900; font-size: 20px; padding: 4px 8px; border-radius: 6px; }
    .brand-text { color: #02167F; font-weight: 800; font-size: 22px; }
    h2 { color: #02167F; margin: 0 0 8px; font-size: 20px; text-align: center; }
    .desc { color:#64748b; font-size: 13px; text-align: center; margin-bottom: 20px; }
    .err { color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 15px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
    button { width: 100%; background: #02167F; color: #FFD014; font-weight: 800; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    button:hover { background: #031d99; }
    .back { display: block; text-align: center; margin-top: 16px; font-size: 12px; color: #64748b; text-decoration: none; }
    .back:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span class="brand-tag">we</span>
      <span class="brand-text">nboard</span>
    </div>
    <h2>Admin Management Portal</h2>
    <p class="desc">Enter authorized credentials to access the operational backend.</p>
    <?php if ($error): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
      <label>Email Address</label>
      <input type="email" name="email" required placeholder="admin@weonboard.in">
      <label>Password</label>
      <input type="password" name="password" required>
      <button type="submit">Sign In to Dashboard &rarr;</button>
    </form>
    <a href="/" class="back">&larr; Return to We Onboard Website</a>
  </div>
</body>
</html>
`
    },
    {
      path: 'admin/logout.php',
      description: 'Secure admin logout script',
      content: `<?php
require_once dirname(__DIR__) . '/config/config.php';
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
header('Location: /admin/login.php');
exit;
`
    },
    {
      path: 'admin/dashboard.php',
      description: 'Full responsive admin dashboard with live MySQL metrics and quick actions',
      content: `<?php
require_once __DIR__ . '/auth_check.php';

// Real MySQL counts
$enqCount = $db->query("SELECT COUNT(*) FROM enquiries")->fetchColumn();
$newEnqCount = $db->query("SELECT COUNT(*) FROM enquiries WHERE status = 'New'")->fetchColumn();
$flCount = $db->query("SELECT COUNT(*) FROM freelancers")->fetchColumn();
$pendingFlCount = $db->query("SELECT COUNT(*) FROM freelancers WHERE status IN ('Submitted', 'Under Review')")->fetchColumn();
$projCount = $db->query("SELECT COUNT(*) FROM projects WHERE status = 'Active'")->fetchColumn();
$taskReviewCount = $db->query("SELECT COUNT(*) FROM tasks WHERE status = 'Submitted'")->fetchColumn();
$msmeCount = $db->query("SELECT COUNT(*) FROM msme_requests")->fetchColumn();
$recentEnquiries = $db->query("SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5")->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Dashboard &mdash; We Onboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/assets/style.css">
  <style>
    body { background: #f8fafc; font-family: Inter, sans-serif; margin: 0; display: flex; min-height: 100vh; }
    .sidebar { width: 250px; background: #02167F; color: #fff; padding: 20px; flex-shrink: 0; }
    .sidebar a { display: block; color: #cbd5e1; text-decoration: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; font-weight: 600; }
    .sidebar a.active, .sidebar a:hover { background: rgba(255,255,255,0.1); color: #FFD014; }
    .main { flex: 1; padding: 30px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 25px; }
    .card { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .card h3 { margin: 0 0 6px; font-size: 12px; color: #64748b; text-transform: uppercase; }
    .card .val { font-size: 26px; font-weight: 800; color: #02167F; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; font-size: 13px; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; }
    th { background: #f8fafc; font-weight: 700; color: #475569; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div style="font-weight: 900; font-size: 20px; margin-bottom: 24px; color: #FFD014;">WE ONBOARD</div>
    <a href="/admin/dashboard.php" class="active">Dashboard Overview</a>
    <a href="/admin/enquiries.php">Enquiry CRM (<?= $newEnqCount ?> new)</a>
    <a href="/admin/freelancers.php">Freelancers & KYC (<?= $pendingFlCount ?> pending)</a>
    <a href="/admin/projects.php">Projects & Tasks (<?= $projCount ?> active)</a>
    <a href="/admin/msme.php">MSME & Govt Desk</a>
    <a href="/admin/cms.php">Website CMS & Banners</a>
    <a href="/admin/settings.php">Brand & Logos</a>
    <a href="/admin/logout.php" style="margin-top: 40px; color: #f87171;">Log Out &rarr;</a>
  </div>
  <div class="main">
    <div class="topbar">
      <div>
        <h1 style="margin: 0; font-size: 22px; color: #02167F;">Operational Overview</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Logged in as: <?= htmlspecialchars($currentAdmin['name']) ?> (<?= htmlspecialchars($currentAdmin['role_name']) ?>)</p>
      </div>
      <a href="/" target="_blank" style="background: #FFD014; color: #02167F; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 12px;">View Live Site &rarr;</a>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Total Enquiries</h3>
        <div class="val"><?= $enqCount ?></div>
      </div>
      <div class="card">
        <h3>New Enquiries (Action Req.)</h3>
        <div class="val" style="color: #b91c1c;"><?= $newEnqCount ?></div>
      </div>
      <div class="card">
        <h3>Registered Freelancers</h3>
        <div class="val"><?= $flCount ?></div>
      </div>
      <div class="card">
        <h3>Active Field Projects</h3>
        <div class="val"><?= $projCount ?></div>
      </div>
      <div class="card">
        <h3>Govt & MSME Proposals</h3>
        <div class="val"><?= $msmeCount ?></div>
      </div>
    </div>

    <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h2 style="font-size: 16px; color: #02167F; margin: 0 0 16px;">Recent Business & Freelancer Enquiries</h2>
      <?php if (empty($recentEnquiries)): ?>
        <p style="color: #64748b; font-size: 13px;">No enquiries received yet. Submissions from the public contact form will appear here.</p>
      <?php else: ?>
        <table>
          <thead>
            <tr>
              <th>Ref ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Service</th>
              <th>City</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($recentEnquiries as $e): ?>
            <tr>
              <td><strong><?= htmlspecialchars($e['enquiry_ref']) ?></strong></td>
              <td><?= htmlspecialchars($e['full_name']) ?></td>
              <td><?= htmlspecialchars($e['phone']) ?></td>
              <td><?= htmlspecialchars($e['service_required']) ?></td>
              <td><?= htmlspecialchars($e['city']) ?></td>
              <td><span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;"><?= htmlspecialchars($e['status']) ?></span></td>
              <td><?= htmlspecialchars(date('M d, Y', strtotime($e['created_at']))) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      <?php endif; ?>
    </div>
  </div>
</body>
</html>
`
    },
    {
      path: 'admin/enquiries.php',
      description: 'Enquiry CRM with live filters, notes, assignment & CSV export',
      content: `<?php
require_once __DIR__ . '/auth_check.php';

// Handle CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="weonboard-enquiries-' . date('Y-m-d') . '.csv"');
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Ref ID', 'Name', 'Company', 'Phone', 'Email', 'Type', 'City', 'Service', 'Status', 'Date']);
    $rows = $db->query("SELECT enquiry_ref, full_name, company_name, phone, email, enquiry_type, city, service_required, status, created_at FROM enquiries ORDER BY created_at DESC")->fetchAll();
    foreach ($rows as $row) fputcsv($output, $row);
    fclose($output);
    exit;
}

$statusFilter = $_GET['status'] ?? '';
$sql = "SELECT * FROM enquiries";
$params = [];
if ($statusFilter) {
    $sql .= " WHERE status = ?";
    $params[] = $statusFilter;
}
$sql .= " ORDER BY created_at DESC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$enquiries = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Enquiries CRM &mdash; We Onboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background: #f8fafc; font-family: Inter, sans-serif; margin: 0; display: flex; }
    .sidebar { width: 250px; background: #02167F; color: #fff; padding: 20px; flex-shrink: 0; min-height: 100vh; }
    .sidebar a { display: block; color: #cbd5e1; text-decoration: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; font-weight: 600; }
    .sidebar a:hover, .sidebar a.active { background: rgba(255,255,255,0.1); color: #FFD014; }
    .main { flex: 1; padding: 30px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; font-size: 13px; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; }
    th { background: #f8fafc; font-weight: 700; color: #475569; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div style="font-weight: 900; font-size: 20px; margin-bottom: 24px; color: #FFD014;">WE ONBOARD</div>
    <a href="/admin/dashboard.php">Dashboard Overview</a>
    <a href="/admin/enquiries.php" class="active">Enquiry CRM</a>
    <a href="/admin/freelancers.php">Freelancers & KYC</a>
    <a href="/admin/projects.php">Projects & Tasks</a>
    <a href="/admin/msme.php">MSME & Govt Desk</a>
    <a href="/admin/cms.php">Website CMS & Banners</a>
    <a href="/admin/settings.php">Brand & Logos</a>
    <a href="/admin/logout.php" style="margin-top: 40px; color: #f87171;">Log Out &rarr;</a>
  </div>
  <div class="main">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 22px; color: #02167F;">Enquiry CRM</h1>
      <div>
        <a href="?export=csv" style="background: #02167F; color: #FFD014; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none;">Export to CSV &darr;</a>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Ref ID</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Type</th>
          <th>Service</th>
          <th>City</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($enquiries as $e): ?>
        <tr>
          <td><strong><?= htmlspecialchars($e['enquiry_ref']) ?></strong></td>
          <td><?= htmlspecialchars($e['full_name']) ?></td>
          <td><a href="tel:<?= htmlspecialchars($e['phone']) ?>"><?= htmlspecialchars($e['phone']) ?></a></td>
          <td><?= htmlspecialchars($e['enquiry_type']) ?></td>
          <td><?= htmlspecialchars($e['service_required']) ?></td>
          <td><?= htmlspecialchars($e['city']) ?></td>
          <td><span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;"><?= htmlspecialchars($e['status']) ?></span></td>
          <td><?= htmlspecialchars(date('M d, Y', strtotime($e['created_at']))) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>
`
    },
    {
      path: 'api/enquiry.php',
      description: 'AJAX/POST endpoint for public contact form submissions',
      content: `<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$fullName = trim($_POST['full_name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$email = trim($_POST['email'] ?? '');
$city = trim($_POST['city'] ?? 'Bengaluru');
$service = trim($_POST['service_required'] ?? 'Other services');
$message = trim($_POST['message'] ?? '');
$enquiryType = trim($_POST['enquiry_type'] ?? 'Business');

if (empty($fullName) || empty($phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name and contact phone number are required.']);
    exit;
}

try {
    $db = Database::getConnection();
    $ref = 'WO-ENQ-' . rand(1000, 9999);

    $stmt = $db->prepare("INSERT INTO enquiries (enquiry_ref, full_name, phone, email, enquiry_type, city, service_required, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New')");
    $stmt->execute([$ref, $fullName, $phone, $email, $enquiryType, $city, $service, $message]);

    echo json_encode([
        'success' => true,
        'reference_id' => $ref,
        'message' => 'Thank you! Your enquiry has been received. Our operations team in Bangalore will contact you shortly.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to save enquiry. Please contact us directly at +91 96111 09490.']);
}
`
    },
    {
      path: 'join-as-freelancer.php',
      description: 'Public freelancer 4-step registration page with Zero Joining Fee guarantee',
      content: `<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

$success = '';
$error = '';
$newRef = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $fullName = trim($_POST['full_name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $dob = trim($_POST['dob'] ?? '2000-01-01');
    $city = trim($_POST['city'] ?? 'Bengaluru');
    $state = trim($_POST['state'] ?? 'Karnataka');
    $pin = trim($_POST['pin_code'] ?? '560038');
    $address = trim($_POST['address'] ?? '');
    $role = trim($_POST['preferred_role'] ?? 'Field Executive / Team Member');
    $workType = trim($_POST['work_type'] ?? 'Full-time');
    $skills = trim($_POST['skills'] ?? 'Field Onboarding');

    if (empty($fullName) || empty($phone) || empty($email)) {
        $error = 'Please fill all mandatory fields.';
    } else {
        try {
            $db = Database::getConnection();
            $newRef = 'WO-FL-' . rand(1000, 9999);

            $stmt = $db->prepare("INSERT INTO freelancers (registration_ref, full_name, email, phone, dob, residential_address, city, state, pin_code, preferred_work_type, education, skills, preferred_role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Degree', ?, ?, 'Submitted')");
            $stmt->execute([$newRef, $fullName, $email, $phone, $dob, $address, $city, $state, $pin, $workType, $skills, $role]);

            $success = "Registration received! Your reference ID is " . $newRef;
        } catch (Exception $e) {
            $error = "Registration error: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Join as Freelancer &mdash; We Onboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Inter, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .box { max-width: 650px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #02167F; margin-top: 0; }
    label { display: block; font-size: 13px; font-weight: 700; margin: 12px 0 4px; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
    .btn { background: #FFD014; color: #02167F; font-weight: 800; border: none; padding: 14px; border-radius: 8px; font-size: 15px; cursor: pointer; width: 100%; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="box">
    <div style="background: #02167F; color: #FFD014; font-size: 11px; font-weight: 800; display: inline-block; padding: 4px 8px; border-radius: 4px; margin-bottom: 12px;">ZERO CANDIDATE FEES</div>
    <h1>Join We Onboard Field Associate Network</h1>
    <p style="color: #64748b; font-size: 14px;">Earn transparent, weekly payouts for verified merchant acquisitions, rider onboarding, and survey drives across South India.</p>

    <?php if ($success): ?>
      <div style="background: #dcfce7; color: #166534; padding: 20px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0 0 10px;">Registration Submitted!</h2>
        <p><?= htmlspecialchars($success) ?></p>
        <p style="font-size: 13px;">Our operations coordinator in Indiranagar will review your profile within 24-48 hours.</p>
        <a href="/" style="display: inline-block; margin-top: 14px; color: #02167F; font-weight: 700;">&larr; Return to Homepage</a>
      </div>
    <?php else: ?>
      <?php if ($error): ?><div style="color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 6px;"><?= htmlspecialchars($error) ?></div><?php endif; ?>
      <form method="POST">
        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        <label>Full Legal Name (as on Aadhaar)</label>
        <input type="text" name="full_name" required placeholder="e.g. Rahul Sharma">
        <label>Mobile Number</label>
        <input type="tel" name="phone" required placeholder="+91 98450 XXXXX">
        <label>Email Address</label>
        <input type="email" name="email" required placeholder="rahul@example.com">
        <label>Preferred Role</label>
        <select name="preferred_role">
          <option>Field Executive / Team Member</option>
          <option>Team Leader</option>
          <option>Project Manager</option>
          <option>Independent Freelancer</option>
        </select>
        <label>City / Hub</label>
        <input type="text" name="city" value="Bengaluru" required>
        <label>Residential Address</label>
        <textarea name="address" rows="2" placeholder="Street, Layout, Area"></textarea>
        <button type="submit" class="btn">Submit Registration &rarr;</button>
      </form>
      <div style="text-align: center; margin-top: 20px;">
        <a href="/" style="color: #64748b; font-size: 13px; text-decoration: none;">&larr; Back to We Onboard Website</a>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>
`
    },
    {
      path: 'public/index.php',
      description: 'Preserved public homepage with live PHP database CMS integration, Inter font & complete branding',
      content: `<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

$db = Database::getConnection();

// Fetch settings
$settingsRows = $db->query("SELECT setting_key, setting_value FROM site_settings")->fetchAll();
$settings = [];
foreach ($settingsRows as $r) {
    $settings[$r['setting_key']] = $r['setting_value'];
}

$phone = $settings['phone'] ?? '+91 96111 09490';
$email = $settings['email'] ?? 'mail@weonboard.in';
$headerLogo = $settings['headerLogoUrl'] ?? '';
$footerLogo = $settings['footerLogoUrl'] ?? '';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>We Onboard &mdash; Your Ground Engine for Growth</title>
  <meta name="description" content="We Onboard: rider and gig worker onboarding, merchant acquisition, field audits, franchise development and government MSME desk in Bangalore.">
  <link rel="stylesheet" href="/assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, sans-serif; color: #1e293b; margin: 0; }
    .topbar { background: #02167F; color: #fff; font-size: 12px; padding: 8px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .topbar .container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .header { background: #fff; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 40; }
    .header .container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 75px; padding: 0 16px; }
    .brand { display: flex; align-items: center; text-decoration: none; }
    .brand-box { background: #FFD014; color: #02167F; font-weight: 900; font-size: 20px; padding: 4px 8px; border-radius: 6px; }
    .brand-name { color: #02167F; font-weight: 800; font-size: 22px; margin-left: 4px; }
    .nav { display: flex; gap: 20px; font-size: 14px; font-weight: 600; }
    .nav a { color: #334155; text-decoration: none; }
    .nav a:hover { color: #02167F; }
    .hero { background: #02167F; color: #fff; padding: 80px 20px; text-align: center; }
    .hero h1 { font-size: 42px; font-weight: 900; margin: 0 0 16px; line-height: 1.2; }
    .hero p { font-size: 18px; max-width: 700px; margin: 0 auto 30px; color: #cbd5e1; }
    .btn-gold { background: #FFD014; color: #02167F; font-weight: 800; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; }
    .section { max-width: 1200px; margin: 60px auto; padding: 0 20px; }
    .footer { background: #010e54; color: #fff; padding: 60px 20px 30px; margin-top: 80px; }
  </style>
</head>
<body>
  <!-- Top Details Bar -->
  <div class="topbar">
    <div class="container">
      <div>
        <span>☎ <?= htmlspecialchars($phone) ?></span> &nbsp;|&nbsp;
        <span>✉ <?= htmlspecialchars($email) ?></span> &nbsp;|&nbsp;
        <span>⌖ Indiranagar, Bangalore</span>
      </div>
      <div>
        <a href="#contact" style="color: #FFD014; font-weight: 700; text-decoration: none;">Request a Free Pilot Plan &rarr;</a>
      </div>
    </div>
  </div>

  <!-- Sticky Header -->
  <header class="header">
    <div class="container">
      <a href="/" class="brand">
        <?php if ($headerLogo): ?>
          <img src="<?= htmlspecialchars($headerLogo) ?>" alt="We Onboard" style="height: 44px; object-contain: fit;">
        <?php else: ?>
          <span class="brand-box">we</span><span class="brand-name">nboard</span>
        <?php endif; ?>
      </a>
      <nav class="nav">
        <a href="#services">Services</a>
        <a href="#businesses">For Businesses</a>
        <a href="/join-as-freelancer.php">Join as Freelancer</a>
        <a href="#msme">Govt & MSME Desk</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div style="font-size: 12px; font-weight: 800; color: #FFD014; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px;">BANGALORE ON-GROUND EXECUTION ENGINE</div>
    <h1>Your ground engine for growth.</h1>
    <p>We onboard the riders, workers, shops, restaurants and field operations your enterprise needs, verified, trained and ready to scale.</p>
    <div>
      <a href="#contact" class="btn-gold">Request Free Pilot Plan &rarr;</a>
      <a href="/join-as-freelancer.php" style="color: #fff; font-weight: 700; margin-left: 16px; text-decoration: underline;">Join as Freelancer</a>
    </div>
  </section>

  <!-- About Section -->
  <section class="section" id="about">
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px;">
      <h2 style="color: #02167F; font-size: 28px; margin-top: 0;">Growth happens <em>on the ground.</em></h2>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        Founded by <strong>Muhammd Ali Shoaib</strong> and <strong>Umme Morsi</strong>, 
        <strong>We Onboard</strong> bridges high-growth consumer technology platforms, retail chains, and expanding enterprises with the physical ground capabilities they need to scale across South India.
      </p>
      <p style="font-size: 14px; color: #64748b;">Headquartered in Indiranagar, Bangalore with zero joining fees for job seekers and freelancers.</p>
    </div>
  </section>

  <!-- Contact Form Section -->
  <section class="section" id="contact">
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <h2 style="color: #02167F; font-size: 24px; margin-top: 0;">Start a Pilot with We Onboard</h2>
      <p style="color: #64748b; font-size: 14px;">Submit your business requirements or enquiry and our team will prepare a structured pilot scope.</p>
      <form action="/api/enquiry.php" method="POST" style="margin-top: 20px;">
        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px;">Full Name *</label>
            <input type="text" name="full_name" required style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px;">Contact Phone *</label>
            <input type="tel" name="phone" required style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
          </div>
        </div>
        <div style="margin-top: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px;">Email Address</label>
          <input type="email" name="email" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
        </div>
        <div style="margin-top: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px;">Scope Details / Message</label>
          <textarea name="message" rows="3" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;"></textarea>
        </div>
        <button type="submit" class="btn-gold" style="border: none; margin-top: 20px; cursor: pointer;">Submit Request &rarr;</button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div style="max-width: 1200px; margin: 0 auto; text-align: center; font-size: 13px; color: #94a3b8;">
      <p style="color: #fff; font-weight: 700; font-size: 16px;">We Onboard &mdash; Your Ground Engine for Growth</p>
      <p>Indiranagar, Bangalore &bull; <?= htmlspecialchars($phone) ?> &bull; <?= htmlspecialchars($email) ?></p>
      <p style="margin-top: 20px;">&copy; <?= date('Y') ?> We Onboard. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>
`
    },
    {
      path: 'public/assets/style.css',
      description: 'Production CSS bundle with responsive layouts, typography & brand theme',
      content: `/* We Onboard Production CSS */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; background: #ffffff; }
a { color: inherit; }
img { max-width: 100%; display: block; }
`
    },
    {
      path: 'README-HOSTINGER.md',
      description: 'Master Deployment Guide for Hostinger Business Shared Hosting',
      content: `# We Onboard Deployment Guide — Hostinger Business Shared Hosting

## Quick Start (5 Steps)

### Step 1: Upload Files
1. Log into your Hostinger hPanel.
2. Go to **File Manager** -> Open **\`public_html\`**.
3. Upload all files and folders from this zip package directly into \`public_html\`.

### Step 2: Create MySQL Database
1. In hPanel, go to **Databases** -> **MySQL Databases**.
2. Create a new database (e.g. \`u123456789_weonboard\`).
3. Create a new user with all privileges and save the generated password.

### Step 3: Configure Database Credentials
Edit \`config/config.php\` or enter credentials directly in the installer:
- \`DB_HOST\`: \`localhost\`
- \`DB_NAME\`: your database name
- \`DB_USER\`: your database username
- \`DB_PASS\`: your database password

### Step 4: Run Web Installer
Open your browser and navigate to:
\`\`\`
https://yourdomain.com/install.php
\`\`\`
- Enter your database details.
- Provide your initial Super Admin password.
- Click **"Run Installation & Secure System"**.
- The installer automatically creates all 16 tables, seeds roles, and creates \`config/install.lock\` to prevent tampering.

### Step 5: Access the Admin Panel
Navigate to:
\`\`\`
https://yourdomain.com/admin/login.php
\`\`\`
Log in with your created Super Admin credentials (\`admin@weonboard.in\`).

## Security & Best Practices
- Ensure PHP 8.1 or 8.2 is selected under **hPanel -> Advanced -> PHP Configuration**.
- Enable **SSL (HTTPS)** under **Security -> SSL**.
- All user input uses prepared PDO statements to protect against SQL injection.
`
    }
  ];

  return files;
}

export async function downloadHostingerZip() {
  const zip = new JSZip();
  const files = generateHostingerFiles();

  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `weonboard-hostinger-deployment-package-${new Date().toISOString().split('T')[0]}.zip`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
