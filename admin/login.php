<?php
$rootCandidates = [dirname(__DIR__), dirname(__DIR__, 2), __DIR__];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die("System configuration error: config/config.php not found.");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = $_POST['password'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

    try {
        $db = Database::getConnection();

        // Rate limiting check
        $rateStmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR email = ?) AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
        $rateStmt->execute([$ip, $email]);
        $failedCount = (int)$rateStmt->fetchColumn();

        if ($failedCount >= 5) {
            $error = 'Too many failed login attempts. Account access is temporarily locked for 15 minutes.';
        } else {
            $stmt = $db->prepare("SELECT * FROM admin_users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($pass, $user['password_hash'])) {
                // Clear attempts
                $clearStmt = $db->prepare("DELETE FROM login_attempts WHERE ip_address = ? OR email = ?");
                $clearStmt->execute([$ip, $email]);

                session_regenerate_id(true);
                $_SESSION['admin_id'] = $user['id'];
                $_SESSION['admin_name'] = $user['name'];
                $_SESSION['admin_role_id'] = $user['role_id'];

                $update = $db->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?");
                $update->execute([$user['id']]);

                // Audit Log
                $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Login', 'Auth', ?, 'Successful admin login via web portal', ?)");
                $audit->execute([$user['name'], $user['id'], $ip]);

                header('Location: /admin/dashboard.php');
                exit;
            } else {
                // Log failed attempt
                $logAttempt = $db->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)");
                $logAttempt->execute([$ip, $email]);

                $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Failed Login', 'Auth', 'SECURITY_EVENT', 'Failed login attempt via web portal', ?)");
                $auditStmt->execute([$email, $ip]);

                $error = 'Invalid credentials or inactive account.';
            }
        }
    } catch (Exception $e) {
        error_log("Admin login error: " . $e->getMessage());
        $error = 'Database service temporarily unavailable. Please try again later.';
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
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #02167F; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
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
