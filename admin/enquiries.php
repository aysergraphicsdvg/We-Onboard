<?php
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
    body { background: #f8fafc; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; display: flex; }
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
