<?php
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
  <style>
    body { background: #f8fafc; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; display: flex; min-height: 100vh; }
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
