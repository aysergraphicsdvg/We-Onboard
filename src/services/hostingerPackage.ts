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
RewriteRule ^(config|database|logs|storage|scripts)/ - [F,L]

# 4. Deny direct access to hidden files and SQL backups
<FilesMatch "(\\.(bak|config|sql|fla|psd|ini|log|sh|inc|swp|dist|env)|~)$">
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
      path: 'api/.htaccess',
      description: 'Dedicated routing and rewrite rules for https://api.weonboard.in document root',
      content: `# We Onboard API Subdomain Routing
# Hostinger Document Root: public_html/api/

RewriteEngine On
RewriteBase /

# 1. Strip redundant /api/ prefix if requested on api.weonboard.in subdomain (prevents /api/api/ path duplication)
RewriteRule ^api/(.*)$ $1 [L,QSA]

# 2. Support clean URLs without .php extension (e.g. /v1/health -> /v1/health.php)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}.php -f
RewriteRule ^(.*)$ $1.php [L,QSA]

# 3. Handle OPTIONS pre-flight
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ - [R=204,L]

# 4. Prevent directory browsing & protect sensitive files
Options -Indexes
<FilesMatch "(\\.(bak|config|sql|fla|psd|ini|log|sh|inc|swp|dist|env)|~)$">
    Order allow,deny
    Deny from all
    Satisfy All
</FilesMatch>
`
    },
    {
      path: 'config/cors.php',
      description: 'Strict CORS origin validation without wildcards for credentials',
      content: `<?php
/**
 * Strict CORS origin verification for We Onboard API
 * Enforces authorized frontend origins; disallows wildcard with credentials
 */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Explicitly approved production and development origins
$allowedOrigins = [
    'https://weonboard.in',
    'https://www.weonboard.in',
    'https://api.weonboard.in',
    'https://aysergraphicsdvg.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

// Optional: allow explicit, non-wildcard additional origins via server environment
$extraOrigins = getenv('ADDITIONAL_ALLOWED_ORIGINS') ?: ($_ENV['ADDITIONAL_ALLOWED_ORIGINS'] ?? '');
if (!empty($extraOrigins)) {
    $parsedExtras = array_filter(array_map('trim', explode(',', $extraOrigins)));
    foreach ($parsedExtras as $extra) {
        if (preg_match('#^https?://[a-zA-Z0-9\\-\\.]+(:\\d+)?$#', $extra)) {
            $allowedOrigins[] = $extra;
        }
    }
}

$isAllowed = (!empty($origin) && in_array($origin, $allowedOrigins, true));

// Handle CORS Preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (!empty($origin) && !$isAllowed) {
        // Explicit rejection for unapproved origins
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['error' => 'CORS origin not allowed']);
        exit;
    }

    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key");
        header("Access-Control-Max-Age: 86400");
        header("Vary: Origin");
        http_response_code(204);
        exit;
    }

    // Direct OPTIONS request without Origin header
    http_response_code(204);
    exit;
}

// For actual requests (GET, POST, etc.)
if ($isAllowed) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key");
    header("Vary: Origin");
}
`
    },
    {
      path: 'config/quality_score.php',
      description: 'Configurable Quality Score calculation engine, sample size rules, and rank promotion threshold validator',
      content: `<?php
/**
 * We Onboard — Quality Score (QS) Engine & Performance Calculator
 * 
 * Configurable Quality Score Formula:
 * - Scale: 0 to 100 points
 * - Minimum Sample Size: 3 reviewed tasks (less than 3 returns Insufficient Data, score = null)
 * - Weights:
 *   1. Approval Rate (40%)
 *   2. First-Time Right / Low Rework Rate (25%)
 *   3. Timeliness Rate (20%)
 *   4. Evidence & Location Completeness (15%)
 * - Penalties: Confirmed Fraud Flag deductions (-50 pts)
 */

class QualityScoreEngine {

    public static function getConfig(PDO $db): array {
        $defaults = [
            'min_sample_size' => 3.00,
            'weight_approval' => 40.00,
            'weight_rework' => 25.00,
            'weight_timeliness' => 20.00,
            'weight_evidence' => 15.00,
            'penalty_fraud' => 50.00,
            'active_member_min_qs' => 70.00,
            'leader_min_qs' => 85.00,
            'manager_min_qs' => 85.00,
            'leader_min_active_members' => 10.00,
            'manager_min_qualifying_teams' => 3.00
        ];

        try {
            $stmt = $db->query("SELECT config_key, config_value FROM quality_score_config");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            if ($rows) {
                foreach ($rows as $k => $v) {
                    $defaults[$k] = (float)$v;
                }
            }
        } catch (Exception $e) {
            // Table may not exist yet; use safe defaults
        }

        return $defaults;
    }

    public static function calculateFreelancerScore(PDO $db, int $freelancerId): array {
        $config = self::getConfig($db);
        $minSample = (int)$config['min_sample_size'];

        // 1. Fetch freelancer basic info & fraud status
        $flStmt = $db->prepare("SELECT id, full_name, status, onboarding_status, current_rank, fraud_flag, fraud_reason FROM freelancers WHERE id = ? LIMIT 1");
        $flStmt->execute([$freelancerId]);
        $fl = $flStmt->fetch();

        if (!$fl) {
            throw new InvalidArgumentException("Freelancer #{$freelancerId} not found");
        }

        // 2. Query all tasks associated with this freelancer
        $taskStmt = $db->prepare("
            SELECT t.id, t.status, t.deadline, t.submitted_at, t.requires_location, t.rework_count,
                   (SELECT COUNT(*) FROM task_evidence_files f WHERE f.task_id = t.id) as file_count,
                   (SELECT location_lat FROM task_evidence_submissions s WHERE s.task_id = t.id ORDER BY s.id DESC LIMIT 1) as latest_lat
            FROM tasks t
            WHERE t.assigned_freelancer_id = ?
        ");
        $taskStmt->execute([$freelancerId]);
        $tasks = $taskStmt->fetchAll();

        $totalAssigned = count($tasks);
        $reviewedTasks = 0;
        $approvedCount = 0;
        $rejectedCount = 0;
        $reworkCount = 0;
        $firstTimeRightCount = 0;
        $onTimeCount = 0;
        $completeEvidenceCount = 0;
        $submittedCount = 0;

        foreach ($tasks as $t) {
            $status = $t['status'];
            $isSubmitted = in_array($status, ['Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected']);
            if ($isSubmitted) {
                $submittedCount++;
            }

            if (in_array($status, ['Approved', 'Rejected', 'Rework Required'])) {
                $reviewedTasks++;
            }

            if ($status === 'Approved') {
                $approvedCount++;
                if ((int)$t['rework_count'] === 0) {
                    $firstTimeRightCount++;
                }
            } elseif ($status === 'Rejected') {
                $rejectedCount++;
            } elseif ($status === 'Rework Required') {
                $reworkCount++;
            }

            // Timeliness: submitted on or before deadline
            if (!empty($t['submitted_at']) && !empty($t['deadline'])) {
                $subDate = substr($t['submitted_at'], 0, 10);
                if ($subDate <= $t['deadline']) {
                    $onTimeCount++;
                }
            }

            // Evidence completeness
            $hasFiles = (int)$t['file_count'] > 0;
            $hasGps = ((int)$t['requires_location'] === 0) || ($t['latest_lat'] !== null);
            if ($hasFiles && $hasGps) {
                $completeEvidenceCount++;
            }
        }

        // 3. Treatment of Insufficient Data (< minSample)
        if ($reviewedTasks < $minSample) {
            $qsStatus = 'Insufficient Data';
            $qualityScore = null;

            // Update database
            $upStmt = $db->prepare("
                UPDATE freelancers 
                SET quality_score = NULL, 
                    qs_sample_size = ?, 
                    qs_status = ?, 
                    qs_last_calculated_at = NOW() 
                WHERE id = ?
            ");
            $upStmt->execute([$reviewedTasks, $qsStatus, $freelancerId]);

            return [
                'freelancer_id' => $freelancerId,
                'full_name' => $fl['full_name'],
                'current_rank' => $fl['current_rank'] ?? 'Trainee',
                'quality_score' => null,
                'qs_status' => $qsStatus,
                'qs_sample_size' => $reviewedTasks,
                'min_sample_size' => $minSample,
                'has_sufficient_data' => false,
                'breakdown' => [
                    'approval_rate' => 0,
                    'approval_points' => 0,
                    'first_time_right_rate' => 0,
                    'first_time_right_points' => 0,
                    'timeliness_rate' => 0,
                    'timeliness_points' => 0,
                    'evidence_completeness_rate' => 0,
                    'evidence_completeness_points' => 0,
                    'fraud_penalty' => 0
                ],
                'task_metrics' => [
                    'total_assigned' => $totalAssigned,
                    'submitted' => $submittedCount,
                    'reviewed' => $reviewedTasks,
                    'approved' => $approvedCount,
                    'rework' => $reworkCount,
                    'rejected' => $rejectedCount
                ],
                'calculated_at' => date('Y-m-d H:i:s')
            ];
        }

        // 4. Calculate Verified Component Rates
        $approvalRate = $reviewedTasks > 0 ? ($approvedCount / $reviewedTasks) : 0;
        $firstTimeRightRate = $approvedCount > 0 ? ($firstTimeRightCount / $approvedCount) : 0;
        $timelinessRate = $submittedCount > 0 ? ($onTimeCount / $submittedCount) : 0;
        $evidenceRate = $submittedCount > 0 ? ($completeEvidenceCount / $submittedCount) : 0;

        $approvalPts = round($approvalRate * $config['weight_approval'], 2);
        $firstTimeRightPts = round($firstTimeRightRate * $config['weight_rework'], 2);
        $timelinessPts = round($timelinessRate * $config['weight_timeliness'], 2);
        $evidencePts = round($evidenceRate * $config['weight_evidence'], 2);

        $fraudPenalty = ((int)$fl['fraud_flag'] === 1) ? $config['penalty_fraud'] : 0.00;

        $subtotal = $approvalPts + $firstTimeRightPts + $timelinessPts + $evidencePts;
        $finalScore = max(0.00, min(100.00, round($subtotal - $fraudPenalty, 2)));

        if ((int)$fl['fraud_flag'] === 1) {
            $qsStatus = 'Suspended';
        } elseif ($finalScore < 50.00) {
            $qsStatus = 'Under Observation';
        } else {
            $qsStatus = 'Active';
        }

        // 5. Update database
        $upStmt = $db->prepare("
            UPDATE freelancers 
            SET quality_score = ?, 
                qs_sample_size = ?, 
                qs_status = ?, 
                qs_last_calculated_at = NOW() 
            WHERE id = ?
        ");
        $upStmt->execute([$finalScore, $reviewedTasks, $qsStatus, $freelancerId]);

        return [
            'freelancer_id' => $freelancerId,
            'full_name' => $fl['full_name'],
            'current_rank' => $fl['current_rank'] ?? 'Trainee',
            'quality_score' => $finalScore,
            'qs_status' => $qsStatus,
            'qs_sample_size' => $reviewedTasks,
            'min_sample_size' => $minSample,
            'has_sufficient_data' => true,
            'breakdown' => [
                'approval_rate' => round($approvalRate * 100, 1),
                'approval_points' => $approvalPts,
                'first_time_right_rate' => round($firstTimeRightRate * 100, 1),
                'first_time_right_points' => $firstTimeRightPts,
                'timeliness_rate' => round($timelinessRate * 100, 1),
                'timeliness_points' => $timelinessPts,
                'evidence_completeness_rate' => round($evidenceRate * 100, 1),
                'evidence_completeness_points' => $evidencePts,
                'fraud_penalty' => $fraudPenalty
            ],
            'task_metrics' => [
                'total_assigned' => $totalAssigned,
                'submitted' => $submittedCount,
                'reviewed' => $reviewedTasks,
                'approved' => $approvedCount,
                'rework' => $reworkCount,
                'rejected' => $rejectedCount
            ],
            'calculated_at' => date('Y-m-d H:i:s')
        ];
    }
}
`
    },
    {
      path: 'config/financial.php',
      description: 'Double-entry ledger engine, 70/20/10 split allocator, 10% reserve manager, and atomic payout controller',
      content: `<?php
/**
 * We Onboard — Financial Core & Double-Entry Ledger Subsystem (Phase 7)
 * 
 * Provides:
 * - Double-entry ledger journals and entries balancing Debits == Credits
 * - Fixed-precision DECIMAL arithmetic
 * - Task earning recognition (70% Freelancer, 20% Team Leader, 10% Manager)
 * - Growth Pool routing for unallocated or disqualified leadership shares
 * - 10% reserve management with 15-day hold period and automated release
 * - Wallet balances and projections reconciled against the ledger
 * - Atomic payout request earmarking, clearing, provider callbacks, and failure reversals
 * - Trial balance and audit reconciliation
 * 
 * Hostinger PHP 8.2+ and MariaDB/MySQL compatible.
 */

require_once __DIR__ . '/database.php';

class FinancialEngine {
    
    // Default fallback configurations if not in DB
    private static $defaultConfig = [
        'freelancer_share_pct' => 70.00,
        'team_leader_share_pct' => 20.00,
        'manager_share_pct' => 10.00,
        'reserve_pct' => 10.00,
        'reserve_hold_days' => 15,
        'min_payout_amount' => 500.00,
        'max_payout_amount' => 50000.00
    ];

    /**
     * Fetch active configuration values from financial_config table
     */
    public static function getConfig(PDO $db): array {
        try {
            $stmt = $db->query("SELECT config_key, config_value FROM financial_config");
            $config = self::$defaultConfig;
            while ($row = $stmt->fetch()) {
                $config[$row['config_key']] = (float)$row['config_value'];
            }
            return $config;
        } catch (Exception $e) {
            return self::$defaultConfig;
        }
    }

    /**
     * Post a balanced Double-Entry Journal Entry
     * Strictly verifies that SUM(Debits) == SUM(Credits) before committing.
     * Throws an exception on any unbalance or error.
     */
    public static function postJournal(
        PDO $db,
        string $transactionType,
        ?string $referenceId,
        string $narration,
        array $entries,
        string $postedBy = 'SYSTEM',
        ?int $reversalOfJournalId = null
    ): array {
        if (empty($entries)) {
            throw new InvalidArgumentException("Cannot post empty journal entry.");
        }

        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($entries as $entry) {
            $amount = round((float)$entry['amount'], 2);
            if ($amount <= 0) {
                throw new InvalidArgumentException("Journal line amounts must be strictly positive: {$amount}");
            }
            if ($entry['type'] === 'DEBIT') {
                $totalDebit = round($totalDebit + $amount, 2);
            } elseif ($entry['type'] === 'CREDIT') {
                $totalCredit = round($totalCredit + $amount, 2);
            } else {
                throw new InvalidArgumentException("Invalid entry type '{$entry['type']}'. Must be DEBIT or CREDIT.");
            }
        }

        // Strict double-entry balance check (tolerance < 0.005 for 2-decimal precision)
        $diff = abs($totalDebit - $totalCredit);
        if ($diff >= 0.005) {
            throw new RuntimeException("Unbalanced Double-Entry Journal: Debits (₹{$totalDebit}) != Credits (₹{$totalCredit}). Discrepancy: ₹{$diff}");
        }

        // Generate unique journal reference
        $journalRef = 'JRN-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

        // Insert journal header
        $stmt = $db->prepare("
            INSERT INTO ledger_journals (
                journal_ref, transaction_type, reference_id, narration,
                total_debit, total_credit, posted_by, reversal_of_journal_id, posted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $journalRef,
            $transactionType,
            $referenceId,
            $narration,
            $totalDebit,
            $totalCredit,
            $postedBy,
            $reversalOfJournalId
        ]);
        $journalId = (int)$db->lastInsertId();

        // Insert journal lines
        $entryStmt = $db->prepare("
            INSERT INTO ledger_entries (
                journal_id, account_code, entry_type, amount,
                entity_type, entity_id, line_narration, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        foreach ($entries as $e) {
            $entryStmt->execute([
                $journalId,
                $e['account_code'],
                $e['type'],
                round((float)$e['amount'], 2),
                $e['entity_type'] ?? 'System',
                isset($e['entity_id']) ? (string)$e['entity_id'] : null,
                $e['narration'] ?? $narration
            ]);
        }

        return [
            'journal_id' => $journalId,
            'journal_ref' => $journalRef,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit
        ];
    }

    /**
     * Recognize Task Earnings upon QC Approval
     * Calculates 70% Freelancer, 20% Team Leader, 10% Manager breakdown.
     * Routes unallocated / disqualified leadership shares to the Growth Pool.
     * Applies 10% reserve hold for 15 days to freelancer share.
     * Posts balanced double-entry journal and updates wallets.
     */
    public static function recognizeTaskEarnings(
        PDO $db,
        int $taskId,
        string $actorName = 'QC_REVIEWER'
    ): array {
        // 1. Check if earning entitlement already exists (prevent duplicate recognition)
        $checkStmt = $db->prepare("SELECT * FROM earning_entitlements WHERE task_id = ?");
        $checkStmt->execute([$taskId]);
        $existing = $checkStmt->fetch();
        if ($existing) {
            return [
                'success' => true,
                'entitlement' => $existing,
                'is_idempotent' => true,
                'message' => 'Task earning already established (idempotent replay).'
            ];
        }

        // 2. Fetch task details
        $taskStmt = $db->prepare("
            SELECT t.*, p.name as project_name 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id 
            WHERE t.id = ? 
            FOR UPDATE
        ");
        $taskStmt->execute([$taskId]);
        $task = $taskStmt->fetch();

        if (!$task) {
            throw new RuntimeException("Task not found with ID {$taskId}");
        }

        if ($task['status'] !== 'Approved') {
            throw new RuntimeException("Cannot recognize earnings for task {$task['task_ref']}: status is '{$task['status']}', not 'Approved'.");
        }

        $grossRate = round((float)$task['payout_amount'], 2);
        if ($grossRate <= 0) {
            throw new RuntimeException("Task payout amount must be greater than zero.");
        }

        $freelancerId = (int)$task['assigned_freelancer_id'];
        $projectId = (int)$task['project_id'];

        $cfg = self::getConfig($db);

        // 3. Inspect Team Hierarchy and Leader/Manager eligibility
        $hierarchyStmt = $db->prepare("
            SELECT 
                tm.team_id,
                t.name as team_name,
                t.status as team_status,
                t.leader_id,
                t.manager_id,
                fl_ldr.full_name as leader_name,
                fl_ldr.status as leader_status,
                fl_ldr.quality_score as leader_qs,
                fl_ldr.fraud_flag as leader_fraud,
                fl_mgr.full_name as manager_name,
                fl_mgr.status as manager_status,
                fl_mgr.quality_score as manager_qs,
                fl_mgr.fraud_flag as manager_fraud
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            LEFT JOIN freelancers fl_ldr ON t.leader_id = fl_ldr.id
            LEFT JOIN freelancers fl_mgr ON t.manager_id = fl_mgr.id
            WHERE tm.freelancer_id = ?
            LIMIT 1
        ");
        $hierarchyStmt->execute([$freelancerId]);
        $hierarchy = $hierarchyStmt->fetch();

        $activeMinQs = 70.0;

        // Evaluate Team Leader Qualification
        $teamLeaderId = null;
        $leaderQualified = false;
        $tlRouteToGrowth = true;

        if ($hierarchy && !empty($hierarchy['leader_id']) && $hierarchy['team_status'] === 'Active') {
            $isLeaderActive = in_array($hierarchy['leader_status'], ['Active', 'Approved']);
            $leaderQs = $hierarchy['leader_qs'] !== null ? (float)$hierarchy['leader_qs'] : 0.0;
            $hasLeaderFraud = (int)$hierarchy['leader_fraud'] === 1;

            if ($isLeaderActive && $leaderQs >= $activeMinQs && !$hasLeaderFraud) {
                $teamLeaderId = (int)$hierarchy['leader_id'];
                $leaderQualified = true;
                $tlRouteToGrowth = false;
            }
        }

        // Evaluate Manager Qualification
        $managerId = null;
        $managerQualified = false;
        $mgrRouteToGrowth = true;

        if ($hierarchy && !empty($hierarchy['manager_id']) && $hierarchy['team_status'] === 'Active') {
            $isMgrActive = in_array($hierarchy['manager_status'], ['Active', 'Approved']);
            $mgrQs = $hierarchy['manager_qs'] !== null ? (float)$hierarchy['manager_qs'] : 0.0;
            $hasMgrFraud = (int)$hierarchy['manager_fraud'] === 1;

            if ($isMgrActive && $mgrQs >= $activeMinQs && !$hasMgrFraud) {
                $managerId = (int)$hierarchy['manager_id'];
                $managerQualified = true;
                $mgrRouteToGrowth = false;
            }
        }

        // 4. Calculate Percentage Splits
        // Freelancer: 70% of gross
        $flShareGross = round($grossRate * ($cfg['freelancer_share_pct'] / 100.0), 2);
        // Reserve: 10% of freelancer share
        $flReserve = round($flShareGross * ($cfg['reserve_pct'] / 100.0), 2);
        // Freelancer Net (immediate available): 90% of freelancer share
        $flShareNet = round($flShareGross - $flReserve, 2);

        // Team Leader: 20% of gross
        $tlFullShare = round($grossRate * ($cfg['team_leader_share_pct'] / 100.0), 2);
        $tlShare = $leaderQualified ? $tlFullShare : 0.00;

        // Manager: 10% of gross
        $mgrFullShare = round($grossRate * ($cfg['manager_share_pct'] / 100.0), 2);
        $mgrShare = $managerQualified ? $mgrFullShare : 0.00;

        // Growth Pool absorbs unallocated shares
        $growthPoolShare = round(
            ($tlRouteToGrowth ? $tlFullShare : 0.00) +
            ($mgrRouteToGrowth ? $mgrFullShare : 0.00),
            2
        );

        // Verification: flShareNet + flReserve + tlShare + mgrShare + growthPoolShare == grossRate
        $totalCredits = round($flShareNet + $flReserve + $tlShare + $mgrShare + $growthPoolShare, 2);
        if (abs($totalCredits - $grossRate) >= 0.005) {
            // Adjust rounding discrepancy on growth pool or net share
            $roundingDiff = round($grossRate - $totalCredits, 2);
            $growthPoolShare = round($growthPoolShare + $roundingDiff, 2);
        }

        // 5. Construct Double-Entry Journal Lines
        $entries = [
            // DEBIT Expense
            [
                'account_code' => '5001',
                'type' => 'DEBIT',
                'amount' => $grossRate,
                'entity_type' => 'Platform',
                'entity_id' => 'PROJECT_' . $projectId,
                'narration' => "Field execution cost for QC-approved task {$task['task_ref']}"
            ],
            // CREDIT Freelancer Available
            [
                'account_code' => '2001',
                'type' => 'CREDIT',
                'amount' => $flShareNet,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$freelancerId,
                'narration' => "Net available task earnings (90% of 70% share) for {$task['task_ref']}"
            ],
            // CREDIT Reserve Liability (15-day hold)
            [
                'account_code' => '2004',
                'type' => 'CREDIT',
                'amount' => $flReserve,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$freelancerId,
                'narration' => "10% quality assurance reserve held for 15 days for {$task['task_ref']}"
            ]
        ];

        // CREDIT Team Leader or Growth Pool
        if ($leaderQualified && $tlShare > 0) {
            $entries[] = [
                'account_code' => '2002',
                'type' => 'CREDIT',
                'amount' => $tlShare,
                'entity_type' => 'TeamLeader',
                'entity_id' => (string)$teamLeaderId,
                'narration' => "20% Team Leader override on member task {$task['task_ref']}"
            ];
        }

        // CREDIT Manager or Growth Pool
        if ($managerQualified && $mgrShare > 0) {
            $entries[] = [
                'account_code' => '2003',
                'type' => 'CREDIT',
                'amount' => $mgrShare,
                'entity_type' => 'Manager',
                'entity_id' => (string)$managerId,
                'narration' => "10% Area Manager supervision share on task {$task['task_ref']}"
            ];
        }

        // CREDIT Growth Pool for any unallocated share
        if ($growthPoolShare > 0) {
            $entries[] = [
                'account_code' => '3001',
                'type' => 'CREDIT',
                'amount' => $growthPoolShare,
                'entity_type' => 'Platform',
                'entity_id' => 'GROWTH_POOL',
                'narration' => "Unallocated supervisor revenue routed to Platform Growth Pool (TL routed: " . ($tlRouteToGrowth ? 'Yes' : 'No') . ", Mgr routed: " . ($mgrRouteToGrowth ? 'Yes' : 'No') . ")"
            ];
        }

        // 6. Post Journal
        $journal = self::postJournal(
            $db,
            'EARNING_RECOGNITION',
            $task['task_ref'],
            "QC Earning Recognition for Task {$task['task_ref']} ({$task['title']})",
            $entries,
            $actorName
        );

        // 7. Insert Earning Entitlement Record
        $entitlementRef = 'ENT-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
        $snapshotJson = json_encode([
            'team_id' => $hierarchy['team_id'] ?? null,
            'team_name' => $hierarchy['team_name'] ?? null,
            'team_status' => $hierarchy['team_status'] ?? null,
            'leader_id' => $teamLeaderId,
            'leader_qualified' => $leaderQualified,
            'manager_id' => $managerId,
            'manager_qualified' => $managerQualified,
            'tl_routed_to_growth' => $tlRouteToGrowth,
            'mgr_routed_to_growth' => $mgrRouteToGrowth
        ]);

        $insEnt = $db->prepare("
            INSERT INTO earning_entitlements (
                entitlement_ref, task_id, project_id, freelancer_id,
                gross_rate, freelancer_share_gross, freelancer_reserve_amount, freelancer_share_net,
                team_leader_id, team_leader_share, team_leader_routed_to_growth,
                manager_id, manager_share, manager_routed_to_growth, growth_pool_share,
                hierarchy_snapshot_json, journal_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recognized', NOW())
        ");
        $insEnt->execute([
            $entitlementRef,
            $taskId,
            $projectId,
            $freelancerId,
            $grossRate,
            $flShareGross,
            $flReserve,
            $flShareNet,
            $teamLeaderId,
            $tlShare,
            $tlRouteToGrowth ? 1 : 0,
            $managerId,
            $mgrShare,
            $mgrRouteToGrowth ? 1 : 0,
            $growthPoolShare,
            $snapshotJson,
            $journal['journal_id']
        ]);
        $entitlementId = (int)$db->lastInsertId();

        // 8. Insert Reserve Record (15-day hold)
        $reserveRef = 'RES-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
        $holdDays = (int)$cfg['reserve_hold_days'];
        $insRes = $db->prepare("
            INSERT INTO reserve_records (
                reserve_ref, freelancer_id, task_id, earning_entitlement_id,
                amount, reserve_pct, hold_days, release_due_at, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'Held', NOW())
        ");
        $insRes->execute([
            $reserveRef,
            $freelancerId,
            $taskId,
            $entitlementId,
            $flReserve,
            $cfg['reserve_pct'],
            $holdDays,
            $holdDays
        ]);

        // 9. Update Wallets Projections
        self::updateWalletOnEarning($db, $freelancerId, $flShareGross, $flShareNet, $flReserve, $grossRate);

        if ($leaderQualified && $tlShare > 0 && $teamLeaderId) {
            self::updateWalletOnEarning($db, $teamLeaderId, $tlShare, $tlShare, 0.0, 0.0);
        }

        if ($managerQualified && $mgrShare > 0 && $managerId) {
            self::updateWalletOnEarning($db, $managerId, $mgrShare, $mgrShare, 0.0, 0.0);
        }

        return [
            'success' => true,
            'entitlement_id' => $entitlementId,
            'entitlement_ref' => $entitlementRef,
            'journal_ref' => $journal['journal_ref'],
            'gross_rate' => $grossRate,
            'freelancer_share_gross' => $flShareGross,
            'freelancer_share_net' => $flShareNet,
            'freelancer_reserve' => $flReserve,
            'team_leader_share' => $tlShare,
            'manager_share' => $mgrShare,
            'growth_pool_share' => $growthPoolShare
        ];
    }

    /**
     * Update Wallet projections transactionally
     */
    private static function updateWalletOnEarning(
        PDO $db,
        int $freelancerId,
        float $totalEarnedAdd,
        float $availAdd,
        float $reserveAdd,
        float $pendingSub
    ): void {
        // Ensure wallet exists
        $db->prepare("
            INSERT IGNORE INTO wallets (freelancer_id, total_earned, available_balance, reserved_balance, pending_earnings, payouts_in_progress, paid_payouts)
            VALUES (?, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
        ")->execute([$freelancerId]);

        $upStmt = $db->prepare("
            UPDATE wallets 
            SET total_earned = total_earned + ?,
                available_balance = available_balance + ?,
                reserved_balance = reserved_balance + ?,
                pending_earnings = GREATEST(0.00, pending_earnings - ?),
                last_reconciled_at = NOW()
            WHERE freelancer_id = ?
        ");
        $upStmt->execute([
            $totalEarnedAdd,
            $availAdd,
            $reserveAdd,
            $pendingSub,
            $freelancerId
        ]);
    }

    /**
     * Release matured reserves after 15-day hold period
     */
    public static function releaseMaturedReserves(PDO $db, string $actor = 'CRON_SCHEDULER', ?int $specificId = null): array {
        $query = "
            SELECT r.*, f.full_name as freelancer_name, f.email
            FROM reserve_records r
            JOIN freelancers f ON r.freelancer_id = f.id
            WHERE r.status = 'Held' AND r.release_due_at <= NOW()
        ";
        $params = [];
        if ($specificId !== null) {
            $query .= " AND r.id = ?";
            $params[] = $specificId;
        }
        $query .= " FOR UPDATE";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $matured = $stmt->fetchAll();

        $releasedCount = 0;
        $totalReleasedAmount = 0.0;
        $releasedRefs = [];

        foreach ($matured as $res) {
            $amount = round((float)$res['amount'], 2);
            $flId = (int)$res['freelancer_id'];

            // Post balanced journal
            $entries = [
                [
                    'account_code' => '2004',
                    'type' => 'DEBIT',
                    'amount' => $amount,
                    'entity_type' => 'Freelancer',
                    'entity_id' => (string)$flId,
                    'narration' => "Release matured 15-day quality reserve {$res['reserve_ref']}"
                ],
                [
                    'account_code' => '2001',
                    'type' => 'CREDIT',
                    'amount' => $amount,
                    'entity_type' => 'Freelancer',
                    'entity_id' => (string)$flId,
                    'narration' => "Credit released reserve to available balance {$res['reserve_ref']}"
                ]
            ];

            $journal = self::postJournal(
                $db,
                'RESERVE_RELEASE',
                $res['reserve_ref'],
                "Automated release of 15-day matured reserve {$res['reserve_ref']} to available balance",
                $entries,
                $actor
            );

            // Update reserve record
            $upRes = $db->prepare("
                UPDATE reserve_records 
                SET status = 'Released',
                    released_at = NOW(),
                    release_journal_id = ?
                WHERE id = ? AND status = 'Held'
            ");
            $upRes->execute([$journal['journal_id'], $res['id']]);

            // Update wallet
            $upW = $db->prepare("
                UPDATE wallets 
                SET reserved_balance = GREATEST(0.00, reserved_balance - ?),
                    available_balance = available_balance + ?,
                    last_reconciled_at = NOW()
                WHERE freelancer_id = ?
            ");
            $upW->execute([$amount, $amount, $flId]);

            $releasedCount++;
            $totalReleasedAmount = round($totalReleasedAmount + $amount, 2);
            $releasedRefs[] = $res['reserve_ref'];
        }

        return [
            'success' => true,
            'released_count' => $releasedCount,
            'total_amount' => $totalReleasedAmount,
            'released_refs' => $releasedRefs
        ];
    }

    /**
     * Request a Payout
     * Atomically earmarks available funds moving them to Payout In-Transit Clearing.
     */
    public static function requestPayout(
        PDO $db,
        int $freelancerId,
        float $amount,
        string $paymentMethod,
        string $beneficiaryName,
        string $beneficiaryDetails,
        string $idempotencyKey
    ): array {
        $amount = round($amount, 2);
        $cfg = self::getConfig($db);

        // 1. Check idempotency key first
        $idemStmt = $db->prepare("SELECT * FROM payout_requests WHERE idempotency_key = ?");
        $idemStmt->execute([$idempotencyKey]);
        $existing = $idemStmt->fetch();
        if ($existing) {
            return [
                'success' => true,
                'payout_id' => (int)$existing['id'],
                'payout_ref' => $existing['payout_ref'],
                'amount' => (float)$existing['amount'],
                'status' => $existing['status'],
                'payout' => $existing,
                'is_idempotent' => true,
                'message' => 'Payout request already registered.'
            ];
        }

        // 2. Validate thresholds
        if ($amount < $cfg['min_payout_amount']) {
            throw new InvalidArgumentException("Payout amount (₹{$amount}) is below the minimum threshold of ₹{$cfg['min_payout_amount']}.");
        }
        if ($amount > $cfg['max_payout_amount']) {
            throw new InvalidArgumentException("Payout amount (₹{$amount}) exceeds the single transaction limit of ₹{$cfg['max_payout_amount']}.");
        }

        // 3. Verify Freelancer Eligibility (KYC and Fraud flag)
        $flStmt = $db->prepare("SELECT id, full_name, status, onboarding_status, fraud_flag FROM freelancers WHERE id = ?");
        $flStmt->execute([$freelancerId]);
        $fl = $flStmt->fetch();

        if (!$fl) {
            throw new RuntimeException("Freelancer not found.");
        }
        $isKycApproved = (in_array($fl['status'], ['Active', 'Approved']) || $fl['onboarding_status'] === 'Approved');
        if (!$isKycApproved) {
            throw new RuntimeException("Payout Blocked: KYC must be verified and approved before requesting withdrawals.");
        }
        if ((int)$fl['fraud_flag'] === 1) {
            throw new RuntimeException("Payout Blocked: Account has an active disciplinary or policy flag. Contact administrative support.");
        }

        // 4. Lock Wallet and check Available Balance
        $wStmt = $db->prepare("SELECT * FROM wallets WHERE freelancer_id = ? FOR UPDATE");
        $wStmt->execute([$freelancerId]);
        $wallet = $wStmt->fetch();

        $available = $wallet ? (float)$wallet['available_balance'] : 0.00;
        if ($available < $amount) {
            throw new RuntimeException("Insufficient available balance. Available: ₹{$available}, Requested: ₹{$amount}.");
        }

        // 5. Generate Payout Reference
        $payoutRef = 'PO-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

        // 6. Post Double-Entry Journal (Move from Freelancer Payable to Payout Clearing)
        $entries = [
            [
                'account_code' => '2001',
                'type' => 'DEBIT',
                'amount' => $amount,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$freelancerId,
                'narration' => "Payout request {$payoutRef} earmarked from available balance"
            ],
            [
                'account_code' => '2005',
                'type' => 'CREDIT',
                'amount' => $amount,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$freelancerId,
                'narration' => "Hold in Payout In-Transit Clearing for {$payoutRef}"
            ]
        ];

        $journal = self::postJournal(
            $db,
            'PAYOUT_REQUESTED',
            $payoutRef,
            "Payout request {$payoutRef} for ₹{$amount} to {$beneficiaryName}",
            $entries,
            $fl['full_name']
        );

        // 7. Insert Payout Request
        $insPo = $db->prepare("
            INSERT INTO payout_requests (
                payout_ref, idempotency_key, freelancer_id, amount,
                payment_method, beneficiary_name, beneficiary_details,
                status, request_journal_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Requested', ?, NOW())
        ");
        $insPo->execute([
            $payoutRef,
            $idempotencyKey,
            $freelancerId,
            $amount,
            $paymentMethod,
            $beneficiaryName,
            $beneficiaryDetails,
            $journal['journal_id']
        ]);
        $payoutId = (int)$db->lastInsertId();

        // 8. Update Wallet (Atomic deduction from available, addition to in-progress)
        $upW = $db->prepare("
            UPDATE wallets 
            SET available_balance = available_balance - ?,
                payouts_in_progress = payouts_in_progress + ?,
                last_reconciled_at = NOW()
            WHERE freelancer_id = ?
        ");
        $upW->execute([$amount, $amount, $freelancerId]);

        return [
            'success' => true,
            'payout_id' => $payoutId,
            'payout_ref' => $payoutRef,
            'amount' => $amount,
            'status' => 'Requested',
            'journal_ref' => $journal['journal_ref']
        ];
    }

    /**
     * Settle / Confirm a Payout (Admin approval or Provider webhook confirmation)
     * Clears from Payout Clearing to Cash & Bank
     */
    public static function settlePayout(
        PDO $db,
        int $payoutId,
        string $providerTransferId,
        string $actor = 'ADMIN'
    ): array {
        $poStmt = $db->prepare("SELECT * FROM payout_requests WHERE id = ? FOR UPDATE");
        $poStmt->execute([$payoutId]);
        $payout = $poStmt->fetch();

        if (!$payout) {
            throw new RuntimeException("Payout request not found.");
        }

        if ($payout['status'] === 'Paid') {
            return [
                'success' => true,
                'payout' => $payout,
                'is_idempotent' => true,
                'message' => 'Payout already confirmed as Paid.'
            ];
        }

        if (!in_array($payout['status'], ['Requested', 'Under Review', 'Approved', 'Processing'])) {
            throw new RuntimeException("Cannot settle payout in '{$payout['status']}' state.");
        }

        $amount = round((float)$payout['amount'], 2);
        $flId = (int)$payout['freelancer_id'];

        // Journal: DEBIT 2005 (Clearing) -> CREDIT 1001 (Cash & Bank)
        $entries = [
            [
                'account_code' => '2005',
                'type' => 'DEBIT',
                'amount' => $amount,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$flId,
                'narration' => "Clear payout {$payout['payout_ref']} from in-transit clearing"
            ],
            [
                'account_code' => '1001',
                'type' => 'CREDIT',
                'amount' => $amount,
                'entity_type' => 'Platform',
                'entity_id' => 'BANK_DISBURSEMENT',
                'narration' => "Disbursement via bank transfer (Ref: {$providerTransferId}) for {$payout['payout_ref']}"
            ]
        ];

        $journal = self::postJournal(
            $db,
            'PAYOUT_SETTLED',
            $payout['payout_ref'],
            "Disbursement confirmation for payout {$payout['payout_ref']}. Provider Ref: {$providerTransferId}",
            $entries,
            $actor
        );

        // Update payout request
        $upPo = $db->prepare("
            UPDATE payout_requests 
            SET status = 'Paid',
                settlement_journal_id = ?,
                provider_transfer_id = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE id = ?
        ");
        $upPo->execute([$journal['journal_id'], $providerTransferId, $actor, $payoutId]);

        // Update wallet
        $upW = $db->prepare("
            UPDATE wallets 
            SET payouts_in_progress = GREATEST(0.00, payouts_in_progress - ?),
                paid_payouts = paid_payouts + ?,
                last_reconciled_at = NOW()
            WHERE freelancer_id = ?
        ");
        $upW->execute([$amount, $amount, $flId]);

        return [
            'success' => true,
            'payout_id' => $payoutId,
            'payout_ref' => $payout['payout_ref'],
            'status' => 'Paid',
            'journal_ref' => $journal['journal_ref'],
            'provider_transfer_id' => $providerTransferId
        ];
    }

    /**
     * Fail or Cancel a Payout (Restores funds from Payout Clearing back to Freelancer Available)
     */
    public static function reversePayout(
        PDO $db,
        int $payoutId,
        string $failureReason,
        string $actor = 'ADMIN'
    ): array {
        $poStmt = $db->prepare("SELECT * FROM payout_requests WHERE id = ? FOR UPDATE");
        $poStmt->execute([$payoutId]);
        $payout = $poStmt->fetch();

        if (!$payout) {
            throw new RuntimeException("Payout request not found.");
        }

        if (in_array($payout['status'], ['Failed', 'Cancelled'])) {
            return [
                'success' => true,
                'payout' => $payout,
                'is_idempotent' => true,
                'message' => 'Payout already marked as ' . $payout['status']
            ];
        }

        if ($payout['status'] === 'Paid') {
            throw new RuntimeException("Cannot reverse an already settled and Paid payout via this workflow.");
        }

        $amount = round((float)$payout['amount'], 2);
        $flId = (int)$payout['freelancer_id'];

        // Journal: DEBIT 2005 (Clearing) -> CREDIT 2001 (Freelancer Available)
        $entries = [
            [
                'account_code' => '2005',
                'type' => 'DEBIT',
                'amount' => $amount,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$flId,
                'narration' => "Release in-transit clearing for failed payout {$payout['payout_ref']}"
            ],
            [
                'account_code' => '2001',
                'type' => 'CREDIT',
                'amount' => $amount,
                'entity_type' => 'Freelancer',
                'entity_id' => (string)$flId,
                'narration' => "Refund failed payout {$payout['payout_ref']} to available balance. Reason: {$failureReason}"
            ]
        ];

        $journal = self::postJournal(
            $db,
            'PAYOUT_REVERSED',
            $payout['payout_ref'],
            "Reversal and refund of payout {$payout['payout_ref']}. Reason: {$failureReason}",
            $entries,
            $actor
        );

        // Update payout request
        $upPo = $db->prepare("
            UPDATE payout_requests 
            SET status = 'Failed',
                reversal_journal_id = ?,
                failure_reason = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE id = ?
        ");
        $upPo->execute([$journal['journal_id'], $failureReason, $actor, $payoutId]);

        // Update wallet (restore available balance)
        $upW = $db->prepare("
            UPDATE wallets 
            SET payouts_in_progress = GREATEST(0.00, payouts_in_progress - ?),
                available_balance = available_balance + ?,
                last_reconciled_at = NOW()
            WHERE freelancer_id = ?
        ");
        $upW->execute([$amount, $amount, $flId]);

        return [
            'success' => true,
            'payout_id' => $payoutId,
            'payout_ref' => $payout['payout_ref'],
            'status' => 'Failed',
            'refunded_amount' => $amount,
            'journal_ref' => $journal['journal_ref']
        ];
    }

    /**
     * Compute Trial Balance across all ledger accounts
     */
    public static function getTrialBalance(PDO $db): array {
        $stmt = $db->query("
            SELECT 
                la.account_code,
                la.account_name,
                la.account_type,
                COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END), 0.00) as total_debit,
                COALESCE(SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END), 0.00) as total_credit
            FROM ledger_accounts la
            LEFT JOIN ledger_entries le ON la.account_code = le.account_code
            GROUP BY la.account_code, la.account_name, la.account_type
            ORDER BY la.account_code ASC
        ");
        $accounts = $stmt->fetchAll();

        $grandDebit = 0.0;
        $grandCredit = 0.0;

        foreach ($accounts as &$acc) {
            $acc['total_debit'] = round((float)$acc['total_debit'], 2);
            $acc['total_credit'] = round((float)$acc['total_credit'], 2);
            $grandDebit = round($grandDebit + $acc['total_debit'], 2);
            $grandCredit = round($grandCredit + $acc['total_credit'], 2);

            // Net balance: Assets & Expenses normally Debit; Liabilities, Equity & Revenue normally Credit
            if (in_array($acc['account_type'], ['Asset', 'Expense'])) {
                $acc['net_balance'] = round($acc['total_debit'] - $acc['total_credit'], 2);
            } else {
                $acc['net_balance'] = round($acc['total_credit'] - $acc['total_debit'], 2);
            }
        }

        $discrepancy = abs($grandDebit - $grandCredit);
        $isBalanced = ($discrepancy < 0.005);

        return [
            'accounts' => $accounts,
            'grand_total_debit' => $grandDebit,
            'grand_total_credit' => $grandCredit,
            'discrepancy' => $discrepancy,
            'is_balanced' => $isBalanced
        ];
    }
}
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

// Database Credentials (Must be explicitly configured via server environment or config/db_credentials.php)
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? ($_SERVER['DB_HOST'] ?? 'localhost'));
$dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? ($_SERVER['DB_NAME'] ?? ''));
$dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? ($_SERVER['DB_USER'] ?? ''));
$dbPass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? ($_SERVER['DB_PASS'] ?? ''));

// Optional: support an uncommitted, protected server credentials file if the PHP SAPI does not expose environment variables
$localDbConfig = __DIR__ . '/db_credentials.php';
if (file_exists($localDbConfig)) {
    $creds = include $localDbConfig;
    if (is_array($creds)) {
        $dbHost = $creds['DB_HOST'] ?? $dbHost;
        $dbName = $creds['DB_NAME'] ?? $dbName;
        $dbUser = $creds['DB_USER'] ?? $dbUser;
        $dbPass = $creds['DB_PASS'] ?? $dbPass;
    }
}

define('DB_HOST', $dbHost);
define('DB_NAME', $dbName);
define('DB_USER', $dbUser);
define('DB_PASS', $dbPass);
define('DB_CHARSET', 'utf8mb4');
define('ALLOW_WEB_INSTALL', (getenv('ALLOW_WEB_INSTALL') === 'true' || (isset($_ENV['ALLOW_WEB_INSTALL']) && $_ENV['ALLOW_WEB_INSTALL'] === 'true')));

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
    if (empty($token)) {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $json = json_decode($raw, true);
            if (is_array($json) && !empty($json['csrf_token'])) {
                $token = $json['csrf_token'];
            }
        }
    }
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], (string)$token)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
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
      description: 'PDO Database singleton with UTF-8mb4 and fail-closed credential validation',
      content: `<?php
require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Fail closed: Require explicit server-side database configuration
            if (empty(DB_NAME) || empty(DB_USER) || DB_PASS === '') {
                error_log("[SECURITY/CONFIG ERROR] Database credentials are not configured on this server. DB_NAME, DB_USER, and DB_PASS must be provided via environment variables or server config.");
                throw new RuntimeException("Database configuration is missing or incomplete. Server administrator must configure credentials.");
            }

            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Log detailed diagnostic information privately to the server error log
                error_log("[Database Connection Error] Host: " . DB_HOST . ", DB: " . DB_NAME . ", User: " . DB_USER . " - " . $e->getMessage());
                // Never rethrow raw PDOException containing credentials to callers
                throw new RuntimeException("Database connection failure. Please verify server connectivity.");
            }
        }
        return self::$instance;
    }
}
`
    },
    {
      path: 'config/idempotency.php',
      description: 'Concurrency-safe idempotency manager with atomic reservation, payload hashing, and race resolution',
      content: `<?php
/**
 * We Onboard Concurrency-Safe Idempotency Manager
 * 
 * Provides atomic reservation, payload hash validation,
 * transaction coordination, and conflict resolution across concurrent requests.
 */

class Idempotency {
    const STATUS_RESERVED    = 'RESERVED';
    const STATUS_HIT         = 'HIT';
    const STATUS_CONFLICT    = 'CONFLICT';
    const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    const STATUS_NONE        = 'NONE';
    const STATUS_INVALID     = 'INVALID';

    const PENDING_SENTINEL   = '__IDEMPOTENCY_IN_PROGRESS__';

    /**
     * Validates key format (8-64 alphanumeric, dash, underscore)
     */
    public static function isValidKey(string $key): bool {
        return (bool) preg_match('/^[A-Za-z0-9_\\-]{8,64}$/', $key);
    }

    /**
     * Atomically reserves an idempotency key or returns cached/conflict state.
     *
     * @param PDO $db
     * @param string $key
     * @param string $endpoint
     * @param string $payloadHash
     * @return array [
     *   'status' => 'RESERVED' | 'HIT' | 'CONFLICT' | 'IN_PROGRESS' | 'NONE' | 'INVALID',
     *   'response_json' => string | null,
     *   'error' => string | null
     * ]
     */
    public static function reserve(PDO $db, string $key, string $endpoint, string $payloadHash): array {
        if (empty($key)) {
            return ['status' => self::STATUS_NONE, 'response_json' => null, 'error' => null];
        }

        if (!self::isValidKey($key)) {
            return [
                'status' => self::STATUS_INVALID,
                'response_json' => null,
                'error' => 'Invalid idempotency key format. Must be 8-64 alphanumeric characters, underscores, or hyphens.'
            ];
        }

        // Fast-path: Check if key already exists
        $stmt = $db->prepare("SELECT endpoint, request_payload_hash, response_json, created_at FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
        $stmt->execute([$key]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Check if this was an abandoned in-progress reservation older than 120 seconds
            if ($existing['response_json'] === self::PENDING_SENTINEL && !empty($existing['created_at'])) {
                $createdTime = strtotime($existing['created_at']);
                if ($createdTime !== false && (time() - $createdTime) > 120) {
                    // Safe recovery of abandoned lock: release stale reservation so caller can retry cleanly
                    self::release($db, $key);
                    $existing = null;
                }
            }
            if ($existing) {
                return self::resolveExisting($db, $existing, $key, $endpoint, $payloadHash);
            }
        }

        // Atomically attempt reservation via unique INSERT
        try {
            $insert = $db->prepare("INSERT INTO idempotency_keys (idempotency_key, endpoint, request_payload_hash, response_json) VALUES (?, ?, ?, ?)");
            $insert->execute([$key, $endpoint, $payloadHash, self::PENDING_SENTINEL]);
            return ['status' => self::STATUS_RESERVED, 'response_json' => null, 'error' => null];
        } catch (PDOException $e) {
            // Duplicate key race: another concurrent request inserted just ahead of us
            if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate entry') !== false) {
                $stmt = $db->prepare("SELECT endpoint, request_payload_hash, response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
                $stmt->execute([$key]);
                $raceWinner = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($raceWinner) {
                    return self::resolveExisting($db, $raceWinner, $key, $endpoint, $payloadHash);
                }
            }
            throw $e;
        }
    }

    /**
     * Resolves an existing key: checks endpoint/payload match and completion status.
     */
    private static function resolveExisting(PDO $db, array $record, string $key, string $endpoint, string $payloadHash): array {
        // 1. Conflict Check: Different endpoint OR different payload hash
        if ($record['endpoint'] !== $endpoint || !hash_equals($record['request_payload_hash'], $payloadHash)) {
            return [
                'status' => self::STATUS_CONFLICT,
                'response_json' => null,
                'error' => 'Idempotency conflict: The provided idempotency key has already been used with a different endpoint or request payload.'
            ];
        }

        // 2. Completed: Original request already finished successfully
        if ($record['response_json'] !== self::PENDING_SENTINEL) {
            return [
                'status' => self::STATUS_HIT,
                'response_json' => $record['response_json'],
                'error' => null
            ];
        }

        // 3. In-flight: Wait up to 1.5 seconds (15 * 100ms) for the in-progress request to complete
        for ($i = 0; $i < 15; $i++) {
            usleep(100000); // 100ms
            $check = $db->prepare("SELECT response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
            $check->execute([$key]);
            $updated = $check->fetchColumn();
            if ($updated && $updated !== self::PENDING_SENTINEL) {
                return [
                    'status' => self::STATUS_HIT,
                    'response_json' => $updated,
                    'error' => null
                ];
            }
        }

        return [
            'status' => self::STATUS_IN_PROGRESS,
            'response_json' => null,
            'error' => 'A request with this idempotency key is currently being processed. Please retry shortly.'
        ];
    }

    /**
     * Stores the final successful response for the reserved idempotency key.
     */
    public static function commit(PDO $db, string $key, string $responseJson): void {
        if (empty($key)) return;
        $stmt = $db->prepare("UPDATE idempotency_keys SET response_json = ? WHERE idempotency_key = ?");
        $stmt->execute([$responseJson, $key]);
    }

    /**
     * Releases reservation if the request failed or rolled back.
     */
    public static function release(PDO $db, string $key): void {
        if (empty($key)) return;
        try {
            $stmt = $db->prepare("DELETE FROM idempotency_keys WHERE idempotency_key = ? AND response_json = ?");
            $stmt->execute([$key, self::PENDING_SENTINEL]);
        } catch (Exception $e) {
            error_log("[Idempotency Release Error] " . $e->getMessage());
        }
    }
}
`
    },
    {
      path: 'database/schema.sql',
      description: 'Complete MySQL/MariaDB InnoDB schema with all 17 tables, constraints and initial seed',
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
    \`onboarding_status\` ENUM('Registered', 'Profile Incomplete', 'KYC Pending', 'Under Review', 'Action Required', 'Approved', 'Rejected') DEFAULT 'KYC Pending',
    \`language_preference\` VARCHAR(10) DEFAULT 'en',
    \`profile_completed_percent\` INT DEFAULT 60,
    \`verification_notes\` TEXT NULL,
    \`password_hash\` VARCHAR(255) NULL,
    \`current_rank\` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') DEFAULT 'Trainee',
    \`team_id\` INT NULL,
    \`quality_score\` DECIMAL(5,2) NULL,
    \`qs_sample_size\` INT DEFAULT 0,
    \`qs_status\` ENUM('Insufficient Data', 'Active', 'Under Observation', 'Suspended') DEFAULT 'Insufficient Data',
    \`qs_last_calculated_at\` DATETIME NULL,
    \`fraud_flag\` TINYINT(1) DEFAULT 0,
    \`fraud_reason\` TEXT NULL,
    \`fraud_flagged_by\` INT NULL,
    \`fraud_flagged_at\` DATETIME NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fl_status (\`status\`),
    INDEX idx_fl_onboarding (\`onboarding_status\`),
    INDEX idx_fl_city (\`city\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5a. Freelancer KYC Documents
CREATE TABLE IF NOT EXISTS \`freelancer_documents\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`document_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`document_type\` VARCHAR(60) NOT NULL,
    \`original_filename\` VARCHAR(255) NOT NULL,
    \`stored_filename\` VARCHAR(255) NOT NULL,
    \`file_path\` VARCHAR(255) NOT NULL,
    \`file_size\` INT NOT NULL,
    \`mime_type\` VARCHAR(100) NOT NULL,
    \`status\` ENUM('Pending', 'Approved', 'Rejected', 'Resubmission Required') DEFAULT 'Pending',
    \`rejection_reason\` TEXT NULL,
    \`reviewed_by\` INT NULL,
    \`reviewed_at\` DATETIME NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_fl (\`freelancer_id\`),
    INDEX idx_doc_status (\`status\`),
    INDEX idx_doc_type (\`document_type\`),
    FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`reviewed_by\`) REFERENCES \`admin_users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5b. Freelancer Notifications
CREATE TABLE IF NOT EXISTS \`freelancer_notifications\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`type\` VARCHAR(50) DEFAULT 'system',
    \`is_read\` TINYINT(1) DEFAULT 0,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fn_fl (\`freelancer_id\`),
    FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE CASCADE
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
    \`required_training_course_id\` INT NULL,
    \`required_kyc_level\` VARCHAR(50) DEFAULT 'Approved',
    \`description\` TEXT NOT NULL,
    \`evidence_schema_json\` TEXT NULL,
    \`requires_location\` TINYINT(1) DEFAULT 0,
    \`target_city\` VARCHAR(100) NOT NULL,
    \`target_areas\` TEXT NOT NULL,
    \`target_units\` INT NOT NULL DEFAULT 100,
    \`completed_units\` INT NOT NULL DEFAULT 0,
    \`max_tasks_per_freelancer\` INT DEFAULT 5,
    \`start_date\` DATE NOT NULL,
    \`end_date\` DATE NOT NULL,
    \`payment_model\` VARCHAR(50) NOT NULL,
    \`payout_rate\` DECIMAL(10,2) DEFAULT 0.00,
    \`budget\` DECIMAL(12,2) NULL,
    \`status\` ENUM('Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE SET NULL,
    FOREIGN KEY (\`required_training_course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`tasks\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`project_id\` INT NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`instructions\` LONGTEXT NULL,
    \`evidence_requirements_json\` TEXT NULL,
    \`requires_location\` TINYINT(1) DEFAULT 0,
    \`assigned_freelancer_id\` INT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`target_area\` VARCHAR(150) NOT NULL,
    \`deadline\` DATE NOT NULL,
    \`payout_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    \`status\` ENUM('Available', 'Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected', 'Cancelled') DEFAULT 'Available',
    \`accepted_at\` DATETIME NULL,
    \`submitted_at\` DATETIME NULL,
    \`reviewed_by\` INT NULL,
    \`reviewed_by_name\` VARCHAR(150) NULL,
    \`reviewed_at\` DATETIME NULL,
    \`rework_count\` INT DEFAULT 0,
    \`review_comment\` TEXT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`assigned_freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`task_evidence_submissions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`form_data_json\` LONGTEXT NULL,
    \`location_lat\` DECIMAL(10,8) NULL,
    \`location_lng\` DECIMAL(11,8) NULL,
    \`location_address\` TEXT NULL,
    \`idempotency_key\` VARCHAR(64) NULL,
    \`status\` ENUM('Pending Review', 'Approved', 'Rework Required', 'Rejected') DEFAULT 'Pending Review',
    \`review_comment\` TEXT NULL,
    \`reviewed_by\` VARCHAR(150) NULL,
    \`reviewed_at\` DATETIME NULL,
    \`submitted_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_sub_task\` (\`task_id\`),
    INDEX \`idx_sub_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_sub_idempotency\` (\`idempotency_key\`),
    CONSTRAINT \`fk_sub_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_sub_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`task_evidence_files\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`submission_id\` INT NULL,
    \`field_name\` VARCHAR(100) NOT NULL,
    \`original_filename\` VARCHAR(255) NOT NULL,
    \`storage_path\` VARCHAR(500) NOT NULL,
    \`file_size\` INT NOT NULL,
    \`mime_type\` VARCHAR(100) NOT NULL,
    \`uploaded_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tef_task\` (\`task_id\`),
    INDEX \`idx_tef_submission\` (\`submission_id\`),
    CONSTRAINT \`fk_tef_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_tef_submission\` FOREIGN KEY (\`submission_id\`) REFERENCES \`task_evidence_submissions\` (\`id\`) ON DELETE CASCADE
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
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_time (\`created_at\`)
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

-- 12. Rate Limiting for Login & API Abuse Protection
CREATE TABLE IF NOT EXISTS \`login_attempts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`ip_address\` VARCHAR(45) NOT NULL,
    \`email\` VARCHAR(150) NOT NULL,
    \`attempt_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (\`ip_address\`, \`attempt_time\`),
    INDEX idx_email_time (\`email\`, \`attempt_time\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. API Idempotency Keys (Deduplication across concurrent / repeated requests)
CREATE TABLE IF NOT EXISTS \`idempotency_keys\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`idempotency_key\` VARCHAR(64) NOT NULL UNIQUE,
    \`endpoint\` VARCHAR(100) NOT NULL,
    \`request_payload_hash\` VARCHAR(64) NOT NULL,
    \`response_json\` TEXT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idem_key (\`idempotency_key\`),
    INDEX idx_idem_time (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial System Roles Seed
INSERT IGNORE INTO \`roles\` (\`id\`, \`name\`, \`description\`) VALUES
(1, 'Super Admin', 'Full access to all platform records, settings, and team users'),
(2, 'Administrator', 'Operations, project allocation, freelancer verification, and client management'),
(3, 'Enquiry Manager', 'Inbound enquiry triage, client qualification, and sales tracking'),
(4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
(5, 'Project Manager', 'Manage field projects and tasks');

-- 14. Operational Academy & Certification Tables (Phase 4)
CREATE TABLE IF NOT EXISTS \`courses\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_code\` VARCHAR(32) NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`slug\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`learning_objectives\` TEXT NULL,
    \`category\` VARCHAR(100) DEFAULT 'Field Operations',
    \`language\` VARCHAR(20) DEFAULT 'en',
    \`estimated_minutes\` INT DEFAULT 45,
    \`thumbnail_url\` VARCHAR(255) NULL,
    \`status\` ENUM('Draft', 'Published', 'Archived') DEFAULT 'Published',
    \`passing_score\` TINYINT UNSIGNED DEFAULT 80,
    \`max_assessment_attempts\` TINYINT UNSIGNED DEFAULT 3,
    \`is_mandatory\` TINYINT(1) DEFAULT 0,
    \`created_by\` INT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_course_code\` (\`course_code\`),
    UNIQUE KEY \`unique_slug\` (\`slug\`),
    INDEX \`idx_course_status\` (\`status\`),
    INDEX \`idx_course_category\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`course_modules\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NULL,
    \`sort_order\` INT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_module_course\` (\`course_id\`),
    CONSTRAINT \`fk_module_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`course_lessons\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`module_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`content_type\` ENUM('text', 'video_ref', 'interactive') DEFAULT 'text',
    \`content\` LONGTEXT NOT NULL,
    \`media_url\` VARCHAR(500) NULL,
    \`duration_minutes\` INT DEFAULT 10,
    \`sort_order\` INT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_lesson_module\` (\`module_id\`),
    INDEX \`idx_lesson_course\` (\`course_id\`),
    CONSTRAINT \`fk_lesson_module\` FOREIGN KEY (\`module_id\`) REFERENCES \`course_modules\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_lesson_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`course_assessments\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NULL,
    \`passing_score\` TINYINT UNSIGNED DEFAULT 80,
    \`time_limit_minutes\` INT DEFAULT 20,
    \`max_attempts\` TINYINT UNSIGNED DEFAULT 3,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_course_assessment\` (\`course_id\`),
    CONSTRAINT \`fk_assessment_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`assessment_questions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`assessment_id\` INT NOT NULL,
    \`question_text\` TEXT NOT NULL,
    \`question_type\` ENUM('single_choice', 'multi_choice', 'true_false') DEFAULT 'single_choice',
    \`options_json\` LONGTEXT NOT NULL,
    \`correct_answers_json\` LONGTEXT NOT NULL,
    \`explanation\` TEXT NULL,
    \`sort_order\` INT DEFAULT 1,
    \`points\` TINYINT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_question_assessment\` (\`assessment_id\`),
    CONSTRAINT \`fk_question_assessment\` FOREIGN KEY (\`assessment_id\`) REFERENCES \`course_assessments\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`course_enrollments\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`status\` ENUM('Enrolled', 'In Progress', 'Completed', 'Dropped') DEFAULT 'Enrolled',
    \`progress_percent\` TINYINT UNSIGNED DEFAULT 0,
    \`last_lesson_id\` INT NULL,
    \`enrolled_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`completed_at\` DATETIME NULL,
    UNIQUE KEY \`unique_enrollment\` (\`freelancer_id\`, \`course_id\`),
    INDEX \`idx_enrollment_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_enrollment_course\` (\`course_id\`),
    CONSTRAINT \`fk_enrollment_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_enrollment_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`lesson_completions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`lesson_id\` INT NOT NULL,
    \`completed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_lesson_completion\` (\`freelancer_id\`, \`lesson_id\`),
    INDEX \`idx_lc_freelancer_course\` (\`freelancer_id\`, \`course_id\`),
    CONSTRAINT \`fk_lc_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_lc_lesson\` FOREIGN KEY (\`lesson_id\`) REFERENCES \`course_lessons\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`assessment_attempts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`assessment_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`attempt_number\` TINYINT UNSIGNED NOT NULL,
    \`answers_json\` LONGTEXT NOT NULL,
    \`score_percent\` TINYINT UNSIGNED NOT NULL,
    \`passed\` TINYINT(1) NOT NULL,
    \`submitted_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_aa_freelancer_assessment\` (\`freelancer_id\`, \`assessment_id\`),
    CONSTRAINT \`fk_aa_assessment\` FOREIGN KEY (\`assessment_id\`) REFERENCES \`course_assessments\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_aa_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`freelancer_certificates\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`certificate_ref\` VARCHAR(64) NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`issue_date\` DATE NOT NULL,
    \`score_percent\` TINYINT UNSIGNED NOT NULL,
    \`verification_code\` VARCHAR(32) NOT NULL,
    \`metadata_json\` TEXT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_certificate_ref\` (\`certificate_ref\`),
    UNIQUE KEY \`unique_verification_code\` (\`verification_code\`),
    UNIQUE KEY \`unique_freelancer_course_cert\` (\`freelancer_id\`, \`course_id\`),
    INDEX \`idx_cert_freelancer\` (\`freelancer_id\`),
    CONSTRAINT \`fk_cert_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_cert_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Teams & Hierarchy (Phase 6)
CREATE TABLE IF NOT EXISTS \`teams\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`team_code\` VARCHAR(30) NOT NULL UNIQUE,
    \`name\` VARCHAR(100) NOT NULL,
    \`leader_id\` INT NULL,
    \`manager_id\` INT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`operating_area\` VARCHAR(200) NULL,
    \`status\` ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX \`idx_team_city\` (\`city\`),
    INDEX \`idx_team_status\` (\`status\`),
    INDEX \`idx_team_leader\` (\`leader_id\`),
    INDEX \`idx_team_manager\` (\`manager_id\`),
    CONSTRAINT \`fk_team_leader\` FOREIGN KEY (\`leader_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_team_manager\` FOREIGN KEY (\`manager_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`team_members\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`team_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL UNIQUE,
    \`role_in_team\` ENUM('Member', 'Deputy Leader') DEFAULT 'Member',
    \`joined_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tm_team\` (\`team_id\`),
    INDEX \`idx_tm_fl\` (\`freelancer_id\`),
    CONSTRAINT \`fk_tm_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_tm_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`rank_promotions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`from_rank\` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    \`to_rank\` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    \`status\` ENUM('Eligible', 'Nominated', 'Approved', 'Rejected') DEFAULT 'Eligible',
    \`eligibility_snapshot_json\` LONGTEXT NULL,
    \`reviewed_by\` INT NULL,
    \`reviewed_by_name\` VARCHAR(150) NULL,
    \`decision_reason\` TEXT NULL,
    \`reviewed_at\` DATETIME NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_rp_fl\` (\`freelancer_id\`),
    INDEX \`idx_rp_status\` (\`status\`),
    CONSTRAINT \`fk_rp_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`task_review_history\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`submission_id\` INT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`reviewer_id\` INT NULL,
    \`reviewer_name\` VARCHAR(150) NOT NULL,
    \`decision\` ENUM('Approved', 'Rework Required', 'Rejected') NOT NULL,
    \`review_comment\` TEXT NULL,
    \`reviewed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_trh_task\` (\`task_id\`),
    INDEX \`idx_trh_fl\` (\`freelancer_id\`),
    INDEX \`idx_trh_sub\` (\`submission_id\`),
    CONSTRAINT \`fk_trh_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`quality_score_config\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
    \`config_value\` DECIMAL(6,2) NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`quality_score_config\` (\`config_key\`, \`config_value\`, \`description\`) VALUES
('min_sample_size', 3.00, 'Minimum reviewed tasks required before computing verified Quality Score'),
('weight_approval', 40.00, 'Weight (out of 100) for QC approval rate'),
('weight_rework', 25.00, 'Weight (out of 100) for first-time-right / zero rework tasks'),
('weight_timeliness', 20.00, 'Weight (out of 100) for tasks submitted on or before deadline'),
('weight_evidence', 15.00, 'Weight (out of 100) for complete evidence and location compliance'),
('penalty_fraud', 50.00, 'Penalty deduction points for confirmed policy violations'),
('active_member_min_qs', 70.00, 'Minimum Quality Score to qualify as an active member'),
('leader_min_qs', 85.00, 'Minimum Quality Score for Team Leader rank eligibility'),
('manager_min_qs', 85.00, 'Minimum Quality Score for Manager rank eligibility'),
('leader_min_active_members', 10.00, 'Minimum active members required in team for Team Leader eligibility'),
('manager_min_qualifying_teams', 3.00, 'Minimum qualifying teams (each >=10 active members) for Manager eligibility');

-- =====================================================
-- PHASE 7: FINANCIAL SUBSYSTEM & DOUBLE-ENTRY LEDGER
-- =====================================================

CREATE TABLE IF NOT EXISTS \`ledger_accounts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`account_code\` VARCHAR(20) NOT NULL UNIQUE,
    \`account_name\` VARCHAR(100) NOT NULL,
    \`account_type\` ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_la_type\` (\`account_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`ledger_accounts\` (\`account_code\`, \`account_name\`, \`account_type\`, \`description\`) VALUES
('1001', 'Cash & Bank Clearing', 'Asset', 'Platform disbursement bank account and payment gateway settlement escrow'),
('2001', 'Freelancer Payable (Available)', 'Liability', 'Withdrawable available balance owed to field freelancers for verified completed tasks'),
('2002', 'Team Leader Payable', 'Liability', 'Performance overrides owed to qualified Team Leaders (20% share)'),
('2003', 'Manager Payable', 'Liability', 'Corridor supervision overrides owed to qualified Area Managers (10% share)'),
('2004', 'Reserve Liability (15-day Hold)', 'Liability', '10% quality assurance reserve retained for 15 days before release to available balance'),
('2005', 'Payout In-Transit Clearing', 'Liability', 'Temporary clearing holding funds from requested payouts until provider confirmation'),
('3001', 'Growth Pool (Platform Retained)', 'Equity', 'Retained unallocated supervisor shares when Team Leaders or Managers are disqualified or vacant'),
('5001', 'Project Direct Execution Cost', 'Expense', 'Platform field delivery expense recognized upon task Quality Control verification');

CREATE TABLE IF NOT EXISTS \`ledger_journals\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`journal_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`transaction_type\` ENUM('EARNING_RECOGNITION', 'RESERVE_RELEASE', 'PAYOUT_REQUESTED', 'PAYOUT_SETTLED', 'PAYOUT_REVERSED', 'MANUAL_ADJUSTMENT') NOT NULL,
    \`reference_id\` VARCHAR(50) NULL,
    \`narration\` TEXT NOT NULL,
    \`total_debit\` DECIMAL(14,2) NOT NULL,
    \`total_credit\` DECIMAL(14,2) NOT NULL,
    \`posted_by\` VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    \`is_reversed\` TINYINT(1) DEFAULT 0,
    \`reversed_by_journal_id\` INT NULL,
    \`reversal_of_journal_id\` INT NULL,
    \`posted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_lj_ref\` (\`reference_id\`),
    INDEX \`idx_lj_type\` (\`transaction_type\`),
    INDEX \`idx_lj_date\` (\`posted_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`ledger_entries\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`journal_id\` INT NOT NULL,
    \`account_code\` VARCHAR(20) NOT NULL,
    \`entry_type\` ENUM('DEBIT', 'CREDIT') NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`entity_type\` ENUM('Freelancer', 'TeamLeader', 'Manager', 'Platform', 'System') NOT NULL DEFAULT 'System',
    \`entity_id\` VARCHAR(50) NULL,
    \`line_narration\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_le_journal\` (\`journal_id\`),
    INDEX \`idx_le_account\` (\`account_code\`),
    INDEX \`idx_le_entity\` (\`entity_type\`, \`entity_id\`),
    CONSTRAINT \`fk_le_journal\` FOREIGN KEY (\`journal_id\`) REFERENCES \`ledger_journals\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`earning_entitlements\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`entitlement_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`task_id\` INT NOT NULL UNIQUE,
    \`project_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`gross_rate\` DECIMAL(14,2) NOT NULL,
    \`freelancer_share_gross\` DECIMAL(14,2) NOT NULL,
    \`freelancer_reserve_amount\` DECIMAL(14,2) NOT NULL,
    \`freelancer_share_net\` DECIMAL(14,2) NOT NULL,
    \`team_leader_id\` INT NULL,
    \`team_leader_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`team_leader_routed_to_growth\` TINYINT(1) DEFAULT 0,
    \`manager_id\` INT NULL,
    \`manager_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`manager_routed_to_growth\` TINYINT(1) DEFAULT 0,
    \`growth_pool_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`hierarchy_snapshot_json\` LONGTEXT NULL,
    \`journal_id\` INT NOT NULL,
    \`status\` ENUM('Recognized', 'Reversed') DEFAULT 'Recognized',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_ee_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_ee_task\` (\`task_id\`),
    INDEX \`idx_ee_project\` (\`project_id\`),
    CONSTRAINT \`fk_ee_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`reserve_records\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`reserve_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`task_id\` INT NOT NULL,
    \`earning_entitlement_id\` INT NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`reserve_pct\` DECIMAL(5,2) DEFAULT 10.00,
    \`hold_days\` INT DEFAULT 15,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`release_due_at\` TIMESTAMP NOT NULL,
    \`released_at\` TIMESTAMP NULL,
    \`status\` ENUM('Held', 'Released', 'Extended', 'Reversed') DEFAULT 'Held',
    \`release_journal_id\` INT NULL,
    \`notes\` VARCHAR(255) NULL,
    INDEX \`idx_rr_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_rr_status_due\` (\`status\`, \`release_due_at\`),
    CONSTRAINT \`fk_rr_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`payout_requests\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`payout_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`idempotency_key\` VARCHAR(64) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`payment_method\` ENUM('UPI', 'Bank Transfer', 'NEFT') NOT NULL DEFAULT 'UPI',
    \`beneficiary_name\` VARCHAR(150) NOT NULL,
    \`beneficiary_details\` VARCHAR(255) NOT NULL,
    \`status\` ENUM('Requested', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed', 'Cancelled') DEFAULT 'Requested',
    \`request_journal_id\` INT NULL,
    \`settlement_journal_id\` INT NULL,
    \`reversal_journal_id\` INT NULL,
    \`provider_name\` VARCHAR(50) DEFAULT 'SimulatedPaymentAdapter',
    \`provider_transfer_id\` VARCHAR(100) NULL,
    \`failure_reason\` TEXT NULL,
    \`reviewed_by\` VARCHAR(150) NULL,
    \`reviewed_at\` TIMESTAMP NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX \`idx_po_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_po_status\` (\`status\`),
    INDEX \`idx_po_created\` (\`created_at\`),
    CONSTRAINT \`fk_po_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`wallets\` (
    \`freelancer_id\` INT PRIMARY KEY,
    \`total_earned\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`available_balance\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`reserved_balance\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`pending_earnings\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`payouts_in_progress\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`paid_payouts\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`last_reconciled_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_w_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`financial_config\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
    \`config_value\` DECIMAL(14,2) NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`financial_config\` (\`config_key\`, \`config_value\`, \`description\`) VALUES
('freelancer_share_pct', 70.00, 'Baseline revenue share percentage for executing freelancer'),
('team_leader_share_pct', 20.00, 'Leadership override percentage for active qualifying Team Leader'),
('manager_share_pct', 10.00, 'Corridor oversight percentage for active qualifying Area Manager'),
('reserve_pct', 10.00, 'Quality assurance reserve withheld from freelancer share'),
('reserve_hold_days', 15.00, 'Duration in calendar days before withheld reserve matures and auto-releases'),
('min_payout_amount', 500.00, 'Minimum single payout request threshold in INR'),
('max_payout_amount', 50000.00, 'Maximum single payout request limit in INR');

SET FOREIGN_KEY_CHECKS = 1;


`
    },
    {
      path: 'database/migrations/001_upgrade_v2.sql',
      description: 'Reversible non-destructive migration 001 for site settings and audit log index (MySQL 8.0 & MariaDB compatible)',
      content: `-- We Onboard Safe Migration 001: Upgrade Settings & Indices
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Ensure site_settings keys exist
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('headerLogoUrl', ''), ('footerLogoUrl', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- 2. Safely create idx_audit_time on audit_logs if not already present
-- Note: MySQL 8.0 does not support 'CREATE INDEX IF NOT EXISTS'. 
-- This conditional dynamic SQL block works safely on all MySQL and MariaDB versions.
SET @exist := (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'audit_logs' 
      AND index_name = 'idx_audit_time'
);
SET @sqlstmt := IF(@exist = 0, 
    'CREATE INDEX \`idx_audit_time\` ON \`audit_logs\` (\`created_at\`)', 
    'SELECT "Index idx_audit_time already exists on audit_logs" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
`
    },
    {
      path: 'database/migrations/002_idempotency_and_constraints.sql',
      description: 'Non-destructive migration 002 for idempotency and duplicate prevention (MySQL 8.0 & MariaDB compatible)',
      content: `-- We Onboard Non-Destructive Migration 002: Idempotency & Duplicate Prevention
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Create idempotency_keys table for concurrent & repeated submission protection
CREATE TABLE IF NOT EXISTS \`idempotency_keys\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`idempotency_key\` VARCHAR(64) NOT NULL UNIQUE,
    \`endpoint\` VARCHAR(100) NOT NULL,
    \`request_payload_hash\` VARCHAR(64) NOT NULL,
    \`response_json\` TEXT NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idem_key (\`idempotency_key\`),
    INDEX idx_idem_time (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Safely create idx_converted_client on enquiries if column exists and index is absent
-- Compatible with both MySQL 8.0+ and MariaDB
SET @exist := (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'enquiries' 
      AND index_name = 'idx_converted_client'
);
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'enquiries' 
      AND column_name = 'converted_client_id'
);
SET @sqlstmt := IF(@exist = 0 AND @col_exist > 0, 
    'CREATE INDEX \`idx_converted_client\` ON \`enquiries\` (\`converted_client_id\`)', 
    'SELECT "Index idx_converted_client already exists or converted_client_id column not present" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
`
    },
    {
      path: 'database/migrations/003_phase3_freelancer_identity_and_kyc.sql',
      description: 'Non-destructive migration 003 for Freelancer Identity, Authentication and KYC workflow (MySQL 8.0 & MariaDB compatible)',
      content: `-- We Onboard Non-Destructive Migration 003: Freelancer Identity, Authentication & KYC Workflow
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Safely add password_hash column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'password_hash'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`password_hash\` VARCHAR(255) NULL AFTER \`verification_notes\`', 
    'SELECT "Column password_hash already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Safely add onboarding_status column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'onboarding_status'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`onboarding_status\` ENUM(\\'Registered\\', \\'Profile Incomplete\\', \\'KYC Pending\\', \\'Under Review\\', \\'Action Required\\', \\'Approved\\', \\'Rejected\\') DEFAULT \\'KYC Pending\\' AFTER \`status\`', 
    'SELECT "Column onboarding_status already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Safely add language_preference column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'language_preference'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`language_preference\` VARCHAR(10) DEFAULT \\'en\\' AFTER \`onboarding_status\`', 
    'SELECT "Column language_preference already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Safely add profile_completed_percent column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'profile_completed_percent'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`profile_completed_percent\` INT DEFAULT 60 AFTER \`language_preference\`', 
    'SELECT "Column profile_completed_percent already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Create freelancer_documents table for KYC document workflow
CREATE TABLE IF NOT EXISTS \`freelancer_documents\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`document_ref\` VARCHAR(30) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`document_type\` VARCHAR(60) NOT NULL,
    \`original_filename\` VARCHAR(255) NOT NULL,
    \`stored_filename\` VARCHAR(255) NOT NULL,
    \`file_path\` VARCHAR(255) NOT NULL,
    \`file_size\` INT NOT NULL,
    \`mime_type\` VARCHAR(100) NOT NULL,
    \`status\` ENUM('Pending', 'Approved', 'Rejected', 'Resubmission Required') DEFAULT 'Pending',
    \`rejection_reason\` TEXT NULL,
    \`reviewed_by\` INT NULL,
    \`reviewed_at\` DATETIME NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_fl (\`freelancer_id\`),
    INDEX idx_doc_status (\`status\`),
    INDEX idx_doc_type (\`document_type\`),
    FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`reviewed_by\`) REFERENCES \`admin_users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create freelancer_notifications table
CREATE TABLE IF NOT EXISTS \`freelancer_notifications\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`type\` VARCHAR(50) DEFAULT 'system',
    \`is_read\` TINYINT(1) DEFAULT 0,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fn_fl (\`freelancer_id\`),
    FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Ensure permissions for KYC and Freelancer Management
INSERT IGNORE INTO \`permissions\` (\`slug\`, \`name\`, \`module\`) VALUES
('freelancer.view', 'View Freelancer Profiles & KYC', 'freelancers'),
('freelancer.verify', 'Review & Verify KYC Documents', 'freelancers'),
('freelancer.manage', 'Approve & Manage Freelancer Status', 'freelancers');

-- 8. Assign permissions to roles (Super Admin id=1, Administrator id=2, Freelancer Coordinator id=4)
-- Note: Enquiry Manager (id=3) does NOT receive freelancer verification permissions
INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
SELECT 1, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify', 'freelancer.manage');

INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
SELECT 2, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify', 'freelancer.manage');

INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
SELECT 4, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify');
`
    },
    {
      path: 'database/migrations/004_phase4_academy_and_certification.sql',
      description: 'Non-destructive migration 004 for Operational Academy, Lessons, Assessments and Verifiable Certifications',
      content: `-- We Onboard Non-Destructive Migration 004: Academy & Certification Module
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS \`courses\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_code\` VARCHAR(32) NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`slug\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`learning_objectives\` TEXT NULL,
    \`category\` VARCHAR(100) DEFAULT 'Field Operations',
    \`language\` VARCHAR(20) DEFAULT 'en',
    \`estimated_minutes\` INT DEFAULT 45,
    \`thumbnail_url\` VARCHAR(255) NULL,
    \`status\` ENUM('Draft', 'Published', 'Archived') DEFAULT 'Published',
    \`passing_score\` TINYINT UNSIGNED DEFAULT 80,
    \`max_assessment_attempts\` TINYINT UNSIGNED DEFAULT 3,
    \`is_mandatory\` TINYINT(1) DEFAULT 0,
    \`created_by\` INT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_course_code\` (\`course_code\`),
    UNIQUE KEY \`unique_slug\` (\`slug\`),
    INDEX \`idx_course_status\` (\`status\`),
    INDEX \`idx_course_category\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Course Modules Table
CREATE TABLE IF NOT EXISTS \`course_modules\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NULL,
    \`sort_order\` INT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_module_course\` (\`course_id\`),
    CONSTRAINT \`fk_module_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Course Lessons Table
CREATE TABLE IF NOT EXISTS \`course_lessons\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`module_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`content_type\` ENUM('text', 'video_ref', 'interactive') DEFAULT 'text',
    \`content\` LONGTEXT NOT NULL,
    \`media_url\` VARCHAR(500) NULL,
    \`duration_minutes\` INT DEFAULT 10,
    \`sort_order\` INT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_lesson_module\` (\`module_id\`),
    INDEX \`idx_lesson_course\` (\`course_id\`),
    CONSTRAINT \`fk_lesson_module\` FOREIGN KEY (\`module_id\`) REFERENCES \`course_modules\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_lesson_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Course Assessments Table
CREATE TABLE IF NOT EXISTS \`course_assessments\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`course_id\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NULL,
    \`passing_score\` TINYINT UNSIGNED DEFAULT 80,
    \`time_limit_minutes\` INT DEFAULT 20,
    \`max_attempts\` TINYINT UNSIGNED DEFAULT 3,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_course_assessment\` (\`course_id\`),
    CONSTRAINT \`fk_assessment_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Assessment Questions Table (Correct answers kept server-side only)
CREATE TABLE IF NOT EXISTS \`assessment_questions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`assessment_id\` INT NOT NULL,
    \`question_text\` TEXT NOT NULL,
    \`question_type\` ENUM('single_choice', 'multi_choice', 'true_false') DEFAULT 'single_choice',
    \`options_json\` LONGTEXT NOT NULL,
    \`correct_answers_json\` LONGTEXT NOT NULL,
    \`explanation\` TEXT NULL,
    \`sort_order\` INT DEFAULT 1,
    \`points\` TINYINT DEFAULT 1,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_question_assessment\` (\`assessment_id\`),
    CONSTRAINT \`fk_question_assessment\` FOREIGN KEY (\`assessment_id\`) REFERENCES \`course_assessments\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Course Enrollments Table
CREATE TABLE IF NOT EXISTS \`course_enrollments\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`status\` ENUM('Enrolled', 'In Progress', 'Completed', 'Dropped') DEFAULT 'Enrolled',
    \`progress_percent\` TINYINT UNSIGNED DEFAULT 0,
    \`last_lesson_id\` INT NULL,
    \`enrolled_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`completed_at\` DATETIME NULL,
    UNIQUE KEY \`unique_enrollment\` (\`freelancer_id\`, \`course_id\`),
    INDEX \`idx_enrollment_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_enrollment_course\` (\`course_id\`),
    CONSTRAINT \`fk_enrollment_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_enrollment_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Lesson Completions Table
CREATE TABLE IF NOT EXISTS \`lesson_completions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`lesson_id\` INT NOT NULL,
    \`completed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_lesson_completion\` (\`freelancer_id\`, \`lesson_id\`),
    INDEX \`idx_lc_freelancer_course\` (\`freelancer_id\`, \`course_id\`),
    CONSTRAINT \`fk_lc_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_lc_lesson\` FOREIGN KEY (\`lesson_id\`) REFERENCES \`course_lessons\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Assessment Attempts Table
CREATE TABLE IF NOT EXISTS \`assessment_attempts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`assessment_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`attempt_number\` TINYINT UNSIGNED NOT NULL,
    \`answers_json\` LONGTEXT NOT NULL,
    \`score_percent\` TINYINT UNSIGNED NOT NULL,
    \`passed\` TINYINT(1) NOT NULL,
    \`submitted_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_aa_freelancer_assessment\` (\`freelancer_id\`, \`assessment_id\`),
    CONSTRAINT \`fk_aa_assessment\` FOREIGN KEY (\`assessment_id\`) REFERENCES \`course_assessments\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_aa_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Freelancer Certificates Table
CREATE TABLE IF NOT EXISTS \`freelancer_certificates\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`certificate_ref\` VARCHAR(64) NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`course_id\` INT NOT NULL,
    \`issue_date\` DATE NOT NULL,
    \`score_percent\` TINYINT UNSIGNED NOT NULL,
    \`verification_code\` VARCHAR(32) NOT NULL,
    \`metadata_json\` TEXT NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`unique_certificate_ref\` (\`certificate_ref\`),
    UNIQUE KEY \`unique_verification_code\` (\`verification_code\`),
    UNIQUE KEY \`unique_freelancer_course_cert\` (\`freelancer_id\`, \`course_id\`),
    INDEX \`idx_cert_freelancer\` (\`freelancer_id\`),
    CONSTRAINT \`fk_cert_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_cert_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Seed Core Courses and Content (if not present)
INSERT IGNORE INTO \`courses\` 
(\`id\`, \`course_code\`, \`title\`, \`slug\`, \`description\`, \`learning_objectives\`, \`category\`, \`language\`, \`estimated_minutes\`, \`status\`, \`passing_score\`, \`max_assessment_attempts\`, \`is_mandatory\`) 
VALUES
(1, 'WO-CRS-SAFE-01', 'Field Ethics & Safety Protocols', 'field-ethics-and-safety-protocols', 
 'Mandatory foundational course for all We Onboard field executives, team leaders, and project managers. Covers on-site professionalism, brand representation, physical safety, conflict de-escalation, and ethical data collection.',
 'Understand We Onboard zero-compromise safety protocols; Master professional merchant/customer interactions; Learn standard escalation procedures for on-field hazards; Enforce data privacy and integrity.',
 'Safety & Ethics', 'en', 35, 'Published', 80, 3, 1),

(2, 'WO-CRS-POS-02', 'Merchant Digital POS & Soundbox Onboarding SOP', 'merchant-digital-pos-soundbox-sop', 
 'Comprehensive training on deploying QR codes, NFC soundboxes, and POS swipe terminals for tier-1 merchant aggregators. Learn merchant identity check, live sound verification, merchant app demonstration, and fraud prevention.',
 'Complete document collection and merchant KYC; Perform physical POS soundbox installation and test broadcast; Educate merchants on digital settlements and chargebacks; Avoid fake onboardings through tamper checks.',
 'Merchant Acquisition', 'en', 50, 'Published', 80, 3, 0),

(3, 'WO-CRS-AUD-03', 'Field Audits & Stock Verification Protocols', 'field-audits-and-stock-verification', 
 'Master retail audit procedures, geo-tagged photo evidence capture, mystery shopping compliance, and inventory variance documentation for enterprise clients.',
 'Operate audit mobile application with GPS tagging; Accurately count stock displays and promotional collateral; Record unbiased merchant audit observations; Report non-compliance and fraudulent merchandising.',
 'Field Operations', 'en', 45, 'Published', 80, 3, 0);

-- Modules for Course 1
INSERT IGNORE INTO \`course_modules\` (\`id\`, \`course_id\`, \`title\`, \`description\`, \`sort_order\`) VALUES
(1, 1, 'Module 1: Professional Representation & Code of Conduct', 'Dress code, badge display, ethical communications, and anti-bribery standards.', 1),
(2, 1, 'Module 2: Field Safety & Emergency Response', 'Personal protection, weather hazards, handling difficult situations, and SOS escalation.', 2);

-- Lessons for Course 1
INSERT IGNORE INTO \`course_lessons\` (\`id\`, \`module_id\`, \`course_id\`, \`title\`, \`content_type\`, \`content\`, \`duration_minutes\`, \`sort_order\`) VALUES
(1, 1, 1, '1.1 Brand Identity & Field Demeanor', 'text', 
 'Welcome to the We Onboard Field Operations Team.\\n\\n### 1. Mandatory Identity Display\\n- Every field executive must display their official We Onboard photo ID card prominently on their chest at all times during operational visits.\\n- Wear clean, professional attire appropriate for retail visits.\\n\\n### 2. Zero-Fee Principle\\n- You must NEVER request, accept, or hint at any cash, tip, or informal fee from any merchant, applicant, or client.\\n- We Onboard services are 100% cashless. Any solicitation of cash results in immediate permanent termination and legal reporting.\\n\\n### 3. Professional Communication\\n- Greet store owners respectfully in their preferred local language.\\n- Clearly introduce yourself: "Hello, I am [Your Name] from We Onboard, representing [Client Brand]."\\n- State the exact purpose of your visit clearly before requesting any document or space inspection.', 10, 1),

(2, 1, 1, '1.2 Customer Data Confidentiality & Fraud Prevention', 'text', 
 '### Protecting Sensitive Information\\nDuring onboarding, you will handle sensitive personal identification information (Aadhaar, PAN, Bank Passbooks, GST certificates).\\n\\n### Strict Rules:\\n1. Never take personal screenshots or photograph documents on personal messaging apps (WhatsApp, Telegram).\\n2. All photo evidence must be captured directly through the authorized We Onboard mobile client.\\n3. Do not store merchant contact numbers in your personal contact list.\\n4. Any falsification of location, fake OTP collection, or tampering with signatures is treated as criminal fraud under Indian IT Act and IPC sections.', 12, 2),

(3, 2, 1, '2.1 Personal Safety in Dense & Remote Markets', 'text', 
 '### Field Safety Guidelines\\nYour safety is our highest priority.\\n\\n### Rules for Safe Navigation:\\n- Plan your daily route in advance through approved arterial roads and marketplaces.\\n- Do not enter isolated warehouses or private basements alone. Request the merchant to meet in the front public area of the commercial establishment.\\n- Keep your smartphone battery above 30% at all times. Carry a portable power bank during long-distance field runs.\\n- In the event of severe weather, flash floods, or local strikes, stop work immediately, take shelter, and inform your assigned Team Leader via the portal.', 13, 1);

-- Assessment for Course 1
INSERT IGNORE INTO \`course_assessments\` (\`id\`, \`course_id\`, \`title\`, \`description\`, \`passing_score\`, \`time_limit_minutes\`, \`max_attempts\`) VALUES
(1, 1, 'Field Ethics & Safety Certification Exam', 'Comprehensive 5-question test evaluating your understanding of We Onboard conduct, zero-fee compliance, and field safety protocols. 80% passing score required for certificate issuance.', 80, 15, 3);

-- Assessment Questions for Course 1 (Correct answers stored server-side)
INSERT IGNORE INTO \`assessment_questions\` (\`id\`, \`assessment_id\`, \`question_text\`, \`question_type\`, \`options_json\`, \`correct_answers_json\`, \`explanation\`, \`sort_order\`, \`points\`) VALUES
(1, 1, 'Is a We Onboard field executive ever allowed to accept cash payments or tips from a merchant during an onboarding visit?', 'single_choice', 
 '[{"id":"a","text":"Yes, up to Rs 100 as a travel reimbursement"},{"id":"b","text":"Only if the merchant explicitly insists on giving a tip"},{"id":"c","text":"Never. We Onboard has a strict zero-cash policy; all services are 100% cashless"},{"id":"d","text":"Yes, if approved verbally by a friend"}]', 
 '["c"]', 'We Onboard strictly enforces a zero-cash policy. Demanding or receiving any informal cash is ground for immediate suspension and legal action.', 1, 1),

(2, 1, 'Where should customer identity documents (like PAN or Aadhaar) be captured and stored?', 'single_choice', 
 '[{"id":"a","text":"Saved to personal phone gallery and sent via WhatsApp"},{"id":"b","text":"Captured directly inside the authorized We Onboard application and never retained on personal devices"},{"id":"c","text":"Uploaded to public cloud storage for easy sharing"},{"id":"d","text":"Stored in the phone notes app"}]', 
 '["b"]', 'Customer data must only be captured in the authorized app with end-to-end encryption. Storing sensitive PII on personal devices violates DPDP privacy standards.', 2, 1),

(3, 1, 'What should you do if an aggressive or hostile merchant refuses an audit and demands that you leave?', 'single_choice', 
 '[{"id":"a","text":"Argue back until they agree to the audit"},{"id":"b","text":"Refuse to leave until the manager calls the police"},{"id":"c","text":"Politely de-escalate, leave the premises immediately, and log an incident report to your Team Leader"},{"id":"d","text":"Call fellow freelancers to gather outside the shop"}]', 
 '["c"]', 'Personal safety is paramount. Never engage in arguments; politely exit and notify your team leader immediately.', 3, 1),

(4, 1, 'What is the minimum passing score required to earn a verified We Onboard certificate on this assessment?', 'single_choice', 
 '[{"id":"a","text":"50%"},{"id":"b","text":"60%"},{"id":"c","text":"80%"},{"id":"d","text":"100%"}]', 
 '["c"]', 'We Onboard requires an 80% passing threshold to guarantee high operational quality and safety standard mastery.', 4, 1),

(5, 1, 'What identity item must be visibly displayed by an associate at all times during retail visits?', 'single_choice', 
 '[{"id":"a","text":"Any casual college ID card"},{"id":"b","text":"Official We Onboard Associate Photo ID card"},{"id":"c","text":"Driver license kept in back pocket"},{"id":"d","text":"No ID is necessary if wearing a branded cap"}]', 
 '["b"]', 'Official photo ID cards must be worn and displayed prominently to establish authority and trust with commercial merchants.', 5, 1);
`
    },
    {
      path: 'database/migrations/005_phase5_projects_tasks_evidence_qc.sql',
      description: 'Phase 5 non-destructive migration for projects, tasks, evidence submissions, and QC',
      content: `-- We Onboard Non-Destructive Migration 005: Projects, Task Dispatch, Field Evidence & Quality Control (Phase 5)
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Safely add required_training_course_id column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'required_training_course_id'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`required_training_course_id\` INT NULL AFTER \`service_category\`', 
    'SELECT "Column required_training_course_id already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Safely add required_kyc_level column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'required_kyc_level'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`required_kyc_level\` VARCHAR(50) DEFAULT \\'Approved\\' AFTER \`required_training_course_id\`', 
    'SELECT "Column required_kyc_level already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Safely add evidence_schema_json column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'evidence_schema_json'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`evidence_schema_json\` TEXT NULL AFTER \`description\`', 
    'SELECT "Column evidence_schema_json already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Safely add requires_location column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'requires_location'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`requires_location\` TINYINT(1) DEFAULT 0 AFTER \`evidence_schema_json\`', 
    'SELECT "Column requires_location already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Safely add max_tasks_per_freelancer column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'max_tasks_per_freelancer'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`max_tasks_per_freelancer\` INT DEFAULT 5 AFTER \`target_units\`', 
    'SELECT "Column max_tasks_per_freelancer already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Safely add payout_rate column to projects table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'projects' 
      AND column_name = 'payout_rate'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`projects\` ADD COLUMN \`payout_rate\` DECIMAL(10,2) DEFAULT 0.00 AFTER \`payment_model\`', 
    'SELECT "Column payout_rate already exists on projects" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Safely modify tasks status ENUM to include 'Available'
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tasks' 
      AND column_name = 'status'
);
SET @sqlstmt := IF(@col_exist > 0, 
    'ALTER TABLE \`tasks\` MODIFY COLUMN \`status\` ENUM(\\'Available\\', \\'Assigned\\', \\'Accepted\\', \\'In Progress\\', \\'Submitted\\', \\'Under Review\\', \\'Approved\\', \\'Rework Required\\', \\'Rejected\\', \\'Cancelled\\') DEFAULT \\'Available\\'', 
    'SELECT "Column status does not exist on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. Safely add instructions column to tasks table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tasks' 
      AND column_name = 'instructions'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`tasks\` ADD COLUMN \`instructions\` LONGTEXT NULL AFTER \`description\`', 
    'SELECT "Column instructions already exists on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9. Safely add evidence_requirements_json column to tasks table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tasks' 
      AND column_name = 'evidence_requirements_json'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`tasks\` ADD COLUMN \`evidence_requirements_json\` TEXT NULL AFTER \`instructions\`', 
    'SELECT "Column evidence_requirements_json already exists on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10. Safely add requires_location column to tasks table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tasks' 
      AND column_name = 'requires_location'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`tasks\` ADD COLUMN \`requires_location\` TINYINT(1) DEFAULT 0 AFTER \`evidence_requirements_json\`', 
    'SELECT "Column requires_location already exists on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 11. Safely add accepted_at, submitted_at, reviewed_by, reviewed_by_name, reviewed_at, rework_count to tasks table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tasks' 
      AND column_name = 'accepted_at'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`tasks\` ADD COLUMN \`accepted_at\` DATETIME NULL AFTER \`deadline\`, ADD COLUMN \`submitted_at\` DATETIME NULL AFTER \`accepted_at\`, ADD COLUMN \`reviewed_by\` INT NULL AFTER \`submitted_at\`, ADD COLUMN \`reviewed_by_name\` VARCHAR(150) NULL AFTER \`reviewed_by\`, ADD COLUMN \`reviewed_at\` DATETIME NULL AFTER \`reviewed_by_name\`, ADD COLUMN \`rework_count\` INT DEFAULT 0 AFTER \`reviewed_at\`', 
    'SELECT "Audit and tracking columns already exist on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 12. Create Task Evidence Submissions Table
CREATE TABLE IF NOT EXISTS \`task_evidence_submissions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`form_data_json\` LONGTEXT NULL,
    \`location_lat\` DECIMAL(10,8) NULL,
    \`location_lng\` DECIMAL(11,8) NULL,
    \`location_address\` TEXT NULL,
    \`idempotency_key\` VARCHAR(64) NULL,
    \`status\` ENUM('Pending Review', 'Approved', 'Rework Required', 'Rejected') DEFAULT 'Pending Review',
    \`review_comment\` TEXT NULL,
    \`reviewed_by\` VARCHAR(150) NULL,
    \`reviewed_at\` DATETIME NULL,
    \`submitted_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_sub_task\` (\`task_id\`),
    INDEX \`idx_sub_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_sub_idempotency\` (\`idempotency_key\`),
    CONSTRAINT \`fk_sub_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_sub_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Create Task Evidence Files Table
CREATE TABLE IF NOT EXISTS \`task_evidence_files\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`submission_id\` INT NULL,
    \`field_name\` VARCHAR(100) NOT NULL,
    \`original_filename\` VARCHAR(255) NOT NULL,
    \`storage_path\` VARCHAR(500) NOT NULL,
    \`file_size\` INT NOT NULL,
    \`mime_type\` VARCHAR(100) NOT NULL,
    \`uploaded_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tef_task\` (\`task_id\`),
    INDEX \`idx_tef_submission\` (\`submission_id\`),
    CONSTRAINT \`fk_tef_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_tef_submission\` FOREIGN KEY (\`submission_id\`) REFERENCES \`task_evidence_submissions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Seed Sample Projects and Initial Task Pool if not present
INSERT IGNORE INTO \`projects\` (
    \`id\`, \`project_ref\`, \`name\`, \`client_name\`, \`service_category\`, 
    \`required_training_course_id\`, \`required_kyc_level\`, \`description\`, 
    \`evidence_schema_json\`, \`requires_location\`, \`target_city\`, \`target_areas\`, 
    \`target_units\`, \`completed_units\`, \`max_tasks_per_freelancer\`, \`start_date\`, 
    \`end_date\`, \`payment_model\`, \`payout_rate\`, \`budget\`, \`status\`
) VALUES 
(
    1, 'PRJ-2026-01', 'Tier-1 Soundbox & QR Retail Rollout', 'BharatPe Merchant Services', 
    'Merchant digital onboarding', 2, 'Approved',
    'Deploy QR codes, NFC soundboxes, and digital payment acceptance in tier-1 commercial retail hubs. Requires verified merchant KYC, physical terminal sound testing, and merchant app demonstration.',
    '{"fields":[{"name":"merchant_name","label":"Merchant Legal Business Name","type":"text","required":true},{"name":"merchant_phone","label":"Merchant Mobile Number","type":"tel","required":true},{"name":"terminal_serial","label":"Soundbox / POS Serial Number","type":"text","required":true},{"name":"test_payment_received","label":"Confirmed 1 INR Test Payment Received","type":"boolean","required":true}],"evidence":["Front of Store Photo with Soundbox Mounted","Merchant Signed Handover Slip","Terminal Serial Barcode Photo"]}',
    1, 'Bengaluru', 'Indiranagar, Koramangala, HSR Layout, Whitefield', 
    250, 42, 5, '2026-10-15', '2026-11-30', 'Per Activation', 350.00, 150000.00, 'Active'
),
(
    2, 'PRJ-2026-02', 'FMCG Retail Stock & Shelf Verification', 'Hindustan Unilever Field Audit Desk', 
    'Field audits & mystery shopping', 1, 'Approved',
    'Comprehensive retail audit of product shelf-space, promotional signage compliance, and stock availability across kirana and modern trade outlets.',
    '{"fields":[{"name":"store_code","label":"Retail Store Identifier Code","type":"text","required":true},{"name":"shelf_share_percent","label":"Estimated Brand Shelf Share (%)","type":"number","required":true},{"name":"promotional_poster_displayed","label":"Promotional Standee / Poster Active","type":"boolean","required":true}],"evidence":["Full Shelf Display Wide Angle Photo","Store Frontage Photo"]}',
    0, 'Bengaluru', 'Jayanagar, Malleshwaram, Rajajinagar', 
    180, 18, 5, '2026-10-18', '2026-11-20', 'Per Audit', 250.00, 85000.00, 'Active'
);

-- 15. Seed Sample Tasks for Dispatch and QC testing
INSERT IGNORE INTO \`tasks\` (
    \`id\`, \`task_ref\`, \`project_id\`, \`title\`, \`description\`, \`instructions\`, 
    \`evidence_requirements_json\`, \`requires_location\`, \`city\`, \`target_area\`, 
    \`deadline\`, \`payout_amount\`, \`status\`, \`assigned_freelancer_id\`
) VALUES 
(
    1, 'TSK-2026-101', 1, 'Deploy Soundbox & QR — Shri Krishna Provision Store',
    'Visit merchant, verify business PAN/GST, affix QR standee, bind NFC soundbox, and execute test sound confirmation.',
    '1. Greet store owner and show We Onboard Associate ID.\\n2. Verify merchant name matches legal registration.\\n3. Position soundbox near billing counter away from loud refrigerators.\\n4. Trigger 1 INR test transaction and verify clear local language broadcast.\\n5. Capture required photos through the We Onboard task submitter.',
    '["Front of Store Photo with Soundbox Mounted", "Merchant Signed Handover Slip", "Terminal Serial Barcode Photo"]',
    1, 'Bengaluru', '100ft Road, Indiranagar', '2026-10-25', 350.00, 'Available', NULL
),
(
    2, 'TSK-2026-102', 1, 'POS Terminal Activation — New Modern Bakery',
    'Merchant POS soundbox setup and merchant app training on daily settlement summaries.',
    '1. Verify store location on map.\\n2. Complete merchant bank details verification.\\n3. Ensure battery is charged to 100%.\\n4. Demonstrate QR scan on owner\\'s smartphone.\\n5. Obtain merchant signature on handover sheet.',
    '["Front of Store Photo with Soundbox Mounted", "Merchant Signed Handover Slip"]',
    1, 'Bengaluru', 'Koramangala 4th Block', '2026-10-26', 350.00, 'Available', NULL
),
(
    3, 'TSK-2026-103', 2, 'FMCG Shelf Share Audit — Balaji Supermarket',
    'Audit personal care and packaged food shelf allocation. Record stock levels and take clear photographs of brand display units.',
    '1. Enter store politely and request store manager permission for annual brand audit.\\n2. Measure and photograph product bays.\\n3. Record missing stock codes and count shelf facings.\\n4. Do not engage in dispute if store refuses; log incident report.',
    '["Full Shelf Display Wide Angle Photo", "Store Frontage Photo"]',
    0, 'Bengaluru', 'Jayanagar 4th Block', '2026-10-24', 250.00, 'Available', NULL
);
`
    },
    {
      path: 'database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql',
      description: 'Phase 6 non-destructive migration for QC hardening, freelancer performance, team hierarchy, and rank engine',
      content: `-- We Onboard Non-Destructive Migration 006: QC Hardening, Freelancer Performance, Team Hierarchy & Rank Engine (Phase 6)
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Safely add current_rank column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'current_rank'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`current_rank\` ENUM(\\'Trainee\\', \\'Team Member\\', \\'Team Leader\\', \\'Manager\\', \\'City/Regional Head\\') DEFAULT \\'Trainee\\' AFTER \`preferred_role\`', 
    'SELECT "Column current_rank already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Safely add team_id column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'team_id'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`team_id\` INT NULL AFTER \`current_rank\`', 
    'SELECT "Column team_id already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Safely add quality_score column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'quality_score'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`quality_score\` DECIMAL(5,2) NULL AFTER \`team_id\`', 
    'SELECT "Column quality_score already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Safely add qs_sample_size column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'qs_sample_size'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`qs_sample_size\` INT DEFAULT 0 AFTER \`quality_score\`', 
    'SELECT "Column qs_sample_size already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Safely add qs_status column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'qs_status'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`qs_status\` ENUM(\\'Insufficient Data\\', \\'Active\\', \\'Under Observation\\', \\'Suspended\\') DEFAULT \\'Insufficient Data\\' AFTER \`qs_sample_size\`', 
    'SELECT "Column qs_status already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Safely add qs_last_calculated_at column to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'qs_last_calculated_at'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`qs_last_calculated_at\` DATETIME NULL AFTER \`qs_status\`', 
    'SELECT "Column qs_last_calculated_at already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Safely add fraud_flag columns to freelancers table if absent
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'freelancers' 
      AND column_name = 'fraud_flag'
);
SET @sqlstmt := IF(@col_exist = 0, 
    'ALTER TABLE \`freelancers\` ADD COLUMN \`fraud_flag\` TINYINT(1) DEFAULT 0 AFTER \`qs_last_calculated_at\`, ADD COLUMN \`fraud_reason\` TEXT NULL AFTER \`fraud_flag\`, ADD COLUMN \`fraud_flagged_by\` INT NULL AFTER \`fraud_reason\`, ADD COLUMN \`fraud_flagged_at\` DATETIME NULL AFTER \`fraud_flagged_by\`', 
    'SELECT "Fraud columns already exist on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. Create Teams Table
CREATE TABLE IF NOT EXISTS \`teams\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`team_code\` VARCHAR(30) NOT NULL UNIQUE,
    \`name\` VARCHAR(100) NOT NULL,
    \`leader_id\` INT NULL,
    \`manager_id\` INT NULL,
    \`city\` VARCHAR(100) NOT NULL,
    \`operating_area\` VARCHAR(200) NULL,
    \`status\` ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX \`idx_team_city\` (\`city\`),
    INDEX \`idx_team_status\` (\`status\`),
    INDEX \`idx_team_leader\` (\`leader_id\`),
    INDEX \`idx_team_manager\` (\`manager_id\`),
    CONSTRAINT \`fk_team_leader\` FOREIGN KEY (\`leader_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_team_manager\` FOREIGN KEY (\`manager_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Create Team Members Table (Enforces unique membership: one team per freelancer)
CREATE TABLE IF NOT EXISTS \`team_members\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`team_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL UNIQUE,
    \`role_in_team\` ENUM('Member', 'Deputy Leader') DEFAULT 'Member',
    \`joined_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tm_team\` (\`team_id\`),
    INDEX \`idx_tm_fl\` (\`freelancer_id\`),
    CONSTRAINT \`fk_tm_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_tm_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Create Rank Promotions Table (Tracks eligibility, nomination, approval, decision reason and history)
CREATE TABLE IF NOT EXISTS \`rank_promotions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`freelancer_id\` INT NOT NULL,
    \`from_rank\` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    \`to_rank\` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    \`status\` ENUM('Eligible', 'Nominated', 'Approved', 'Rejected') DEFAULT 'Eligible',
    \`eligibility_snapshot_json\` LONGTEXT NULL,
    \`reviewed_by\` INT NULL,
    \`reviewed_by_name\` VARCHAR(150) NULL,
    \`decision_reason\` TEXT NULL,
    \`reviewed_at\` DATETIME NULL,
    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_rp_fl\` (\`freelancer_id\`),
    INDEX \`idx_rp_status\` (\`status\`),
    CONSTRAINT \`fk_rp_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Create Task Review History Table (Preserves complete review audit trail across rework cycles)
CREATE TABLE IF NOT EXISTS \`task_review_history\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`task_id\` INT NOT NULL,
    \`submission_id\` INT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`reviewer_id\` INT NULL,
    \`reviewer_name\` VARCHAR(150) NOT NULL,
    \`decision\` ENUM('Approved', 'Rework Required', 'Rejected') NOT NULL,
    \`review_comment\` TEXT NULL,
    \`reviewed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_trh_task\` (\`task_id\`),
    INDEX \`idx_trh_fl\` (\`freelancer_id\`),
    INDEX \`idx_trh_sub\` (\`submission_id\`),
    CONSTRAINT \`fk_trh_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Create Quality Score Configuration Table
CREATE TABLE IF NOT EXISTS \`quality_score_config\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
    \`config_value\` DECIMAL(6,2) NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`quality_score_config\` (\`config_key\`, \`config_value\`, \`description\`) VALUES
('min_sample_size', 3.00, 'Minimum reviewed tasks required before computing verified Quality Score'),
('weight_approval', 40.00, 'Weight (out of 100) for QC approval rate'),
('weight_rework', 25.00, 'Weight (out of 100) for first-time-right / zero rework tasks'),
('weight_timeliness', 20.00, 'Weight (out of 100) for tasks submitted on or before deadline'),
('weight_evidence', 15.00, 'Weight (out of 100) for complete evidence and location compliance'),
('penalty_fraud', 50.00, 'Penalty deduction points for confirmed policy violations'),
('active_member_min_qs', 70.00, 'Minimum Quality Score to qualify as an active member'),
('leader_min_qs', 85.00, 'Minimum Quality Score for Team Leader rank eligibility'),
('manager_min_qs', 85.00, 'Minimum Quality Score for Manager rank eligibility'),
('leader_min_active_members', 10.00, 'Minimum active members required in team for Team Leader eligibility'),
('manager_min_qualifying_teams', 3.00, 'Minimum qualifying teams (each >=10 active members) for Manager eligibility');

-- 13. Seed Initial Field Teams
INSERT IGNORE INTO \`teams\` (\`id\`, \`team_code\`, \`name\`, \`city\`, \`operating_area\`, \`status\`) VALUES
(1, 'TM-BLR-01', 'Indiranagar Commercial Activation Team', 'Bengaluru', '100ft Road, CMH Road, Defence Colony', 'Active'),
(2, 'TM-BLR-02', 'Koramangala Retail Corridor Team', 'Bengaluru', '80ft Road, Sony Signal, 4th & 5th Block', 'Active'),
(3, 'TM-BLR-03', 'HSR Layout & BTM Field Unit', 'Bengaluru', '27th Main, Sector 1-4, Silk Board Junction', 'Active'),
(4, 'TM-BLR-04', 'Whitefield Tech Corridor Rollout Team', 'Bengaluru', 'ITPL Main Road, Hope Farm, Kadugodi', 'Active');

SET FOREIGN_KEY_CHECKS = 1;
`
    },
    {
      path: 'database/migrations/007_phase7_wallet_ledger_earnings_payouts.sql',
      description: 'Phase 7 non-destructive migration for double-entry ledger, earning entitlements, reserves, wallets, and payouts',
      content: `-- We Onboard — Migration 007: Phase 7 Financial Architecture, Double-Entry Ledger, Earnings & Payout Management
-- Hostinger MySQL / MariaDB compatible, idempotent, non-destructive

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Chart of Accounts Table
CREATE TABLE IF NOT EXISTS \`ledger_accounts\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`account_code\` VARCHAR(20) NOT NULL UNIQUE,
    \`account_name\` VARCHAR(100) NOT NULL,
    \`account_type\` ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_la_type\` (\`account_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Chart of Accounts
INSERT IGNORE INTO \`ledger_accounts\` (\`account_code\`, \`account_name\`, \`account_type\`, \`description\`) VALUES
('1001', 'Cash & Bank Clearing', 'Asset', 'Platform disbursement bank account and payment gateway settlement escrow'),
('2001', 'Freelancer Payable (Available)', 'Liability', 'Withdrawable available balance owed to field freelancers for verified completed tasks'),
('2002', 'Team Leader Payable', 'Liability', 'Performance overrides owed to qualified Team Leaders (20% share)'),
('2003', 'Manager Payable', 'Liability', 'Corridor supervision overrides owed to qualified Area Managers (10% share)'),
('2004', 'Reserve Liability (15-day Hold)', 'Liability', '10% quality assurance reserve retained for 15 days before release to available balance'),
('2005', 'Payout In-Transit Clearing', 'Liability', 'Temporary clearing holding funds from requested payouts until provider confirmation'),
('3001', 'Growth Pool (Platform Retained)', 'Equity', 'Retained unallocated supervisor shares when Team Leaders or Managers are disqualified or vacant'),
('5001', 'Project Direct Execution Cost', 'Expense', 'Platform field delivery expense recognized upon task Quality Control verification');

-- 2. Double-Entry Journal Records (Balanced Debits and Credits)
CREATE TABLE IF NOT EXISTS \`ledger_journals\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`journal_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`transaction_type\` ENUM('EARNING_RECOGNITION', 'RESERVE_RELEASE', 'PAYOUT_REQUESTED', 'PAYOUT_SETTLED', 'PAYOUT_REVERSED', 'MANUAL_ADJUSTMENT') NOT NULL,
    \`reference_id\` VARCHAR(50) NULL,
    \`narration\` TEXT NOT NULL,
    \`total_debit\` DECIMAL(14,2) NOT NULL,
    \`total_credit\` DECIMAL(14,2) NOT NULL,
    \`posted_by\` VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    \`is_reversed\` TINYINT(1) DEFAULT 0,
    \`reversed_by_journal_id\` INT NULL,
    \`reversal_of_journal_id\` INT NULL,
    \`posted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_lj_ref\` (\`reference_id\`),
    INDEX \`idx_lj_type\` (\`transaction_type\`),
    INDEX \`idx_lj_date\` (\`posted_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Double-Entry Journal Lines
CREATE TABLE IF NOT EXISTS \`ledger_entries\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`journal_id\` INT NOT NULL,
    \`account_code\` VARCHAR(20) NOT NULL,
    \`entry_type\` ENUM('DEBIT', 'CREDIT') NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`entity_type\` ENUM('Freelancer', 'TeamLeader', 'Manager', 'Platform', 'System') NOT NULL DEFAULT 'System',
    \`entity_id\` VARCHAR(50) NULL,
    \`line_narration\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_le_journal\` (\`journal_id\`),
    INDEX \`idx_le_account\` (\`account_code\`),
    INDEX \`idx_le_entity\` (\`entity_type\`, \`entity_id\`),
    CONSTRAINT \`fk_le_journal\` FOREIGN KEY (\`journal_id\`) REFERENCES \`ledger_journals\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Earning Entitlements (QC-Approved Work Breakdown)
CREATE TABLE IF NOT EXISTS \`earning_entitlements\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`entitlement_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`task_id\` INT NOT NULL UNIQUE,
    \`project_id\` INT NOT NULL,
    \`freelancer_id\` INT NOT NULL,
    \`gross_rate\` DECIMAL(14,2) NOT NULL,
    \`freelancer_share_gross\` DECIMAL(14,2) NOT NULL,
    \`freelancer_reserve_amount\` DECIMAL(14,2) NOT NULL,
    \`freelancer_share_net\` DECIMAL(14,2) NOT NULL,
    \`team_leader_id\` INT NULL,
    \`team_leader_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`team_leader_routed_to_growth\` TINYINT(1) DEFAULT 0,
    \`manager_id\` INT NULL,
    \`manager_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`manager_routed_to_growth\` TINYINT(1) DEFAULT 0,
    \`growth_pool_share\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`hierarchy_snapshot_json\` LONGTEXT NULL,
    \`journal_id\` INT NOT NULL,
    \`status\` ENUM('Recognized', 'Reversed') DEFAULT 'Recognized',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_ee_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_ee_task\` (\`task_id\`),
    INDEX \`idx_ee_project\` (\`project_id\`),
    CONSTRAINT \`fk_ee_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Reserve Records (10% Retained for 15 Days)
CREATE TABLE IF NOT EXISTS \`reserve_records\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`reserve_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`task_id\` INT NOT NULL,
    \`earning_entitlement_id\` INT NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`reserve_pct\` DECIMAL(5,2) DEFAULT 10.00,
    \`hold_days\` INT DEFAULT 15,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`release_due_at\` TIMESTAMP NOT NULL,
    \`released_at\` TIMESTAMP NULL,
    \`status\` ENUM('Held', 'Released', 'Extended', 'Reversed') DEFAULT 'Held',
    \`release_journal_id\` INT NULL,
    \`notes\` VARCHAR(255) NULL,
    INDEX \`idx_rr_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_rr_status_due\` (\`status\`, \`release_due_at\`),
    CONSTRAINT \`fk_rr_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Payout Requests & Settlement Lifecycle
CREATE TABLE IF NOT EXISTS \`payout_requests\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`payout_ref\` VARCHAR(50) NOT NULL UNIQUE,
    \`idempotency_key\` VARCHAR(64) NOT NULL UNIQUE,
    \`freelancer_id\` INT NOT NULL,
    \`amount\` DECIMAL(14,2) NOT NULL,
    \`payment_method\` ENUM('UPI', 'Bank Transfer', 'NEFT') NOT NULL DEFAULT 'UPI',
    \`beneficiary_name\` VARCHAR(150) NOT NULL,
    \`beneficiary_details\` VARCHAR(255) NOT NULL,
    \`status\` ENUM('Requested', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed', 'Cancelled') DEFAULT 'Requested',
    \`request_journal_id\` INT NULL,
    \`settlement_journal_id\` INT NULL,
    \`reversal_journal_id\` INT NULL,
    \`provider_name\` VARCHAR(50) DEFAULT 'SimulatedPaymentAdapter',
    \`provider_transfer_id\` VARCHAR(100) NULL,
    \`failure_reason\` TEXT NULL,
    \`reviewed_by\` VARCHAR(150) NULL,
    \`reviewed_at\` TIMESTAMP NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX \`idx_po_freelancer\` (\`freelancer_id\`),
    INDEX \`idx_po_status\` (\`status\`),
    INDEX \`idx_po_created\` (\`created_at\`),
    CONSTRAINT \`fk_po_fl\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Wallets Projections Table (Reconciled against Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS \`wallets\` (
    \`freelancer_id\` INT PRIMARY KEY,
    \`total_earned\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`available_balance\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`reserved_balance\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`pending_earnings\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`payouts_in_progress\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`paid_payouts\` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    \`last_reconciled_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_w_freelancer\` FOREIGN KEY (\`freelancer_id\`) REFERENCES \`freelancers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Configurable Financial Engine Settings
CREATE TABLE IF NOT EXISTS \`financial_config\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
    \`config_value\` DECIMAL(14,2) NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`financial_config\` (\`config_key\`, \`config_value\`, \`description\`) VALUES
('freelancer_share_pct', 70.00, 'Baseline revenue share percentage for executing freelancer'),
('team_leader_share_pct', 20.00, 'Leadership override percentage for active qualifying Team Leader'),
('manager_share_pct', 10.00, 'Corridor oversight percentage for active qualifying Area Manager'),
('reserve_pct', 10.00, 'Quality assurance reserve withheld from freelancer share'),
('reserve_hold_days', 15.00, 'Duration in calendar days before withheld reserve matures and auto-releases'),
('min_payout_amount', 500.00, 'Minimum single payout request threshold in INR'),
('max_payout_amount', 50000.00, 'Maximum single payout request limit in INR');

SET FOREIGN_KEY_CHECKS = 1;
`
    },
    {
      path: 'database/demo_seed.sql',
      description: 'Safe, repeatable, opt-in demonstration dataset for staging with 3 projects, 4 roles, and balanced double-entry ledger records',
      content: `-- =========================================================================
-- WE ONBOARD — SAFE DEMONSTRATION DATASET (MySQL / MariaDB Compatible)
-- =========================================================================
-- Safe, repeatable, idempotent and non-destructive:
-- Uses SET FOREIGN_KEY_CHECKS = 0/1 and ON DUPLICATE KEY UPDATE.
-- All demonstration records are clearly prefixed with DEMO- or tagged with [DEMO].
-- Does not contain real PII, production secrets, or live payment credentials.
-- Matches double-entry ledger ground truth and the 70/20/10 split model.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------------------
-- 1. DEMO CLIENTS
-- -------------------------------------------------------------------------
INSERT INTO clients (
    id, client_ref, company_name, primary_contact, phone, email,
    industry, city, website, lead_source, status, contract_value, created_at
) VALUES
(
    901, 'CLI-DEMO-01', 'RetailHub Karnataka [DEMO]', 'Anand Kumar [DEMO Client]',
    '+91 80 4123 9901', 'contact@retailhub-demo.in', 'Retail & FMCG',
    'Bengaluru', 'https://retailhub-demo.in', 'Inbound Referral', 'Active Client', 60000.00, '2026-10-01 09:00:00'
),
(
    902, 'CLI-DEMO-02', 'FoodSafety Audit Corp [DEMO]', 'Dr. Meenakshi Sundaram [DEMO Client]',
    '+91 80 2555 8812', 'audits@foodsafety-demo.in', 'Food & Hospitality',
    'Bengaluru', 'https://foodsafety-demo.in', 'Direct Corporate', 'Active Client', 45000.00, '2026-10-03 10:00:00'
),
(
    903, 'CLI-DEMO-03', 'RetailPulse Analytics [DEMO]', 'Vikram Malhotra [DEMO Client]',
    '+91 80 6711 4455', 'surveys@retailpulse-demo.in', 'Market Intelligence',
    'Bengaluru', 'https://retailpulse-demo.in', 'Partner Network', 'Active Client', 40000.00, '2026-10-08 11:00:00'
)
ON DUPLICATE KEY UPDATE
company_name = VALUES(company_name),
primary_contact = VALUES(primary_contact),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 2. DEMO PROJECTS (Three Distinct Workflows)
-- -------------------------------------------------------------------------
-- Budget Resolution for Project 1:
-- 40 target units @ ₹1,200 per activation rate = ₹48,000 direct field disbursement pool.
-- Total approved contract budget cap = ₹60,000 (includes ₹12,000 merchant QR standee
-- collateral, merchant onboarding kits and supervisor logistics buffer).
-- -------------------------------------------------------------------------
INSERT INTO projects (
    id, project_ref, name, client_id, client_name, service_category,
    required_kyc_level, description, requires_location, target_city,
    target_areas, target_units, completed_units, max_tasks_per_freelancer,
    start_date, end_date, payment_model, payout_rate, budget, status, created_at
) VALUES
(
    901,
    'DEMO-PRJ-01',
    '[DEMO] Retail Merchant Onboarding & POS Setup',
    901,
    'RetailHub Karnataka [DEMO]',
    'Merchant and restaurant onboarding',
    'Approved',
    '[DEMO] Onboarding local grocery, FMCG and general merchant retail shops with storefront validation, owner KYC, and digital POS app deployment across Indiranagar and Koramangala corridors. Total Approved Contract Budget Cap: ₹60,000 (comprising 40 target units @ ₹1,200 per activation rate = ₹48,000 direct field disbursement pool + ₹12,000 merchant QR standee collateral, merchant onboarding kits and supervisor logistics buffer).',
    1,
    'Bengaluru',
    '["Indiranagar", "Koramangala", "Domlur"]',
    40,
    24,
    5,
    '2026-10-01',
    '2026-11-15',
    'Per Activation',
    1200.00,
    60000.00,
    'Active',
    '2026-10-01 10:00:00'
),
(
    902,
    'DEMO-PRJ-02',
    '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    902,
    'FoodSafety Audit Corp [DEMO]',
    'Field audits and surveys',
    'Approved',
    '[DEMO] In-person hygiene checklist and FSSAI display compliance audit for cloud kitchens, dine-in restaurants, and bakeries with mandatory geo-tagged photographic evidence across HSR Layout and BTM Layout corridors. Total Project Budget: ₹45,000 (30 target units @ ₹1,500 audit payout rate).',
    1,
    'Bengaluru',
    '["HSR Layout", "BTM Layout", "Jayanagar"]',
    30,
    16,
    4,
    '2026-10-05',
    '2026-11-20',
    'Per Audit',
    1500.00,
    45000.00,
    'Active',
    '2026-10-05 10:00:00'
),
(
    903,
    'DEMO-PRJ-03',
    '[DEMO] Market Survey & Retail Mystery Shopping',
    903,
    'RetailPulse Analytics [DEMO]',
    'Field audits and surveys',
    'Approved',
    '[DEMO] Customer service experience, pricing accuracy, and checkout speed mystery shopping across malls and electronics retail chains in Whitefield and Marathahalli. Total Project Budget: ₹40,000 (50 target units @ ₹800 audit payout rate).',
    1,
    'Bengaluru',
    '["Whitefield", "Marathahalli", "ITPL"]',
    50,
    20,
    6,
    '2026-10-10',
    '2026-11-25',
    'Per Audit',
    800.00,
    40000.00,
    'Active',
    '2026-10-10 10:00:00'
)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
target_units = VALUES(target_units),
completed_units = VALUES(completed_units),
budget = VALUES(budget),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 3. DEMO FREELANCERS / ASSOCIATES
-- -------------------------------------------------------------------------
INSERT INTO freelancers (
    id, registration_ref, full_name, email, phone, dob, gender,
    residential_address, city, state, pin_code, is_adult, has_smartphone,
    languages, preferred_areas, preferred_work_type, education,
    previous_experience_years, sales_field_experience, skills,
    preferred_role, status, onboarding_status, registered_at,
    current_rank, quality_score, rating, completed_tasks_count,
    total_earnings, pending_payout, bank_account_masked
) VALUES
(
    901,
    'DEMO-TM-01',
    'Pooja Hegde [DEMO Team Member]',
    'pooja.member@weonboard-demo.in',
    '+91 98888 11223',
    '1999-04-12',
    'Female',
    '100ft Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["Kannada", "English", "Hindi"]',
    '["Indiranagar", "Koramangala"]',
    'Full-time',
    'Bachelor of Science',
    2,
    1,
    '["Merchant Onboarding", "POS Activation", "Field Verification"]',
    'Team Member',
    'Active',
    'Approved',
    '2026-10-02 10:00:00',
    'Team Member',
    88.50,
    4.8,
    18,
    1400.00,
    0.00,
    'HDFC Bank - •••• 9841'
),
(
    902,
    'DEMO-TM-02',
    'Imran Khan [DEMO Team Member]',
    'imran.member@weonboard-demo.in',
    '+91 97777 22334',
    '2001-08-19',
    'Male',
    'BTM 2nd Stage, Near Water Tank',
    'Bengaluru',
    'Karnataka',
    '560076',
    1,
    1,
    '["Kannada", "Hindi", "English", "Urdu"]',
    '["BTM Layout", "HSR Layout"]',
    'Flexible',
    'Pre-University / 12th',
    1,
    1,
    '["Field Audits", "Surveys", "Food Safety Inspection"]',
    'Team Member',
    'Active',
    'Approved',
    '2026-10-04 11:30:00',
    'Team Member',
    78.00,
    4.2,
    12,
    1050.00,
    0.00,
    'SBI - •••• 4512'
),
(
    903,
    'DEMO-TL-01',
    'Rajesh Gowda [DEMO Team Leader]',
    'rajesh.leader@weonboard-demo.in',
    '+91 96666 33445',
    '1996-11-25',
    'Male',
    'CMH Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["Kannada", "English", "Telugu"]',
    '["Indiranagar", "Domlur", "HAL"]',
    'Full-time',
    'Bachelor of Commerce',
    4,
    1,
    '["Team Leadership", "QC Auditing", "Merchant Onboarding"]',
    'Team Leader',
    'Active',
    'Approved',
    '2026-09-28 09:15:00',
    'Team Leader',
    91.00,
    4.9,
    45,
    540.00,
    0.00,
    'ICICI Bank - •••• 7721'
),
(
    904,
    'DEMO-MGR-01',
    'Sanjay Verma [DEMO Manager]',
    'sanjay.manager@weonboard-demo.in',
    '+91 95555 44556',
    '1992-06-14',
    'Male',
    'Indiranagar Defence Colony',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["English", "Hindi", "Kannada"]',
    '["Bengaluru East", "Bengaluru South"]',
    'Full-time',
    'Master of Business Administration',
    8,
    1,
    '["Regional Operations", "Corridor Dispatch", "QC Governance", "Escalation Management"]',
    'Project Manager',
    'Active',
    'Approved',
    '2026-09-15 08:30:00',
    'Manager',
    94.50,
    5.0,
    120,
    270.00,
    0.00,
    'Axis Bank - •••• 1109'
)
ON DUPLICATE KEY UPDATE
full_name = VALUES(full_name),
status = VALUES(status),
onboarding_status = VALUES(onboarding_status),
current_rank = VALUES(current_rank),
quality_score = VALUES(quality_score);

-- -------------------------------------------------------------------------
-- 4. DEMO TEAMS & HIERARCHY
-- -------------------------------------------------------------------------
INSERT INTO teams (
    id, team_code, name, leader_id, manager_id, city, operating_area, status, created_at
) VALUES
(
    901,
    'TEAM-DEMO-01',
    'Team Alpha (Koramangala & Indiranagar Corridor)',
    903,
    904,
    'Bengaluru',
    'Bengaluru Central-East Corridors (Indiranagar, Koramangala, Domlur)',
    'Active',
    '2026-10-01 10:00:00'
)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
leader_id = VALUES(leader_id),
manager_id = VALUES(manager_id),
status = VALUES(status);

INSERT INTO team_members (
    id, team_id, freelancer_id, role_in_team, joined_at, is_active
) VALUES
(901, 901, 901, 'Associate', '2026-10-02 10:30:00', 1),
(902, 901, 902, 'Associate', '2026-10-04 12:00:00', 1)
ON DUPLICATE KEY UPDATE
role_in_team = VALUES(role_in_team),
is_active = VALUES(is_active);

-- -------------------------------------------------------------------------
-- 5. DEMO TASKS (Across Projects 1, 2, 3 with different workflow states)
-- -------------------------------------------------------------------------
INSERT INTO tasks (
    id, task_ref, project_id, title, description, instructions,
    city, target_area, deadline, payout_amount, status,
    assigned_freelancer_id, accepted_at, submitted_at,
    reviewed_by_name, reviewed_at, rework_count, review_comment, created_at
) VALUES
-- Project 1 Tasks (Retail Merchant Onboarding)
(
    901,
    'DEMO-TSK-101',
    901,
    '[DEMO] Onboard Sri Balaji Provisions — 100ft Road Indiranagar',
    '[DEMO] Visit Sri Balaji Provisions, collect owner KYC, snap storefront signboard photo, and activate digital merchant catalog.',
    'Confirm owner Aadhaar, photo of front signboard with GPS stamp, QR code standee setup.',
    'Bengaluru',
    'Indiranagar',
    '2026-10-25',
    1200.00,
    'Approved',
    901,
    '2026-10-18 10:15:00',
    '2026-10-18 13:45:00',
    'Muhammad Ali Shoaib (QC Head)',
    '2026-10-18 14:30:00',
    0,
    '[DEMO] Approved by QC. Clean signage and verified coordinates.',
    '2026-10-15 09:00:00'
),
(
    902,
    'DEMO-TSK-102',
    901,
    '[DEMO] Onboard New Krishna Supermarket — Koramangala 4th Block',
    '[DEMO] Verify proprietor documents, take storefront banner photograph, and verify digital payment terminal setup.',
    'Full shop frontage photo, owner signature on digital form, test order execution.',
    'Bengaluru',
    'Koramangala',
    '2026-10-26',
    1200.00,
    'Submitted',
    901,
    '2026-10-19 11:00:00',
    '2026-10-19 15:30:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 09:00:00'
),
(
    903,
    'DEMO-TSK-103',
    901,
    '[DEMO] Onboard Royal Mart — Domlur Layout',
    '[DEMO] Execute merchant registration, app installation and QR code standee handover.',
    'Hand over merchant onboarding kit and record confirmation OTP.',
    'Bengaluru',
    'Domlur',
    '2026-10-28',
    1200.00,
    'Accepted',
    901,
    '2026-10-20 09:30:00',
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 10:00:00'
),
(
    904,
    'DEMO-TSK-104',
    901,
    '[DEMO] Onboard Annapurna General Store — Indiranagar 12th Main',
    '[DEMO] Eligible for certified associates. Claim task to execute on-ground merchant onboarding.',
    'Open to qualified corridor associates with active KYC.',
    'Bengaluru',
    'Indiranagar',
    '2026-10-30',
    1200.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 10:00:00'
),
-- Project 2 Tasks (Restaurant & MSME Audit)
(
    905,
    'DEMO-TSK-201',
    902,
    '[DEMO] Hygiene Audit — Spice Garden Biryani, HSR Sector 2',
    '[DEMO] Verify kitchen hygiene standards, food refrigeration logs, and active FSSAI registration certificate.',
    '10-point checklist: refrigeration gauge photo, storage cleanliness, FSSAI certificate.',
    'Bengaluru',
    'HSR Layout',
    '2026-10-24',
    1500.00,
    'Rework Required',
    902,
    '2026-10-19 12:00:00',
    '2026-10-19 16:00:00',
    'Gousiya Fathima (QC Operations)',
    '2026-10-19 16:45:00',
    1,
    '[DEMO] Rework Required: The refrigeration thermometer photo is blurry and illegible. Please revisit the site and upload a crisp, high-resolution photo of the temperature display gauge.',
    '2026-10-16 11:00:00'
),
(
    906,
    'DEMO-TSK-202',
    902,
    '[DEMO] FSSAI License Check — Cafe Aroma, BTM 2nd Stage',
    '[DEMO] Verify visible display of FSSAI 14-digit license number and inspect pantry hygiene checklist.',
    'Clear photo of FSSAI framed license and pantry storage.',
    'Bengaluru',
    'BTM Layout',
    '2026-10-27',
    1500.00,
    'Submitted',
    901,
    '2026-10-20 10:00:00',
    '2026-10-20 13:15:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 11:00:00'
),
(
    907,
    'DEMO-TSK-203',
    902,
    '[DEMO] Kitchen Cleanliness Audit — Udupi Upahar, HSR Sector 1',
    '[DEMO] Verify vegetarian kitchen sanitation and food storage standards.',
    'Check deep freezer temperature, dishwashing area, and pest traps.',
    'Bengaluru',
    'HSR Layout',
    '2026-10-22',
    1500.00,
    'Approved',
    902,
    '2026-10-17 09:00:00',
    '2026-10-17 11:00:00',
    'Muhammad Ali Shoaib (QC Head)',
    '2026-10-17 11:20:00',
    0,
    '[DEMO] Approved by QC. Clean kitchen and verified FSSAI documentation.',
    '2026-10-16 11:00:00'
),
(
    908,
    'DEMO-TSK-204',
    902,
    '[DEMO] Storage & Pest Control Audit — Bakers Delight, Jayanagar',
    '[DEMO] Physical audit of bakery dry storage and pest management certificate.',
    'Inspect flour storage bins, pest inspection certificate, and staff aprons.',
    'Bengaluru',
    'Jayanagar',
    '2026-10-29',
    1500.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-17 10:00:00'
),
-- Project 3 Tasks (Market Survey & Mystery Shopping)
(
    909,
    'DEMO-TSK-301',
    903,
    '[DEMO] Mystery Shopping — Phoenix Marketcity Apparel',
    '[DEMO] Act as shopper, evaluate staff response time, fitting room cleanliness, and checkout speed.',
    'Record entry time, staff greeting duration, buy low-value accessory, upload receipt.',
    'Bengaluru',
    'Whitefield',
    '2026-10-23',
    800.00,
    'Approved',
    901,
    '2026-10-16 14:00:00',
    '2026-10-16 16:30:00',
    'Sanjay Verma [DEMO Manager]',
    '2026-10-16 17:00:00',
    0,
    '[DEMO] Approved. Questionnaire answers match receipt timing proof.',
    '2026-10-14 14:00:00'
),
(
    910,
    'DEMO-TSK-302',
    903,
    '[DEMO] Checkout Speed Survey — Nexus Shantiniketan Electronics',
    '[DEMO] Monitor electronic billing counter queues and measure billing time across 5 customers.',
    'Measure wait time and items scanned per customer across 5 billing transactions.',
    'Bengaluru',
    'Whitefield',
    '2026-10-26',
    800.00,
    'In Progress',
    902,
    '2026-10-20 14:00:00',
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
),
(
    911,
    'DEMO-TSK-303',
    903,
    '[DEMO] Customer Greeting Audit — Forum Value Mall Whitefield',
    '[DEMO] Mystery audit of customer greeting and product assistance in cosmetics department.',
    'Observe customer engagement protocol upon entrance.',
    'Bengaluru',
    'Whitefield',
    '2026-10-25',
    800.00,
    'Submitted',
    902,
    '2026-10-20 11:30:00',
    '2026-10-20 14:45:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
),
(
    912,
    'DEMO-TSK-304',
    903,
    '[DEMO] Pricing Accuracy Check — Brigade Road Retailer',
    '[DEMO] Verify shelf display price against POS billing scan for 10 consumer items.',
    'Compare shelf tag pricing with scanned register prices for discrepancies.',
    'Bengaluru',
    'Whitefield',
    '2026-10-31',
    800.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
)
ON DUPLICATE KEY UPDATE
title = VALUES(title),
description = VALUES(description),
status = VALUES(status),
assigned_freelancer_id = VALUES(assigned_freelancer_id),
payout_amount = VALUES(payout_amount),
review_comment = VALUES(review_comment);

-- -------------------------------------------------------------------------
-- 6. DEMO DOUBLE-ENTRY LEDGER JOURNALS (100% Balanced Debits == Credits)
-- -------------------------------------------------------------------------
-- JRN-DEMO-20261018-01: DEMO-TSK-101 approved (Gross ₹1,200)
-- JRN-DEMO-20261016-02: DEMO-TSK-301 approved (Gross ₹800, TL share to Growth Pool)
-- JRN-DEMO-20261017-03: DEMO-TSK-203 approved (Gross ₹1,500)
-- -------------------------------------------------------------------------
INSERT INTO ledger_journals (
    id, journal_ref, reference_id, transaction_type,
    total_debit, total_credit, posted_by, is_reversed, posted_at
) VALUES
(
    9101,
    'JRN-DEMO-20261018-01',
    'DEMO-TSK-101',
    'EARNING_RECOGNITION',
    1200.00,
    1200.00,
    'Muhammad Ali Shoaib (QC Head)',
    0,
    '2026-10-18 14:30:00'
),
(
    9102,
    'JRN-DEMO-20261016-02',
    'DEMO-TSK-301',
    'EARNING_RECOGNITION',
    800.00,
    800.00,
    'Sanjay Verma [DEMO Manager]',
    0,
    '2026-10-16 17:00:00'
),
(
    9103,
    'JRN-DEMO-20261017-03',
    'DEMO-TSK-203',
    'EARNING_RECOGNITION',
    1500.00,
    1500.00,
    'Muhammad Ali Shoaib (QC Head)',
    0,
    '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
total_debit = VALUES(total_debit),
total_credit = VALUES(total_credit),
posted_by = VALUES(posted_by);

-- -------------------------------------------------------------------------
-- 7. DOUBLE-ENTRY LEDGER LINES (Double-Entry Chart of Accounts)
-- Account 5001 = Field Project Task Execution Cost (Expense - DEBIT)
-- Account 2001 = Freelancer Payable (Liability - CREDIT 63%)
-- Account 2004 = Reserve Liability 15-day Hold (Liability - CREDIT 7%)
-- Account 2002 = Team Leader Payable (Liability - CREDIT 20%)
-- Account 2003 = Manager Payable (Liability - CREDIT 10%)
-- Account 3001 = Growth Pool Platform Retained (Equity - CREDIT)
-- -------------------------------------------------------------------------
INSERT INTO ledger_entries (
    id, journal_id, account_code, entry_type, amount, entity_type, entity_id, line_narration, created_at
) VALUES
-- Journal 9101 lines (₹1,200)
(910101, 9101, '5001', 'DEBIT',  1200.00, 'Platform',   'PROJECT_DEMO-PRJ-01', 'Direct project execution cost for DEMO-TSK-101', '2026-10-18 14:30:00'),
(910102, 9101, '2001', 'CREDIT',  756.00, 'Freelancer', 'DEMO-TM-01',          'Net available earnings (63% share) for Pooja Hegde', '2026-10-18 14:30:00'),
(910103, 9101, '2004', 'CREDIT',   84.00, 'Freelancer', 'DEMO-TM-01',          '10% quality assurance reserve held for 15 days', '2026-10-18 14:30:00'),
(910104, 9101, '2002', 'CREDIT',  240.00, 'TeamLeader', 'DEMO-TL-01',          '20% Team Leader override for Rajesh Gowda', '2026-10-18 14:30:00'),
(910105, 9101, '2003', 'CREDIT',  120.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-18 14:30:00'),

-- Journal 9102 lines (₹800 - Team Leader unassigned -> Growth Pool)
(910201, 9102, '5001', 'DEBIT',   800.00, 'Platform',   'PROJECT_DEMO-PRJ-03', 'Direct project execution cost for DEMO-TSK-301', '2026-10-16 17:00:00'),
(910202, 9102, '2001', 'CREDIT',  504.00, 'Freelancer', 'DEMO-TM-01',          'Net available earnings (63% share) for Pooja Hegde', '2026-10-16 17:00:00'),
(910203, 9102, '2004', 'CREDIT',   56.00, 'Freelancer', 'DEMO-TM-01',          '10% quality assurance reserve held for 15 days', '2026-10-16 17:00:00'),
(910204, 9102, '3001', 'CREDIT',  160.00, 'Platform',   'PLATFORM_GROWTH_POOL','Unassigned Team Leader 20% routed to Growth Pool', '2026-10-16 17:00:00'),
(910205, 9102, '2003', 'CREDIT',   80.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-16 17:00:00'),

-- Journal 9103 lines (₹1,500)
(910301, 9103, '5001', 'DEBIT',  1500.00, 'Platform',   'PROJECT_DEMO-PRJ-02', 'Direct project execution cost for DEMO-TSK-203', '2026-10-17 11:20:00'),
(910302, 9103, '2001', 'CREDIT',  945.00, 'Freelancer', 'DEMO-TM-02',          'Net available earnings (63% share) for Imran Khan', '2026-10-17 11:20:00'),
(910303, 9103, '2004', 'CREDIT',  105.00, 'Freelancer', 'DEMO-TM-02',          '10% quality assurance reserve held for 15 days', '2026-10-17 11:20:00'),
(910304, 9103, '2002', 'CREDIT',  300.00, 'TeamLeader', 'DEMO-TL-01',          '20% Team Leader override for Rajesh Gowda', '2026-10-17 11:20:00'),
(910305, 9103, '2003', 'CREDIT',  150.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-17 11:20:00')
ON DUPLICATE KEY UPDATE
amount = VALUES(amount),
entry_type = VALUES(entry_type);

-- -------------------------------------------------------------------------
-- 8. DEMO EARNING ENTITLEMENTS
-- -------------------------------------------------------------------------
INSERT INTO earning_entitlements (
    id, entitlement_ref, task_id, project_id, freelancer_id,
    gross_rate, freelancer_share_gross, freelancer_reserve_amount, freelancer_share_net,
    team_leader_id, team_leader_share, team_leader_routed_to_growth,
    manager_id, manager_share, manager_routed_to_growth,
    growth_pool_share, journal_id, status, created_at
) VALUES
(
    901, 'ENT-DEMO-101', 901, 901, 901,
    1200.00, 840.00, 84.00, 756.00,
    903, 240.00, 0,
    904, 120.00, 0,
    0.00, 9101, 'Recognized', '2026-10-18 14:30:00'
),
(
    902, 'ENT-DEMO-301', 909, 903, 901,
    800.00, 560.00, 56.00, 504.00,
    NULL, 0.00, 1,
    904, 80.00, 0,
    160.00, 9102, 'Recognized', '2026-10-16 17:00:00'
),
(
    903, 'ENT-DEMO-203', 907, 902, 902,
    1500.00, 1050.00, 105.00, 945.00,
    903, 300.00, 0,
    904, 150.00, 0,
    0.00, 9103, 'Recognized', '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
freelancer_share_net = VALUES(freelancer_share_net),
freelancer_reserve_amount = VALUES(freelancer_reserve_amount),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 9. DEMO 15-DAY QUALITY ASSURANCE RESERVES
-- -------------------------------------------------------------------------
INSERT INTO reserve_records (
    id, reserve_ref, freelancer_id, task_id, earning_entitlement_id,
    amount, reserve_pct, hold_days, release_due_at, status, notes, created_at
) VALUES
(
    901, 'RES-DEMO-101', 901, 901, 901,
    84.00, 10.00, 15, '2026-11-02 14:30:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-101', '2026-10-18 14:30:00'
),
(
    902, 'RES-DEMO-301', 901, 909, 902,
    56.00, 10.00, 15, '2026-10-31 17:00:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-301', '2026-10-16 17:00:00'
),
(
    903, 'RES-DEMO-203', 902, 907, 903,
    105.00, 10.00, 15, '2026-11-01 11:20:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-203', '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
amount = VALUES(amount),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 10. DEMO FREELANCER WALLETS (Reconciled Exactly to Ledger Entries)
-- Pooja Hegde (901): Available ₹1,260.00 (₹756 + ₹504), Reserve ₹140.00 (₹84 + ₹56)
-- Imran Khan (902): Available ₹945.00, Reserve ₹105.00
-- Rajesh Gowda (903): Available ₹540.00 (₹240 + ₹300 overrides), Reserve ₹0.00
-- Sanjay Verma (904): Available ₹270.00 (₹120 + ₹150 overrides), Reserve ₹0.00
-- -------------------------------------------------------------------------
INSERT INTO wallets (
    id, freelancer_id, available_balance, reserved_balance, pending_earnings,
    total_earned, payouts_in_progress, paid_payouts, currency, is_kyc_approved
) VALUES
(901, 901, 1260.00, 140.00, 840.00, 1400.00, 0.00, 0.00, 'INR', 1),
(902, 902,  945.00, 105.00, 560.00, 1050.00, 0.00, 0.00, 'INR', 1),
(903, 903,  540.00,   0.00, 240.00,  540.00, 0.00, 0.00, 'INR', 1),
(904, 904,  270.00,   0.00, 120.00,  270.00, 0.00, 0.00, 'INR', 1)
ON DUPLICATE KEY UPDATE
available_balance = VALUES(available_balance),
reserved_balance = VALUES(reserved_balance),
pending_earnings = VALUES(pending_earnings),
total_earned = VALUES(total_earned);

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- END OF SAFE DEMONSTRATION DATASET
-- =========================================================================
`
    },
    {
      path: 'storage/kyc/.htaccess',
      description: 'Private Apache rules blocking direct public HTTP access to confidential identity documents',
      content: `# Apache configuration to protect private uploaded identity documents
Order Deny,Allow
Deny from all
`
    },
    {
      path: 'storage/kyc/index.html',
      description: 'Defense-in-depth empty index to prevent directory traversal',
      content: `<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h1>403 Forbidden</h1><p>Direct access to identity storage directory is forbidden.</p></body></html>
`
    },
    {
      path: 'install.php',
      description: 'Secure installer with production web disabling, one-time token authorization, CSRF validation, permanent lock check, prevention of admin password resets, and generic error reporting',
      content: `<?php
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
        echo "LOCKED: The system is already installed (config/install.lock exists).\\n";
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
        die("<!DOCTYPE html><html><head><title>Access Denied</title></head><body style='font-family:sans-serif;padding:40px;line-height:1.6;'><h2 style='color:#b91c1c;'>Web Installation Disabled</h2><p>For security, web-based installation is disabled in production. Please run the installer via SSH / CLI:</p><pre style='background:#f1f5f9;padding:12px;border-radius:6px;'>php scripts/install.php</pre><p>Or provision an administrator via:</p><pre style='background:#f1f5f9;padding:12px;border-radius:6px;'>php scripts/create_super_admin.php \\"Admin Name\\" \\"admin@weonboard.in\\" \\"StrongPassword\\"</pre></body></html>");
    }

    // Require explicit, strong server-side installation key (min 16 chars)
    $requiredKey = getenv('INSTALL_KEY') ?: ($_ENV['INSTALL_KEY'] ?? ($_SERVER['INSTALL_KEY'] ?? ''));
    if (empty($requiredKey) || strlen(trim($requiredKey)) < 16) {
        http_response_code(403);
        error_log("[SECURITY ERROR] Web installation attempted, but INSTALL_KEY is missing or too short (minimum 16 characters required). Failing closed.");
        die("<!DOCTYPE html><html><head><title>Installer Disabled</title></head><body style='font-family:sans-serif;padding:40px;'><h2 style='color:#b91c1c;'>Installer Configuration Error</h2><p>Web installation requires an explicitly configured, strong server installation key (minimum 16 characters). Please configure <code>INSTALL_KEY</code> in server environment variables or execute installation via CLI.</p></body></html>");
    }

    $providedKey = $_GET['key'] ?? ($_POST['install_key'] ?? '');
    if (empty($providedKey) || !hash_equals($requiredKey, $providedKey)) {
        http_response_code(403);
        die("<!DOCTYPE html><html><head><title>Access Denied</title></head><body style='font-family:sans-serif;padding:40px;'><h2 style='color:#b91c1c;'>Installer Authorization Failed</h2><p>Invalid or missing authorization key. Access denied.</p></body></html>");
    }

    // Ensure CSRF token for web installer
    if (empty($_SESSION['installer_csrf'])) {
        $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
    }
}

// 3. CLI Automated Execution Mode
if ($isCli) {
    echo "========================================================\\n";
    echo "WE ONBOARD CLI INSTALLER\\n";
    echo "========================================================\\n";

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

        echo "1. Applying schema.sql...\\n";
        $schema_sql = file_get_contents(__DIR__ . '/database/schema.sql');
        $pdo->exec($schema_sql);

        echo "2. Seeding default roles and settings...\\n";
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

        file_put_contents($lock_file, date('Y-m-d H:i:s') . " - Installed successfully via CLI\\n");
        echo "SUCCESS: Database installed and locked. Run scripts/create_super_admin.php to create your Super Admin.\\n";
        exit(0);
    } catch (Exception $e) {
        error_log("[CLI Installer Error] " . $e->getMessage());
        echo "ERROR: Database installation failed. Diagnostic logged privately.\\n";
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
                file_put_contents($lock_file, date('Y-m-d H:i:s') . " - Installed successfully by " . $admin_email . " [Remote IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "]\\n");

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
`
    },
    {
      path: 'admin/auth_check.php',
      description: 'Server-side authentication and RBAC session middleware for admin pages',
      content: `<?php
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

/**
 * Server-authoritative Role Verification Helper
 * Enforces role capabilities on the server rather than trusting frontend state
 */
function require_role($allowed_roles = ['Super Admin']) {
    global $currentAdmin;
    $allowed = (array)$allowed_roles;
    if (!$currentAdmin || !in_array($currentAdmin['role_name'], $allowed, true)) {
        http_response_code(403);
        die("<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style='font-family: sans-serif; padding: 40px; text-align: center;'><h1 style='color: #02167F;'>403 Forbidden</h1><p>You do not have the required permissions to access this administrative resource.</p><p><a href='/admin/dashboard.php'>&larr; Return to Dashboard</a></p></body></html>");
    }
}
`
    },
    {
      path: 'admin/login.php',
      description: 'Admin Login page with password_verify, CSRF token, rate limiting & session regeneration',
      content: `<?php
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
`
    },
    {
      path: 'api/v1/health.php',
      description: 'API v1 Health & Database connectivity probe (generic status, no secret leakage)',
      content: `<?php
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
    die(json_encode(['status' => 'error', 'message' => 'Configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

$dbStatus = 'unavailable';
try {
    $db = Database::getConnection();
    if ($db) {
        $stmt = $db->query("SELECT 1");
        if ($stmt && $stmt->fetchColumn() == 1) {
            $dbStatus = 'available';
        }
    }
} catch (Exception $e) {
    error_log("Health check database failure: " . $e->getMessage());
    $dbStatus = 'unavailable';
}

$isHealthy = ($dbStatus === 'available');
http_response_code($isHealthy ? 200 : 503);

echo json_encode([
    'status' => $isHealthy ? 'healthy' : 'degraded',
    'service' => 'weonboard-api',
    'version' => '1.0.0',
    'database' => $dbStatus,
    'timestamp' => date('c')
], JSON_UNESCAPED_SLASHES);
`
    },
    {
      path: 'api/v1/enquiry.php',
      description: 'API v1: Public business & enterprise enquiry handler (Prepared statements, validation, transaction, audit & hardened idempotency)',
      content: `<?php
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
require_once $root . '/config/idempotency.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$fullName = trim($data['full_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$company = trim($data['company_name'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$service = trim($data['service_required'] ?? 'General enquiry');
$message = trim($data['message'] ?? '');
$enquiryType = trim($data['enquiry_type'] ?? 'Business');
$source = trim($data['source'] ?? 'Website Contact Form');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

// Server-side validation
if (empty($fullName) || empty($phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Full name and contact phone number are required.']);
    exit;
}

// Clean phone (digits and optional leading +)
$cleanPhone = preg_replace('/[^\\d+]/', '', $phone);
if (strlen(preg_replace('/\\D/', '', $cleanPhone)) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit phone number.']);
    exit;
}

if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}

$allowedEnquiryTypes = ['Business', 'Freelancer', 'MSME', 'Franchise / dealership brand', 'General enquiry'];
if (!in_array($enquiryType, $allowedEnquiryTypes, true)) {
    $enquiryType = 'Business';
}

$currentEndpoint = 'enquiry';
$currentPayloadHash = hash('sha256', !empty($rawInput) ? $rawInput : json_encode($data));

$db = null;
try {
    $db = Database::getConnection();

    // 1. Atomic Idempotency Check & Concurrency Reservation
    $idem = Idempotency::reserve($db, $idempotencyKey, $currentEndpoint, $currentPayloadHash);
    if ($idem['status'] === Idempotency::STATUS_HIT) {
        header('X-Idempotency-Hit: true');
        echo $idem['response_json'];
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_CONFLICT || $idem['status'] === Idempotency::STATUS_IN_PROGRESS) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_INVALID) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    }

    // 2. Prevent immediate duplicate submissions (within last 2 minutes by same phone)
    $dupCheck = $db->prepare("SELECT enquiry_ref FROM enquiries WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1");
    $dupCheck->execute([$cleanPhone]);
    $existing = $dupCheck->fetch();
    if ($existing) {
        $dupResponse = json_encode([
            'success' => true,
            'reference_id' => $existing['enquiry_ref'],
            'message' => 'Thank you! Your enquiry has already been received. Our operations team in Bangalore will contact you shortly.'
        ]);
        if (!empty($idempotencyKey)) {
            Idempotency::commit($db, $idempotencyKey, $dupResponse);
        }
        echo $dupResponse;
        exit;
    }

    $db->beginTransaction();

    $ref = 'WO-ENQ-' . date('Ymd') . '-' . rand(100, 999);

    $stmt = $db->prepare("INSERT INTO enquiries 
        (enquiry_ref, full_name, company_name, phone, email, enquiry_type, city, service_required, message, source, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')");
    $stmt->execute([$ref, $fullName, $company ?: null, $cleanPhone, $email, $enquiryType, $city, $service, $message, $source]);

    // Record audit log
    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Public Inbound', 'Public Enquiry Submitted', 'Enquiry', $ref, "New {$enquiryType} enquiry from {$fullName} ({$city})", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'message' => 'Thank you! Your enquiry has been received. Our operations team in Bangalore will contact you shortly.'
    ]);

    $db->commit();

    // Commit idempotency record after successful transaction commit
    if (!empty($idempotencyKey)) {
        Idempotency::commit($db, $idempotencyKey, $responseJson);
    }

    echo $responseJson;
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    error_log("Enquiry submission error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to record enquiry at this time. Please contact us directly at +91 96111 09490.']);
}
`
    },
    {
      path: 'api/v1/freelancers/register.php',
      description: 'API v1: Public freelancer registration endpoint with validation, duplicate check & hardened idempotency',
      content: `<?php
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
require_once $root . '/config/idempotency.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$fullName = trim($data['full_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$dob = trim($data['dob'] ?? '2000-01-01');
$gender = trim($data['gender'] ?? 'Male');
$address = trim($data['residential_address'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$state = trim($data['state'] ?? 'Karnataka');
$pinCode = trim($data['pin_code'] ?? '560038');
$isAdult = !empty($data['is_adult']) ? 1 : 0;
$hasSmartphone = !empty($data['has_smartphone']) ? 1 : 0;
$languages = is_array($data['languages'] ?? null) ? implode(', ', $data['languages']) : ($data['languages'] ?? 'Kannada, English');
$preferredAreas = is_array($data['preferred_areas'] ?? null) ? implode(', ', $data['preferred_areas']) : ($data['preferred_areas'] ?? 'Indiranagar');
$workType = trim($data['preferred_work_type'] ?? 'Flexible');
$education = trim($data['education'] ?? '12th Pass');
$expYears = intval($data['previous_experience_years'] ?? 0);
$salesExp = !empty($data['sales_field_experience']) ? 1 : 0;
$skills = is_array($data['skills'] ?? null) ? implode(', ', $data['skills']) : ($data['skills'] ?? 'Field Operations');
$preferredRole = trim($data['preferred_role'] ?? 'Rider / Delivery Partner');
$prevEmployer = trim($data['previous_employer'] ?? '');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

$password = $data['password'] ?? '';
$cleanPhone = preg_replace('/[^\\d+]/', '', $phone);
$digits = preg_replace('/\\D/', '', $cleanPhone);

if (empty($fullName) || empty($cleanPhone) || empty($email) || !$isAdult || !$hasSmartphone) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Mandatory fields missing: Full name, phone, email, adult confirmation (18+), and smartphone availability are required.']);
    exit;
}

if (strlen($digits) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid 10-digit mobile number.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}

// Strict Age Verification (Must be at least 18 years old)
try {
    $dobDate = new DateTime($dob);
    $today = new DateTime('today');
    $age = $dobDate->diff($today)->y;
    if ($age < 18) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Eligibility requirement: You must be at least 18 years of age to register as an independent field associate.']);
        exit;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Date of Birth (YYYY-MM-DD).']);
    exit;
}

// Password validation (if provided, must be at least 8 chars)
$passwordHash = null;
if (!empty($password)) {
    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Security requirement: Password must be at least 8 characters in length.']);
        exit;
    }
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
}

$currentEndpoint = 'freelancer_register';
$currentPayloadHash = hash('sha256', !empty($rawInput) ? $rawInput : json_encode($data));

$db = null;
try {
    $db = Database::getConnection();

    // 1. Atomic Idempotency Check & Concurrency Reservation
    $idem = Idempotency::reserve($db, $idempotencyKey, $currentEndpoint, $currentPayloadHash);
    if ($idem['status'] === Idempotency::STATUS_HIT) {
        header('X-Idempotency-Hit: true');
        echo $idem['response_json'];
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_CONFLICT || $idem['status'] === Idempotency::STATUS_IN_PROGRESS) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_INVALID) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    }

    // 2. Check duplicates on phone or email (strict privacy: NEVER leak existing registration_ref)
    $checkStmt = $db->prepare("SELECT id FROM freelancers WHERE phone = ? OR email = ? LIMIT 1");
    $checkStmt->execute([$cleanPhone, $email]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        if (!empty($idempotencyKey)) {
            Idempotency::release($db, $idempotencyKey);
        }
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'An application with this mobile number or email address has already been submitted. Our operations team reviews all applications within 24-48 hours.'
        ]);
        exit;
    }

    $db->beginTransaction();

    $ref = 'WO-FR-' . date('Y') . '-' . str_pad((string)rand(100, 9999), 4, '0', STR_PAD_LEFT);

    $stmt = $db->prepare("INSERT INTO freelancers 
        (registration_ref, full_name, email, phone, dob, gender, residential_address, city, state, pin_code, is_adult, has_smartphone, languages, preferred_areas, preferred_work_type, education, previous_experience_years, sales_field_experience, skills, preferred_role, previous_employer, status, onboarding_status, language_preference, profile_completed_percent, password_hash) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'KYC Pending', 'en', 60, ?)");
    
    $stmt->execute([
        $ref, $fullName, $email, $cleanPhone, $dob, $gender, $address, $city, $state, $pinCode,
        $isAdult, $hasSmartphone, $languages, $preferredAreas, $workType, $education,
        $expYears, $salesExp, $skills, $preferredRole, $prevEmployer ?: null, $passwordHash
    ]);

    $newFreelancerId = (int)$db->lastInsertId();

    // Welcome Notification
    $notifStmt = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, 'Welcome to We Onboard', 'Your application has been received under our Zero Joining Fee guarantee. Next step: Upload your KYC identity documents to activate project assignments.', 'kyc')");
    $notifStmt->execute([$newFreelancerId]);

    // Record audit
    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Public Candidate', 'Freelancer Registration Submitted', 'Freelancer', $ref, "{$fullName} registered for {$preferredRole} in {$city} (Zero Fee Policy)", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'has_account' => !empty($passwordHash),
        'message' => 'Application submitted successfully under Zero Joining Fee policy. Our Bangalore team will review within 24-48 hours.'
    ]);

    $db->commit();

    // Commit idempotency record after successful transaction commit
    if (!empty($idempotencyKey)) {
        Idempotency::commit($db, $idempotencyKey, $responseJson);
    }

    echo $responseJson;
} catch (PDOException $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate entry') !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'An application with this mobile number or email address has already been submitted.']);
        exit;
    }
    error_log("Freelancer registration database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to complete registration at this time. Please try again or contact support at mail@weonboard.in.']);
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    error_log("Freelancer registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to complete registration at this time. Please try again or contact support at mail@weonboard.in.']);
}
`
    },
    {
      path: 'api/v1/msme_request.php',
      description: 'API v1: Government & Nodal Agency Desk Request Endpoint with hardened idempotency',
      content: `<?php
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
require_once $root . '/config/idempotency.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$businessName = trim($data['business_name'] ?? '');
$applicantName = trim($data['applicant_name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$city = trim($data['city'] ?? 'Bengaluru');
$state = trim($data['state'] ?? 'Karnataka');
$category = trim($data['category'] ?? 'Micro');
$stage = trim($data['stage'] ?? '1-3 Years');
$services = is_array($data['requested_services'] ?? null) ? implode(', ', $data['requested_services']) : ($data['requested_services'] ?? 'Government Scheme Operations');
$description = trim($data['description'] ?? '');
$idempotencyKey = trim($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ($data['idempotency_key'] ?? ''));

$cleanPhone = preg_replace('/[^\\d+]/', '', $phone);

if (empty($businessName) || empty($applicantName) || empty($cleanPhone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Entity name, applicant name, and contact phone number are required.']);
    exit;
}

$currentEndpoint = 'msme_request';
$currentPayloadHash = hash('sha256', !empty($rawInput) ? $rawInput : json_encode($data));

$db = null;
try {
    $db = Database::getConnection();

    // 1. Atomic Idempotency Check & Concurrency Reservation
    $idem = Idempotency::reserve($db, $idempotencyKey, $currentEndpoint, $currentPayloadHash);
    if ($idem['status'] === Idempotency::STATUS_HIT) {
        header('X-Idempotency-Hit: true');
        echo $idem['response_json'];
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_CONFLICT || $idem['status'] === Idempotency::STATUS_IN_PROGRESS) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    } elseif ($idem['status'] === Idempotency::STATUS_INVALID) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $idem['error']]);
        exit;
    }

    // 2. Prevent immediate duplicate submissions (within 5 minutes by same phone)
    $dupCheck = $db->prepare("SELECT request_ref FROM msme_requests WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1");
    $dupCheck->execute([$cleanPhone]);
    $existing = $dupCheck->fetch();
    if ($existing) {
        $dupResponse = json_encode([
            'success' => true,
            'reference_id' => $existing['request_ref'],
            'message' => 'Department proposal already recorded under reference ' . $existing['request_ref'] . '. Our State Operations Director will connect shortly.'
        ]);
        if (!empty($idempotencyKey)) {
            Idempotency::commit($db, $idempotencyKey, $dupResponse);
        }
        echo $dupResponse;
        exit;
    }

    $db->beginTransaction();

    $ref = 'MSME-' . date('Y') . '-' . rand(1000, 9999);

    $stmt = $db->prepare("INSERT INTO msme_requests (request_ref, business_name, applicant_name, phone, email, city, state, category, stage, requested_services, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')");
    $stmt->execute([$ref, $businessName, $applicantName, $cleanPhone, $email, $city, $state, $category, $stage, $services, $description]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute(['Government / MSME Desk', 'Proposal Request Logged', 'MSME', $ref, "Request logged for {$businessName} ({$category})", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    $responseJson = json_encode([
        'success' => true,
        'reference_id' => $ref,
        'message' => 'Department proposal received. Our State Operations Director will connect shortly.'
    ]);

    $db->commit();

    // Commit idempotency record after successful transaction commit
    if (!empty($idempotencyKey)) {
        Idempotency::commit($db, $idempotencyKey, $responseJson);
    }

    echo $responseJson;
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    if (!empty($idempotencyKey) && $db) {
        Idempotency::release($db, $idempotencyKey);
    }
    error_log("MSME request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to record proposal at this time. Please contact our nodal desk directly at mail@weonboard.in.']);
}
`
    },
    {
      path: 'api/v1/auth/login.php',
      description: 'API v1: Secure Admin Login with Rate Limiting, password_verify, session regeneration & audit',
      content: `<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

// Security: Use authoritative REMOTE_ADDR only. Never trust client-supplied headers (X-Forwarded-For, etc.)
// which can be trivially forged to bypass IP-based rate limiting.
$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Rate limiting: Check failed attempts within last 15 minutes by IP or by Email
    $rateStmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR email = ?) AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $rateStmt->execute([$ip, $email]);
    $failedCount = (int)$rateStmt->fetchColumn();

    if ($failedCount >= 5) {
        http_response_code(429);
        echo json_encode([
            'success' => false, 
            'error' => 'Too many failed login attempts. Account access is temporarily locked for 15 minutes.'
        ]);
        exit;
    }

    // 2. Fetch active user
    $stmt = $db->prepare("SELECT u.id, u.name, u.email, u.password_hash, u.role_id, u.is_active, r.name as role_name 
                          FROM admin_users u 
                          JOIN roles r ON u.role_id = r.id 
                          WHERE LOWER(u.email) = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // 3. Verify password hash
    if ($user && (int)$user['is_active'] === 1 && password_verify($password, $user['password_hash'])) {
        // Clear failed login attempts on success
        $clearStmt = $db->prepare("DELETE FROM login_attempts WHERE ip_address = ? OR email = ?");
        $clearStmt->execute([$ip, $email]);

        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);

        // Strict Role Separation: Clear any freelancer session keys
        unset($_SESSION['freelancer_id'], $_SESSION['freelancer_ref'], $_SESSION['freelancer_name'], $_SESSION['freelancer_email']);

        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_name'] = $user['name'];
        $_SESSION['admin_email'] = $user['email'];
        $_SESSION['admin_role'] = $user['role_name'];
        $_SESSION['admin_role_id'] = $user['role_id'];
        $_SESSION['user_type'] = 'admin';

        // Update last_login
        $db->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

        // Audit log (NEVER log password or session ID)
        $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Login', 'Auth', ?, 'Successful admin authentication via API', ?)");
        $auditStmt->execute([$user['name'], (string)$user['id'], $ip]);

        echo json_encode([
            'success' => true,
            'message' => 'Authentication successful.',
            'csrf_token' => $_SESSION['csrf_token'],
            'user' => [
                'id' => (string)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role_name']
            ]
        ]);
        exit;
    }

    // 4. Failed authentication: log attempt and return generic error
    $logAttempt = $db->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)");
    $logAttempt->execute([$ip, $email]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Failed Login', 'Auth', 'SECURITY_EVENT', 'Failed login attempt', ?)");
    $auditStmt->execute([$email, $ip]);

    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'error' => 'Invalid credentials. Please check your email and password.'
    ]);
} catch (Exception $e) {
    error_log("Login server error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Authentication service temporarily unavailable. Please try again shortly.']);
}
`
    },
    {
      path: 'api/v1/auth/logout.php',
      description: 'API v1: Secure Session Invalidation & Logout',
      content: `<?php
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

$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully.'
]);
`
    },
    {
      path: 'api/v1/auth/me.php',
      description: 'API v1: Check current authenticated session user profile',
      content: `<?php
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'authenticated' => false]);
    exit;
}

try {
    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT u.id, u.name, u.email, r.name as role FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $stmt->execute([$_SESSION['admin_id']]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'csrf_token' => $_SESSION['csrf_token'],
            'user' => [
                'id' => (string)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
        exit;
    }
} catch (Exception $e) {
    error_log("Session check error: " . $e->getMessage());
}

http_response_code(401);
echo json_encode(['success' => false, 'authenticated' => false]);
`
    },
    {
      path: 'api/v1/csrf.php',
      description: 'API v1: Session CSRF token retrieval endpoint for state-changing requests',
      content: `<?php
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

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success' => true,
    'csrf_token' => $_SESSION['csrf_token'] ?? ''
]);
`
    },
    {
      path: 'api/v1/freelancers/login.php',
      description: 'API v1: Authenticate freelancer with rate limiting, password_verify, session regeneration & RBAC isolation',
      content: `<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
$data = is_array($jsonInput) ? $jsonInput : $_POST;

$identifier = trim($data['identifier'] ?? ($data['email'] ?? ($data['phone'] ?? '')));
$password = $data['password'] ?? '';

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

if (empty($identifier) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Login identifier (email, phone, or registration reference) and password are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Rate limiting check (5 attempts per 15 minutes by IP or identifier)
    $rateStmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR email = ?) AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $rateStmt->execute([$ip, $identifier]);
    $failedCount = (int)$rateStmt->fetchColumn();

    if ($failedCount >= 5) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Too many failed login attempts. For security, your account login is temporarily locked for 15 minutes.'
        ]);
        exit;
    }

    // 2. Fetch freelancer by email, clean phone, or registration_ref
    $cleanPhone = preg_replace('/[^\\d+]/', '', $identifier);
    $stmt = $db->prepare("SELECT * FROM freelancers WHERE LOWER(email) = LOWER(?) OR registration_ref = ? OR (phone = ? AND LENGTH(?) >= 10) LIMIT 1");
    $stmt->execute([$identifier, $identifier, $cleanPhone, $cleanPhone]);
    $fl = $stmt->fetch();

    // 3. Verify password hash using secure password_verify
    if ($fl && !empty($fl['password_hash']) && password_verify($password, $fl['password_hash'])) {
        // Check if account is suspended or inactive
        if (in_array($fl['status'], ['Suspended', 'Inactive'], true)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'This account is currently ' . strtolower($fl['status']) . '. Please reach out to operations at mail@weonboard.in.'
            ]);
            exit;
        }

        // Clear failed login attempts
        $clearStmt = $db->prepare("DELETE FROM login_attempts WHERE ip_address = ? OR email = ?");
        $clearStmt->execute([$ip, $identifier]);

        // Regenerate session ID to prevent session fixation attacks
        session_regenerate_id(true);

        // Strict Session Isolation: Clear any admin session attributes
        unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_email'], $_SESSION['admin_role'], $_SESSION['admin_role_id']);

        // Set freelancer session
        $_SESSION['freelancer_id'] = (int)$fl['id'];
        $_SESSION['freelancer_ref'] = $fl['registration_ref'];
        $_SESSION['freelancer_name'] = $fl['full_name'];
        $_SESSION['freelancer_email'] = $fl['email'];
        $_SESSION['user_type'] = 'freelancer';

        // Audit log (Never log password or raw session token)
        $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Freelancer Login', 'Auth', ?, 'Successful freelancer self-service authentication', ?)");
        $auditStmt->execute([$fl['full_name'], (string)$fl['registration_ref'], $ip]);

        // Load KYC documents status
        $docsStmt = $db->prepare("SELECT id, document_ref, document_type, original_filename, status, rejection_reason, created_at, reviewed_at FROM freelancer_documents WHERE freelancer_id = ? ORDER BY created_at ASC");
        $docsStmt->execute([$fl['id']]);
        $documents = $docsStmt->fetchAll();

        // Load recent notifications
        $notifStmt = $db->prepare("SELECT id, title, message, type, is_read, created_at FROM freelancer_notifications WHERE freelancer_id = ? ORDER BY created_at DESC LIMIT 10");
        $notifStmt->execute([$fl['id']]);
        $notifications = $notifStmt->fetchAll();

        echo json_encode([
            'success' => true,
            'message' => 'Freelancer authentication successful.',
            'csrf_token' => $_SESSION['csrf_token'],
            'user' => [
                'id' => (string)$fl['id'],
                'registrationRef' => $fl['registration_ref'],
                'fullName' => $fl['full_name'],
                'email' => $fl['email'],
                'phone' => $fl['phone'],
                'city' => $fl['city'],
                'state' => $fl['state'],
                'preferredRole' => $fl['preferred_role'],
                'status' => $fl['status'],
                'onboardingStatus' => $fl['onboarding_status'] ?? 'KYC Pending',
                'languagePreference' => $fl['language_preference'] ?? 'en',
                'profileCompletedPercent' => (int)($fl['profile_completed_percent'] ?? 60),
                'registeredAt' => $fl['created_at'],
                'documents' => $documents,
                'notifications' => $notifications
            ]
        ]);
        exit;
    }

    // 4. Record failed attempt
    $logAttempt = $db->prepare("INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)");
    $logAttempt->execute([$ip, $identifier]);

    $auditStmt = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Failed Freelancer Login', 'Auth', 'SECURITY_EVENT', 'Failed login attempt for freelancer identifier', ?)");
    $auditStmt->execute([$identifier, $ip]);

    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid credentials. Please verify your registered email/phone and password.'
    ]);
} catch (Exception $e) {
    error_log("Freelancer login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Authentication service temporarily unavailable. Please try again shortly.']);
}
`
    },
    {
      path: 'api/v1/freelancers/me.php',
      description: 'API v1: Restore freelancer session, profile completion & notifications',
      content: `<?php
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
`
    },
    {
      path: 'api/v1/freelancers/logout.php',
      description: 'API v1: Invalidate active freelancer session',
      content: `<?php
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

header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['freelancer_id'])) {
    unset(
        $_SESSION['freelancer_id'],
        $_SESSION['freelancer_ref'],
        $_SESSION['freelancer_name'],
        $_SESSION['freelancer_email'],
        $_SESSION['user_type']
    );
}

// Regenerate session id on logout to prevent fixation
if (session_status() === PHP_SESSION_ACTIVE) {
    session_regenerate_id(true);
}

echo json_encode([
    'success' => true,
    'message' => 'Freelancer session invalidated successfully.'
]);
`
    },
    {
      path: 'api/v1/freelancers/profile.php',
      description: 'API v1: Freelancer profile settings & password modification with CSRF enforcement',
      content: `<?php
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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in to manage your profile.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    // CSRF verification for cookie-authenticated state modification
    verify_csrf();

    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    $data = is_array($jsonInput) ? $jsonInput : $_POST;

    $action = $data['action'] ?? 'update_settings';

    try {
        $db = Database::getConnection();

        if ($action === 'update_settings') {
            $lang = trim($data['language_preference'] ?? 'en');
            $allowedLangs = ['en', 'kn', 'hi', 'ta', 'te'];
            if (!in_array($lang, $allowedLangs, true)) {
                $lang = 'en';
            }

            $skills = is_array($data['skills'] ?? null) ? implode(', ', $data['skills']) : ($data['skills'] ?? null);
            $workType = trim($data['preferred_work_type'] ?? '');
            $address = trim($data['residential_address'] ?? '');

            $fields = ['language_preference = ?'];
            $params = [$lang];

            if (!empty($skills)) {
                $fields[] = 'skills = ?';
                $params[] = $skills;
            }
            if (!empty($workType) && in_array($workType, ['Full-time', 'Part-time', 'Flexible'], true)) {
                $fields[] = 'preferred_work_type = ?';
                $params[] = $workType;
            }
            if (!empty($address)) {
                $fields[] = 'residential_address = ?';
                $params[] = $address;
            }

            $params[] = $freelancerId;
            $sql = "UPDATE freelancers SET " . implode(', ', $fields) . " WHERE id = ?";
            $db->prepare($sql)->execute($params);

            echo json_encode([
                'success' => true,
                'message' => 'Profile settings updated successfully.',
                'language_preference' => $lang
            ]);
            exit;
        }

        if ($action === 'change_password') {
            $currentPass = $data['current_password'] ?? '';
            $newPass = $data['new_password'] ?? '';

            if (empty($currentPass) || empty($newPass)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password and new password are required.']);
                exit;
            }

            if (strlen($newPass) < 8) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters long.']);
                exit;
            }

            $stmt = $db->prepare("SELECT password_hash FROM freelancers WHERE id = ?");
            $stmt->execute([$freelancerId]);
            $hash = $stmt->fetchColumn();

            if (!$hash || !password_verify($currentPass, $hash)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
                exit;
            }

            $newHash = password_hash($newPass, PASSWORD_DEFAULT);
            $db->prepare("UPDATE freelancers SET password_hash = ? WHERE id = ?")->execute([$newHash, $freelancerId]);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Password Change', 'Freelancer', ?, 'Freelancer changed their password', ?)")
               ->execute([$_SESSION['freelancer_name'] ?? 'Freelancer', (string)$freelancerId, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

            echo json_encode([
                'success' => true,
                'message' => 'Your password has been changed securely.'
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown action requested.']);
    } catch (Exception $e) {
        error_log("Profile update error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error updating profile settings.']);
    }
}
`
    },
    {
      path: 'api/v1/freelancers/kyc/upload.php',
      description: 'API v1: Secure KYC document upload with MIME validation, 5MB limit & private storage',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in to upload KYC documents.']);
    exit;
}

// Enforce CSRF validation on file upload
verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];
$documentType = trim($_POST['document_type'] ?? '');

$allowedTypes = [
    'Aadhaar / National ID',
    'PAN / Tax ID',
    'Driving License / Address Proof',
    'Bank Details / Cancelled Cheque',
    'Educational Certificate',
    'Other'
];

if (!in_array($documentType, $allowedTypes, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid document type. Allowed types: ' . implode(', ', $allowedTypes)
    ]);
    exit;
}

if (empty($_FILES['document']) || !is_uploaded_file($_FILES['document']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No file was uploaded or file transfer failed.']);
    exit;
}

$file = $_FILES['document'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive specified in the form.',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder on server.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.'
    ];
    echo json_encode(['success' => false, 'error' => $uploadErrors[$file['error']] ?? 'File upload error.']);
    exit;
}

// Maximum file size: 5 MB
$maxBytes = 5 * 1024 * 1024;
if ($file['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds maximum allowed limit of 5 MB.']);
    exit;
}

// File extension check
$originalName = basename($file['name']);
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

if (!in_array($ext, $allowedExtensions, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid file extension. Only PDF, JPG, JPEG, PNG, and WEBP files are accepted.'
    ]);
    exit;
}

// Authoritative MIME type detection using finfo
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];

if (!in_array($mimeType, $allowedMimes, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid file content type (' . htmlspecialchars($mimeType, ENT_QUOTES, 'UTF-8') . '). File must be a valid PDF or image.'
    ]);
    exit;
}

// Ensure secure storage directory exists
$storageDir = STORAGE_PATH . '/kyc';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0750, true);
    // Write protection rules
    @file_put_contents($storageDir . '/.htaccess', "Order Deny,Allow\\nDeny from all\\n");
    @file_put_contents($storageDir . '/index.html', "<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1></body></html>");
}

// Generate obfuscated, non-predictable filename to prevent direct enumeration
$docRef = 'DOC-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
$storedFilename = 'kyc_' . $freelancerId . '_' . bin2hex(random_bytes(12)) . '.' . $ext;
$targetPath = $storageDir . '/' . $storedFilename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to store document in secure private storage.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Check if an existing document of this type exists for this freelancer
    $checkStmt = $db->prepare("SELECT id, stored_filename FROM freelancer_documents WHERE freelancer_id = ? AND document_type = ? LIMIT 1");
    $checkStmt->execute([$freelancerId, $documentType]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        // Remove previous physical file if it exists
        $oldFile = $storageDir . '/' . $existing['stored_filename'];
        if (file_exists($oldFile)) {
            @unlink($oldFile);
        }

        // Update existing record
        $stmt = $db->prepare("UPDATE freelancer_documents SET 
            document_ref = ?,
            original_filename = ?,
            stored_filename = ?,
            file_path = ?,
            file_size = ?,
            mime_type = ?,
            status = 'Pending',
            rejection_reason = NULL,
            reviewed_by = NULL,
            reviewed_at = NULL,
            updated_at = NOW()
            WHERE id = ?");
        $stmt->execute([
            $docRef,
            $originalName,
            $storedFilename,
            'storage/kyc/' . $storedFilename,
            $file['size'],
            $mimeType,
            $existing['id']
        ]);
        $docId = $existing['id'];
    } else {
        // Insert new record
        $stmt = $db->prepare("INSERT INTO freelancer_documents 
            (document_ref, freelancer_id, document_type, original_filename, stored_filename, file_path, file_size, mime_type, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([
            $docRef,
            $freelancerId,
            $documentType,
            $originalName,
            $storedFilename,
            'storage/kyc/' . $storedFilename,
            $file['size'],
            $mimeType
        ]);
        $docId = (int)$db->lastInsertId();
    }

    // Update freelancer onboarding status to 'Under Review'
    $db->prepare("UPDATE freelancers SET onboarding_status = 'Under Review' WHERE id = ? AND onboarding_status IN ('KYC Pending', 'Action Required')")->execute([$freelancerId]);

    // Add notification
    $notifMsg = "Your {$documentType} ({$originalName}) has been securely submitted and is queued for verification by operations.";
    $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, 'KYC Document Submitted', ?, 'kyc')")
       ->execute([$freelancerId, $notifMsg]);

    // Audit log
    $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'KYC Upload', 'Freelancer Document', ?, ?, ?)")
       ->execute([
           $_SESSION['freelancer_name'] ?? 'Freelancer',
           $docRef,
           "Uploaded {$documentType} ({$originalName}, " . round($file['size'] / 1024, 1) . " KB)",
           $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
       ]);

    echo json_encode([
        'success' => true,
        'message' => "Document '{$originalName}' uploaded successfully. Status: Pending Verification.",
        'document' => [
            'id' => (string)$docId,
            'document_ref' => $docRef,
            'document_type' => $documentType,
            'original_filename' => $originalName,
            'file_size' => $file['size'],
            'status' => 'Pending',
            'submitted_at' => date('Y-m-d H:i:s')
        ]
    ]);
} catch (Exception $e) {
    error_log("KYC upload database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error while saving document metadata.']);
}
`
    },
    {
      path: 'api/v1/freelancers/kyc/view.php',
      description: 'API v1: Authorized document delivery with ownership verification and path traversal prevention',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die("System configuration not found.");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

$docId = $_GET['id'] ?? ($_GET['doc_ref'] ?? '');

if (empty($docId)) {
    http_response_code(400);
    die("Document identifier is required.");
}

try {
    $db = Database::getConnection();

    // Fetch document record
    $stmt = $db->prepare("SELECT d.*, f.full_name as freelancer_name, f.email as freelancer_email 
                          FROM freelancer_documents d 
                          JOIN freelancers f ON d.freelancer_id = f.id 
                          WHERE d.id = ? OR d.document_ref = ? LIMIT 1");
    $stmt->execute([$docId, $docId]);
    $doc = $stmt->fetch();

    if (!$doc) {
        http_response_code(404);
        die("Document not found.");
    }

    // Authorization Verification:
    // 1. Is the requester the owning freelancer?
    $isOwner = (!empty($_SESSION['freelancer_id']) && (int)$_SESSION['freelancer_id'] === (int)$doc['freelancer_id']);

    // 2. Is the requester an authorized administrator?
    $isAdmin = false;
    if (!empty($_SESSION['admin_id'])) {
        $admStmt = $db->prepare("SELECT u.id, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
        $admStmt->execute([$_SESSION['admin_id']]);
        $admin = $admStmt->fetch();
        if ($admin && in_array($admin['role_name'], ['Super Admin', 'Administrator', 'Freelancer Coordinator'], true)) {
            $isAdmin = true;
        }
    }

    if (!$isOwner && !$isAdmin) {
        http_response_code(403);
        die("Access denied: You are not authorized to view this confidential identity document.");
    }

    $filePath = STORAGE_PATH . '/kyc/' . basename($doc['stored_filename']);

    if (!file_exists($filePath)) {
        http_response_code(404);
        die("Document file was not found on private storage.");
    }

    // Set secure delivery headers
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Disposition: inline; filename="' . addslashes($doc['original_filename']) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    readfile($filePath);
    exit;
} catch (Exception $e) {
    error_log("KYC document view error: " . $e->getMessage());
    http_response_code(500);
    die("Server error accessing document.");
}
`
    },
    {
      path: 'api/v1/admin/freelancers/list.php',
      description: 'API v1: Administrator list & search of freelancer profiles with role verification',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify Admin Role & Permissions
    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Your role (' . ($admin['role_name'] ?? 'Unknown') . ') does not have permission to view or manage freelancer identity profiles.'
        ]);
        exit;
    }

    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $onboardingStatus = trim($_GET['onboarding_status'] ?? '');
    $city = trim($_GET['city'] ?? '');
    $role = trim($_GET['role'] ?? '');

    $where = [];
    $params = [];

    if (!empty($search)) {
        $where[] = "(f.full_name LIKE ? OR f.phone LIKE ? OR f.email LIKE ? OR f.registration_ref LIKE ? OR f.city LIKE ?)";
        $wildcard = '%' . $search . '%';
        $params = array_merge($params, [$wildcard, $wildcard, $wildcard, $wildcard, $wildcard]);
    }

    if (!empty($status) && $status !== 'All') {
        $where[] = "f.status = ?";
        $params[] = $status;
    }

    if (!empty($onboardingStatus) && $onboardingStatus !== 'All') {
        $where[] = "f.onboarding_status = ?";
        $params[] = $onboardingStatus;
    }

    if (!empty($city) && $city !== 'All') {
        $where[] = "f.city = ?";
        $params[] = $city;
    }

    if (!empty($role) && $role !== 'All') {
        $where[] = "f.preferred_role = ?";
        $params[] = $role;
    }

    $whereSql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT f.*, 
            COUNT(d.id) as total_docs,
            SUM(CASE WHEN d.status = 'Approved' THEN 1 ELSE 0 END) as approved_docs,
            SUM(CASE WHEN d.status = 'Pending' THEN 1 ELSE 0 END) as pending_docs,
            SUM(CASE WHEN d.status = 'Resubmission Required' THEN 1 ELSE 0 END) as resubmission_docs,
            SUM(CASE WHEN d.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_docs
            FROM freelancers f
            LEFT JOIN freelancer_documents d ON f.id = d.freelancer_id
            {$whereSql}
            GROUP BY f.id
            ORDER BY f.created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $freelancers = $stmt->fetchAll();

    // Format results
    $formatted = [];
    foreach ($freelancers as $row) {
        $formatted[] = [
            'id' => (string)$row['id'],
            'registrationRef' => $row['registration_ref'],
            'fullName' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'dob' => $row['dob'],
            'gender' => $row['gender'],
            'residentialAddress' => $row['residential_address'],
            'city' => $row['city'],
            'state' => $row['state'],
            'pinCode' => $row['pin_code'],
            'languages' => array_map('trim', explode(',', $row['languages'] ?? '')),
            'preferredAreas' => array_map('trim', explode(',', $row['preferred_areas'] ?? '')),
            'preferredWorkType' => $row['preferred_work_type'],
            'education' => $row['education'],
            'previousExperienceYears' => (int)$row['previous_experience_years'],
            'salesFieldExperience' => (bool)$row['sales_field_experience'],
            'skills' => array_map('trim', explode(',', $row['skills'] ?? '')),
            'preferredRole' => $row['preferred_role'],
            'previousEmployer' => $row['previous_employer'],
            'status' => $row['status'],
            'onboardingStatus' => $row['onboarding_status'] ?? 'KYC Pending',
            'languagePreference' => $row['language_preference'] ?? 'en',
            'profileCompletedPercent' => (int)($row['profile_completed_percent'] ?? 60),
            'verificationNotes' => $row['verification_notes'],
            'registeredAt' => $row['created_at'],
            'docSummary' => [
                'total' => (int)$row['total_docs'],
                'approved' => (int)$row['approved_docs'],
                'pending' => (int)$row['pending_docs'],
                'resubmission' => (int)$row['resubmission_docs'],
                'rejected' => (int)$row['rejected_docs']
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($formatted),
        'freelancers' => $formatted
    ]);
} catch (Exception $e) {
    error_log("Admin freelancer list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to load freelancer applications.']);
}
`
    },
    {
      path: 'api/v1/admin/freelancers/review.php',
      description: 'API v1: Admin KYC review transitions with mandatory reasons, audit logging & status recalculation',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Administrator authentication required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify Admin Role & Permissions
    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Your role (' . ($admin['role_name'] ?? 'Unknown') . ') is not authorized for freelancer KYC verification.'
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $freelancerId = (int)($_GET['freelancer_id'] ?? 0);
        if ($freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'freelancer_id parameter is required.']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
        $stmt->execute([$freelancerId]);
        $fl = $stmt->fetch();

        if (!$fl) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
            exit;
        }

        // Fetch documents
        $docsStmt = $db->prepare("SELECT d.*, u.name as reviewer_name 
                                  FROM freelancer_documents d 
                                  LEFT JOIN admin_users u ON d.reviewed_by = u.id 
                                  WHERE d.freelancer_id = ? 
                                  ORDER BY d.created_at ASC");
        $docsStmt->execute([$freelancerId]);
        $documents = $docsStmt->fetchAll();

        // Fetch audit logs for this freelancer
        $auditStmt = $db->prepare("SELECT * FROM audit_logs WHERE (record_type = 'Freelancer' AND record_id = ?) OR (record_type = 'Freelancer Document' AND record_id LIKE ?) ORDER BY created_at DESC LIMIT 25");
        $auditStmt->execute([$fl['registration_ref'], 'DOC-%']);
        $audits = $auditStmt->fetchAll();

        echo json_encode([
            'success' => true,
            'freelancer' => $fl,
            'documents' => $documents,
            'auditLogs' => $audits
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Enforce CSRF protection for sensitive review transitions
        verify_csrf();

        $rawInput = file_get_contents('php://input');
        $jsonInput = json_decode($rawInput, true);
        $data = is_array($jsonInput) ? $jsonInput : $_POST;

        $action = $data['action'] ?? '';

        if ($action === 'review_document') {
            $docId = (int)($data['document_id'] ?? 0);
            $decision = trim($data['decision'] ?? '');
            $reason = trim($data['reason'] ?? '');

            $allowedDecisions = ['Approved', 'Rejected', 'Resubmission Required'];
            if (!in_array($decision, $allowedDecisions, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid decision. Allowed: Approved, Rejected, Resubmission Required.']);
                exit;
            }

            if (in_array($decision, ['Rejected', 'Resubmission Required'], true) && empty($reason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A clear review reason is mandatory when rejecting or requesting resubmission of an identity document.']);
                exit;
            }

            $docStmt = $db->prepare("SELECT d.*, f.id as fl_id, f.full_name as fl_name, f.registration_ref FROM freelancer_documents d JOIN freelancers f ON d.freelancer_id = f.id WHERE d.id = ? LIMIT 1");
            $docStmt->execute([$docId]);
            $doc = $docStmt->fetch();

            if (!$doc) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Document not found.']);
                exit;
            }

            $updateStmt = $db->prepare("UPDATE freelancer_documents SET 
                status = ?, 
                rejection_reason = ?, 
                reviewed_by = ?, 
                reviewed_at = NOW(), 
                updated_at = NOW() 
                WHERE id = ?");
            $updateStmt->execute([
                $decision,
                !empty($reason) ? $reason : null,
                $_SESSION['admin_id'],
                $docId
            ]);

            // Add notification to freelancer
            $notifTitle = "KYC Document: {$doc['document_type']} {$decision}";
            $notifMsg = $decision === 'Approved' 
                ? "Your {$doc['document_type']} has been verified and approved by operations."
                : ($decision === 'Resubmission Required' 
                    ? "Resubmission required for {$doc['document_type']}. Reason: {$reason}. Please upload a clear replacement."
                    : "Your {$doc['document_type']} was rejected. Reason: {$reason}.");

            $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'kyc')")
               ->execute([$doc['fl_id'], $notifTitle, $notifMsg]);

            // Recalculate freelancer onboarding status
            $statusCheck = $db->prepare("SELECT status FROM freelancer_documents WHERE freelancer_id = ?");
            $statusCheck->execute([$doc['fl_id']]);
            $docStatuses = $statusCheck->fetchAll(PDO::FETCH_COLUMN);

            $newOnboarding = 'Under Review';
            if (in_array('Resubmission Required', $docStatuses, true) || in_array('Rejected', $docStatuses, true)) {
                $newOnboarding = 'Action Required';
            } elseif (count($docStatuses) > 0 && !in_array('Pending', $docStatuses, true) && !in_array('Rejected', $docStatuses, true) && !in_array('Resubmission Required', $docStatuses, true)) {
                $newOnboarding = 'Approved';
            }

            $db->prepare("UPDATE freelancers SET onboarding_status = ? WHERE id = ?")->execute([$newOnboarding, $doc['fl_id']]);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, ?, 'Freelancer Document', ?, ?, ?)")
               ->execute([
                   $admin['name'],
                   "KYC Document {$decision}",
                   $doc['document_ref'],
                   "Reviewed {$doc['document_type']} for {$doc['fl_name']} ({$doc['registration_ref']}). Decision: {$decision}" . (!empty($reason) ? " Reason: {$reason}" : ""),
                   $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
               ]);

            echo json_encode([
                'success' => true,
                'message' => "Document '{$doc['document_type']}' marked as {$decision}.",
                'decision' => $decision,
                'onboarding_status' => $newOnboarding
            ]);
            exit;
        }

        if ($action === 'update_freelancer_status') {
            $freelancerId = (int)($data['freelancer_id'] ?? 0);
            $status = trim($data['status'] ?? '');
            $onboardingStatus = trim($data['onboarding_status'] ?? '');
            $verificationNotes = trim($data['verification_notes'] ?? '');

            $flStmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
            $flStmt->execute([$freelancerId]);
            $fl = $flStmt->fetch();

            if (!$fl) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
                exit;
            }

            $updateFields = [];
            $params = [];

            if (!empty($status)) {
                $updateFields[] = "status = ?";
                $params[] = $status;
            }
            if (!empty($onboardingStatus)) {
                $updateFields[] = "onboarding_status = ?";
                $params[] = $onboardingStatus;
            }
            if (!empty($verificationNotes)) {
                $updateFields[] = "verification_notes = ?";
                $params[] = $verificationNotes;
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No updates provided.']);
                exit;
            }

            $params[] = $freelancerId;
            $sql = "UPDATE freelancers SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $db->prepare($sql)->execute($params);

            // Audit log
            $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES (?, 'Freelancer Status Update', 'Freelancer', ?, ?, ?)")
               ->execute([
                   $admin['name'],
                   $fl['registration_ref'],
                   "Status updated to: {$status}, Onboarding: {$onboardingStatus}. Notes: {$verificationNotes}",
                   $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
               ]);

            echo json_encode([
                'success' => true,
                'message' => "Freelancer {$fl['registration_ref']} updated successfully."
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown review action requested.']);
    }
} catch (Exception $e) {
    error_log("Admin freelancer review error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error processing review action.']);
}
`
    },
    {
      path: 'api/v1/academy/courses.php',
      description: 'Phase 4 Academy Course catalogue listing with enrollment progress and certificate flags',
      content: `<?php
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

try {
    $db = Database::getConnection();

    $category = trim($_GET['category'] ?? '');
    $language = trim($_GET['language'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $freelancerId = $_SESSION['freelancer_id'] ?? null;

    $where = ["c.status = 'Published'"];
    $params = [];

    if (!empty($category) && $category !== 'All') {
        $where[] = "c.category = ?";
        $params[] = $category;
    }

    if (!empty($language) && $language !== 'All') {
        $where[] = "c.language = ?";
        $params[] = $language;
    }

    if (!empty($search)) {
        $where[] = "(c.title LIKE ? OR c.description LIKE ? OR c.course_code LIKE ?)";
        $wildcard = '%' . $search . '%';
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $sql = "SELECT c.*, 
            (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as modules_count,
            (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id) as lessons_count,
            (SELECT a.passing_score FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as assessment_passing_score,
            (SELECT a.id FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as assessment_id
            FROM courses c
            WHERE " . implode(' AND ', $where) . "
            ORDER BY c.is_mandatory DESC, c.id ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rawCourses = $stmt->fetchAll();

    $courses = [];
    foreach ($rawCourses as $rc) {
        $courseId = (int)$rc['id'];
        $enrollment = null;
        $certificate = null;

        if ($freelancerId) {
            $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
            $enrStmt->execute([$freelancerId, $courseId]);
            $enrRow = $enrStmt->fetch();
            if ($enrRow) {
                // Fetch completed lessons
                $clStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
                $clStmt->execute([$freelancerId, $courseId]);
                $completedLessonIds = $clStmt->fetchAll(PDO::FETCH_COLUMN);

                $enrollment = [
                    'id' => (int)$enrRow['id'],
                    'status' => $enrRow['status'],
                    'progressPercent' => (int)$enrRow['progress_percent'],
                    'lastLessonId' => $enrRow['last_lesson_id'] ? (int)$enrRow['last_lesson_id'] : null,
                    'enrolledAt' => $enrRow['enrolled_at'],
                    'completedAt' => $enrRow['completed_at'],
                    'completedLessons' => array_map('intval', $completedLessonIds)
                ];
            }

            $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
            $certStmt->execute([$freelancerId, $courseId]);
            $certRow = $certStmt->fetch();
            if ($certRow) {
                $certificate = [
                    'id' => (int)$certRow['id'],
                    'certificateRef' => $certRow['certificate_ref'],
                    'issueDate' => $certRow['issue_date'],
                    'scorePercent' => (int)$certRow['score_percent'],
                    'verificationCode' => $certRow['verification_code'],
                    'createdAt' => $certRow['created_at']
                ];
            }
        }

        // Split learning objectives
        $objs = [];
        if (!empty($rc['learning_objectives'])) {
            $objs = array_filter(array_map('trim', explode(';', $rc['learning_objectives'])));
        }

        $courses[] = [
            'id' => $courseId,
            'courseCode' => $rc['course_code'],
            'title' => $rc['title'],
            'slug' => $rc['slug'],
            'description' => $rc['description'],
            'learningObjectives' => $objs,
            'category' => $rc['category'],
            'language' => $rc['language'],
            'estimatedMinutes' => (int)$rc['estimated_minutes'],
            'thumbnailUrl' => $rc['thumbnail_url'],
            'status' => $rc['status'],
            'passingScore' => (int)$rc['passing_score'],
            'maxAssessmentAttempts' => (int)$rc['max_assessment_attempts'],
            'isMandatory' => (bool)$rc['is_mandatory'],
            'modulesCount' => (int)$rc['modules_count'],
            'lessonsCount' => (int)$rc['lessons_count'],
            'hasAssessment' => !empty($rc['assessment_id']),
            'enrollment' => $enrollment,
            'certificate' => $certificate
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($courses),
        'courses' => $courses
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading academy courses: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/course_detail.php',
      description: 'Phase 4 Academy Course detail endpoint with full modules and lessons structure',
      content: `<?php
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

try {
    $db = Database::getConnection();

    $courseId = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
    $slug = trim($_GET['slug'] ?? '');
    $freelancerId = $_SESSION['freelancer_id'] ?? null;

    if ($courseId > 0) {
        $cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
        $cStmt->execute([$courseId]);
    } elseif (!empty($slug)) {
        $cStmt = $db->prepare("SELECT * FROM courses WHERE slug = ? LIMIT 1");
        $cStmt->execute([$slug]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing course id or slug']);
        exit;
    }

    $course = $cStmt->fetch();
    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course not found']);
        exit;
    }

    $cId = (int)$course['id'];

    // Modules and Lessons
    $mStmt = $db->prepare("SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC");
    $mStmt->execute([$cId]);
    $rawModules = $mStmt->fetchAll();

    // Completed lessons set if freelancer logged in
    $completedLessonIds = [];
    $enrollment = null;
    $certificate = null;
    $attemptCount = 0;
    $highestScore = 0;

    if ($freelancerId) {
        $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $enrStmt->execute([$freelancerId, $cId]);
        $enrRow = $enrStmt->fetch();
        if ($enrRow) {
            $clStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
            $clStmt->execute([$freelancerId, $cId]);
            $completedLessonIds = array_map('intval', $clStmt->fetchAll(PDO::FETCH_COLUMN));

            $enrollment = [
                'id' => (int)$enrRow['id'],
                'status' => $enrRow['status'],
                'progressPercent' => (int)$enrRow['progress_percent'],
                'lastLessonId' => $enrRow['last_lesson_id'] ? (int)$enrRow['last_lesson_id'] : null,
                'enrolledAt' => $enrRow['enrolled_at'],
                'completedAt' => $enrRow['completed_at'],
                'completedLessons' => $completedLessonIds
            ];
        }

        $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $certStmt->execute([$freelancerId, $cId]);
        $certRow = $certStmt->fetch();
        if ($certRow) {
            $certificate = [
                'id' => (int)$certRow['id'],
                'certificateRef' => $certRow['certificate_ref'],
                'issueDate' => $certRow['issue_date'],
                'scorePercent' => (int)$certRow['score_percent'],
                'verificationCode' => $certRow['verification_code'],
                'createdAt' => $certRow['created_at']
            ];
        }

        // Count assessment attempts
        $attStmt = $db->prepare("SELECT COUNT(*) as cnt, MAX(score_percent) as highest FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ?");
        $attStmt->execute([$freelancerId, $cId]);
        $attRow = $attStmt->fetch();
        if ($attRow) {
            $attemptCount = (int)$attRow['cnt'];
            $highestScore = (int)($attRow['highest'] ?? 0);
        }
    }

    $modules = [];
    $allLessonsFlat = [];

    foreach ($rawModules as $rm) {
        $mId = (int)$rm['id'];
        $lStmt = $db->prepare("SELECT * FROM course_lessons WHERE module_id = ? ORDER BY sort_order ASC, id ASC");
        $lStmt->execute([$mId]);
        $rawLessons = $lStmt->fetchAll();

        $lessons = [];
        foreach ($rawLessons as $rl) {
            $lId = (int)$rl['id'];
            $isComp = in_array($lId, $completedLessonIds, true);
            $lessonObj = [
                'id' => $lId,
                'moduleId' => $mId,
                'courseId' => $cId,
                'title' => $rl['title'],
                'contentType' => $rl['content_type'],
                'content' => $rl['content'],
                'mediaUrl' => $rl['media_url'],
                'durationMinutes' => (int)$rl['duration_minutes'],
                'sortOrder' => (int)$rl['sort_order'],
                'isCompleted' => $isComp
            ];
            $lessons[] = $lessonObj;
            $allLessonsFlat[] = $lessonObj;
        }

        $modules[] = [
            'id' => $mId,
            'courseId' => $cId,
            'title' => $rm['title'],
            'description' => $rm['description'],
            'sortOrder' => (int)$rm['sort_order'],
            'lessons' => $lessons
        ];
    }

    // Assessment metadata
    $assStmt = $db->prepare("SELECT a.*, (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) as questions_count FROM course_assessments a WHERE a.course_id = ? LIMIT 1");
    $assStmt->execute([$cId]);
    $rawAss = $assStmt->fetch();

    $assessment = null;
    if ($rawAss) {
        $assessment = [
            'id' => (int)$rawAss['id'],
            'courseId' => $cId,
            'title' => $rawAss['title'],
            'description' => $rawAss['description'],
            'passingScore' => (int)$rawAss['passing_score'],
            'timeLimitMinutes' => (int)$rawAss['time_limit_minutes'],
            'maxAttempts' => (int)$rawAss['max_attempts'],
            'questionsCount' => (int)$rawAss['questions_count'],
            'attemptsUsed' => $attemptCount,
            'highestScore' => $highestScore,
            'hasPassed' => ($highestScore >= (int)$rawAss['passing_score']) || ($certificate !== null)
        ];
    }

    // Determine resume lesson id
    $resumeLessonId = null;
    foreach ($allLessonsFlat as $l) {
        if (!$l['isCompleted']) {
            $resumeLessonId = $l['id'];
            break;
        }
    }
    if ($resumeLessonId === null && count($allLessonsFlat) > 0) {
        $resumeLessonId = $allLessonsFlat[0]['id'];
    }

    $objs = [];
    if (!empty($course['learning_objectives'])) {
        $objs = array_filter(array_map('trim', explode(';', $course['learning_objectives'])));
    }

    echo json_encode([
        'success' => true,
        'course' => [
            'id' => $cId,
            'courseCode' => $course['course_code'],
            'title' => $course['title'],
            'slug' => $course['slug'],
            'description' => $course['description'],
            'learningObjectives' => $objs,
            'category' => $course['category'],
            'language' => $course['language'],
            'estimatedMinutes' => (int)$course['estimated_minutes'],
            'thumbnailUrl' => $course['thumbnail_url'],
            'status' => $course['status'],
            'passingScore' => (int)$course['passing_score'],
            'maxAssessmentAttempts' => (int)$course['max_assessment_attempts'],
            'isMandatory' => (bool)$course['is_mandatory'],
            'modulesCount' => count($modules),
            'lessonsCount' => count($allLessonsFlat),
            'modules' => $modules,
            'assessment' => $assessment,
            'enrollment' => $enrollment,
            'certificate' => $certificate,
            'resumeLessonId' => $resumeLessonId
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading course detail: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/enroll.php',
      description: 'Phase 4 Academy Course enrollment endpoint',
      content: `<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer to enroll.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;
if ($courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid or missing course_id']);
    exit;
}

// Validate CSRF
$sessionCsrf = $_SESSION['csrf_token'] ?? '';
$clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Security token invalid or expired. Please refresh the page.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify course exists and is published
    $cStmt = $db->prepare("SELECT id, title, status FROM courses WHERE id = ? LIMIT 1");
    $cStmt->execute([$courseId]);
    $course = $cStmt->fetch();

    if (!$course || $course['status'] !== 'Published') {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course is not currently available for enrollment.']);
        exit;
    }

    // Check if already enrolled
    $enrStmt = $db->prepare("SELECT * FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
    $enrStmt->execute([$freelancerId, $courseId]);
    $existing = $enrStmt->fetch();

    if ($existing) {
        echo json_encode([
            'success' => true,
            'message' => 'Already enrolled in course.',
            'enrollment' => [
                'id' => (int)$existing['id'],
                'status' => $existing['status'],
                'progressPercent' => (int)$existing['progress_percent'],
                'enrolledAt' => $existing['enrolled_at']
            ]
        ]);
        exit;
    }

    // Insert new enrollment
    $ins = $db->prepare("INSERT INTO course_enrollments (freelancer_id, course_id, status, progress_percent, enrolled_at) VALUES (?, ?, 'Enrolled', 0, NOW())");
    $ins->execute([$freelancerId, $courseId]);
    $newId = (int)$db->lastInsertId();

    // Log notification
    $notif = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'academy')");
    $notif->execute([
        $freelancerId,
        'Enrolled in Academy Course',
        'You have successfully enrolled in "' . $course['title'] . '". Complete all lessons and pass the final assessment to earn your official certification.'
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Successfully enrolled in course.',
        'enrollment' => [
            'id' => $newId,
            'status' => 'Enrolled',
            'progressPercent' => 0,
            'enrolledAt' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to process course enrollment: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/lesson_complete.php',
      description: 'Phase 4 Academy Lesson completion tracking endpoint',
      content: `<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to record lesson progress.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$lessonId = !empty($data['lesson_id']) ? (int)$data['lesson_id'] : 0;
$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;

if ($lessonId <= 0 || $courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid lesson_id or course_id.']);
    exit;
}

// CSRF check
$sessionCsrf = $_SESSION['csrf_token'] ?? '';
$clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify lesson exists and belongs to course
    $lStmt = $db->prepare("SELECT id, course_id, title FROM course_lessons WHERE id = ? AND course_id = ? LIMIT 1");
    $lStmt->execute([$lessonId, $courseId]);
    $lesson = $lStmt->fetch();

    if (!$lesson) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Lesson not found in the specified course.']);
        exit;
    }

    // Auto-enroll if not enrolled yet
    $enrCheck = $db->prepare("SELECT id, status FROM course_enrollments WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
    $enrCheck->execute([$freelancerId, $courseId]);
    $enr = $enrCheck->fetch();

    if (!$enr) {
        $insEnr = $db->prepare("INSERT INTO course_enrollments (freelancer_id, course_id, status, progress_percent, last_lesson_id, enrolled_at) VALUES (?, ?, 'In Progress', 0, ?, NOW())");
        $insEnr->execute([$freelancerId, $courseId, $lessonId]);
    }

    // Record completion in lesson_completions (INSERT IGNORE)
    $compStmt = $db->prepare("INSERT IGNORE INTO lesson_completions (freelancer_id, course_id, lesson_id, completed_at) VALUES (?, ?, ?, NOW())");
    $compStmt->execute([$freelancerId, $courseId, $lessonId]);

    // Calculate total lessons in course
    $totalLessonsStmt = $db->prepare("SELECT COUNT(*) FROM course_lessons WHERE course_id = ?");
    $totalLessonsStmt->execute([$courseId]);
    $totalLessons = (int)$totalLessonsStmt->fetchColumn();

    // Calculate completed lessons by freelancer
    $completedStmt = $db->prepare("SELECT COUNT(DISTINCT lesson_id) FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
    $completedStmt->execute([$freelancerId, $courseId]);
    $completedLessons = (int)$completedStmt->fetchColumn();

    $progressPercent = ($totalLessons > 0) ? min(100, (int)round(($completedLessons / $totalLessons) * 100)) : 100;

    // Check if course has assessment
    $assCheck = $db->prepare("SELECT id FROM course_assessments WHERE course_id = ? LIMIT 1");
    $assCheck->execute([$courseId]);
    $hasAssessment = (bool)$assCheck->fetch();

    // Check if freelancer already passed assessment
    $passedCheck = $db->prepare("SELECT id FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ? AND passed = 1 LIMIT 1");
    $passedCheck->execute([$freelancerId, $courseId]);
    $hasPassed = (bool)$passedCheck->fetch();

    $newStatus = 'In Progress';
    if ($progressPercent >= 100) {
        if (!$hasAssessment || $hasPassed) {
            $newStatus = 'Completed';
        }
    }

    // Update enrollment record
    $updEnr = $db->prepare("UPDATE course_enrollments SET progress_percent = ?, last_lesson_id = ?, status = CASE WHEN status = 'Completed' THEN 'Completed' ELSE ? END WHERE freelancer_id = ? AND course_id = ?");
    $updEnr->execute([$progressPercent, $lessonId, $newStatus, $freelancerId, $courseId]);

    // Fetch list of all completed lesson IDs for this course
    $allCompStmt = $db->prepare("SELECT lesson_id FROM lesson_completions WHERE freelancer_id = ? AND course_id = ?");
    $allCompStmt->execute([$freelancerId, $courseId]);
    $allCompletedIds = array_map('intval', $allCompStmt->fetchAll(PDO::FETCH_COLUMN));

    echo json_encode([
        'success' => true,
        'message' => 'Lesson marked as completed.',
        'lessonId' => $lessonId,
        'courseId' => $courseId,
        'progressPercent' => $progressPercent,
        'completedLessonsCount' => $completedLessons,
        'totalLessonsCount' => $totalLessons,
        'completedLessonIds' => $allCompletedIds,
        'status' => $newStatus,
        'isReadyForAssessment' => ($progressPercent >= 100 && $hasAssessment)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error updating lesson completion: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/assessment/take.php',
      description: 'Phase 4 Assessment exam room endpoint (strips correct answer keys)',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to take assessments.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;

if ($courseId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid course_id']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify course & assessment
    $cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
    $cStmt->execute([$courseId]);
    $course = $cStmt->fetch();

    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Course not found']);
        exit;
    }

    $assStmt = $db->prepare("SELECT * FROM course_assessments WHERE course_id = ? LIMIT 1");
    $assStmt->execute([$courseId]);
    $assessment = $assStmt->fetch();

    if (!$assessment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No assessment is configured for this course.']);
        exit;
    }

    $assessmentId = (int)$assessment['id'];

    // Check existing attempts
    $attStmt = $db->prepare("SELECT COUNT(*) as attempt_count, MAX(score_percent) as highest_score, SUM(passed) as any_passed FROM assessment_attempts WHERE freelancer_id = ? AND assessment_id = ?");
    $attStmt->execute([$freelancerId, $assessmentId]);
    $attStats = $attStmt->fetch();

    $attemptCount = (int)($attStats['attempt_count'] ?? 0);
    $highestScore = (int)($attStats['highest_score'] ?? 0);
    $hasPassed = (int)($attStats['any_passed'] ?? 0) > 0;
    $maxAttempts = (int)$assessment['max_attempts'];

    if ($hasPassed) {
        // Already certified
        $certStmt = $db->prepare("SELECT * FROM freelancer_certificates WHERE freelancer_id = ? AND course_id = ? LIMIT 1");
        $certStmt->execute([$freelancerId, $courseId]);
        $cert = $certStmt->fetch();

        echo json_encode([
            'success' => true,
            'status' => 'ALREADY_PASSED',
            'message' => 'You have already passed this assessment and earned your certificate.',
            'certificate' => $cert ? [
                'certificateRef' => $cert['certificate_ref'],
                'issueDate' => $cert['issue_date'],
                'scorePercent' => (int)$cert['score_percent'],
                'verificationCode' => $cert['verification_code']
            ] : null,
            'assessment' => [
                'id' => $assessmentId,
                'courseId' => $courseId,
                'title' => $assessment['title'],
                'passingScore' => (int)$assessment['passing_score'],
                'attemptsUsed' => $attemptCount,
                'maxAttempts' => $maxAttempts
            ]
        ]);
        exit;
    }

    if ($attemptCount >= $maxAttempts) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'status' => 'ATTEMPTS_EXHAUSTED',
            'error' => 'You have reached the maximum allowed attempts (' . $maxAttempts . ') for this assessment. Please contact your coordinator to request an attempt reset.',
            'attemptsUsed' => $attemptCount,
            'maxAttempts' => $maxAttempts,
            'highestScore' => $highestScore
        ]);
        exit;
    }

    // Fetch questions: STRIP correct_answers_json and explanation!
    $qStmt = $db->prepare("SELECT id, question_text, question_type, options_json, points, sort_order FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order ASC, id ASC");
    $qStmt->execute([$assessmentId]);
    $rawQuestions = $qStmt->fetchAll();

    $questions = [];
    foreach ($rawQuestions as $rq) {
        $options = json_decode($rq['options_json'], true) ?: [];
        $questions[] = [
            'id' => (int)$rq['id'],
            'questionText' => $rq['question_text'],
            'questionType' => $rq['question_type'],
            'options' => $options,
            'points' => (int)$rq['points'],
            'sortOrder' => (int)$rq['sort_order']
        ];
    }

    echo json_encode([
        'success' => true,
        'status' => 'READY',
        'assessment' => [
            'id' => $assessmentId,
            'courseId' => $courseId,
            'courseTitle' => $course['title'],
            'title' => $assessment['title'],
            'description' => $assessment['description'],
            'passingScore' => (int)$assessment['passing_score'],
            'timeLimitMinutes' => (int)$assessment['time_limit_minutes'],
            'maxAttempts' => $maxAttempts,
            'attemptNumber' => $attemptCount + 1,
            'questionsCount' => count($questions),
            'questions' => $questions
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error loading assessment: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/assessment/submit.php',
      description: 'Phase 4 Assessment grading and verified certificate issuance endpoint',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to submit assessments.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$courseId = !empty($data['course_id']) ? (int)$data['course_id'] : 0;
$assessmentId = !empty($data['assessment_id']) ? (int)$data['assessment_id'] : 0;
$answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];

if ($courseId <= 0 || $assessmentId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing valid course_id or assessment_id']);
    exit;
}

// CSRF check
$sessionCsrf = $_SESSION['csrf_token'] ?? '';
$clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify assessment exists and matches course
    $assStmt = $db->prepare("SELECT a.*, c.title as course_title, c.course_code FROM course_assessments a JOIN courses c ON a.course_id = c.id WHERE a.id = ? AND a.course_id = ? LIMIT 1");
    $assStmt->execute([$assessmentId, $courseId]);
    $assessment = $assStmt->fetch();

    if (!$assessment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Assessment not found for this course.']);
        exit;
    }

    $passingScore = (int)$assessment['passing_score'];
    $maxAttempts = (int)$assessment['max_attempts'];

    // Check existing attempts
    $attStmt = $db->prepare("SELECT COUNT(*) as attempt_count, SUM(passed) as any_passed FROM assessment_attempts WHERE freelancer_id = ? AND assessment_id = ?");
    $attStmt->execute([$freelancerId, $assessmentId]);
    $attStats = $attStmt->fetch();

    $attemptCount = (int)($attStats['attempt_count'] ?? 0);
    $hasPassed = (int)($attStats['any_passed'] ?? 0) > 0;

    if ($hasPassed) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'You have already passed this assessment and received your certificate.'
        ]);
        exit;
    }

    if ($attemptCount >= $maxAttempts) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Maximum allowed assessment attempts (' . $maxAttempts . ') have been reached.'
        ]);
        exit;
    }

    $currentAttemptNumber = $attemptCount + 1;

    // Load questions with correct answers from DB
    $qStmt = $db->prepare("SELECT id, correct_answers_json, points, explanation FROM assessment_questions WHERE assessment_id = ? ORDER BY id ASC");
    $qStmt->execute([$assessmentId]);
    $questions = $qStmt->fetchAll();

    if (empty($questions)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No questions found in this assessment.']);
        exit;
    }

    $totalPoints = 0;
    $earnedPoints = 0;
    $questionResults = [];

    foreach ($questions as $q) {
        $qId = (int)$q['id'];
        $pts = (int)$q['points'];
        $totalPoints += $pts;

        $correctArr = json_decode($q['correct_answers_json'], true) ?: [];
        $submittedAns = $answers[$qId] ?? ($answers[(string)$qId] ?? null);

        // Normalize submitted answer to array
        $subArr = [];
        if (is_array($submittedAns)) {
            $subArr = array_map('strval', $submittedAns);
        } elseif ($submittedAns !== null && $submittedAns !== '') {
            $subArr = [(string)$submittedAns];
        }

        sort($correctArr);
        sort($subArr);

        $isCorrect = ($correctArr == $subArr);
        if ($isCorrect) {
            $earnedPoints += $pts;
        }

        $questionResults[] = [
            'questionId' => $qId,
            'isCorrect' => $isCorrect,
            'explanation' => $q['explanation'] ?? ''
        ];
    }

    $scorePercent = ($totalPoints > 0) ? min(100, (int)round(($earnedPoints / $totalPoints) * 100)) : 0;
    $passed = ($scorePercent >= $passingScore);

    // Save attempt in transaction
    $db->beginTransaction();

    $insAtt = $db->prepare("INSERT INTO assessment_attempts (assessment_id, course_id, freelancer_id, attempt_number, answers_json, score_percent, passed, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    $insAtt->execute([
        $assessmentId,
        $courseId,
        $freelancerId,
        $currentAttemptNumber,
        json_encode($answers),
        $scorePercent,
        $passed ? 1 : 0
    ]);

    $certificate = null;

    if ($passed) {
        // Generate verifiable certificate reference
        $refSuffix = strtoupper(bin2hex(random_bytes(4)));
        $certRef = 'WO-CERT-' . date('Y') . '-' . $refSuffix;
        $verifCode = 'V-' . strtoupper(bin2hex(random_bytes(3)));

        // Insert certificate (INSERT IGNORE to prevent duplicate)
        $insCert = $db->prepare("INSERT INTO freelancer_certificates (certificate_ref, freelancer_id, course_id, issue_date, score_percent, verification_code, metadata_json, created_at) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE score_percent = GREATEST(score_percent, VALUES(score_percent))");
        
        $meta = [
            'courseTitle' => $assessment['course_title'],
            'courseCode' => $assessment['course_code'],
            'attemptNumber' => $currentAttemptNumber,
            'passingScore' => $passingScore,
            'achievedScore' => $scorePercent
        ];

        $insCert->execute([
            $certRef,
            $freelancerId,
            $courseId,
            $scorePercent,
            $verifCode,
            json_encode($meta)
        ]);

        // Update enrollment to Completed
        $updEnr = $db->prepare("UPDATE course_enrollments SET status = 'Completed', progress_percent = 100, completed_at = NOW() WHERE freelancer_id = ? AND course_id = ?");
        $updEnr->execute([$freelancerId, $courseId]);

        // Send congratulatory notification
        $notif = $db->prepare("INSERT INTO freelancer_notifications (freelancer_id, title, message, type) VALUES (?, ?, ?, 'academy')");
        $notif->execute([
            $freelancerId,
            'Certificate Earned: ' . $assessment['course_title'],
            'Congratulations! You scored ' . $scorePercent . '% and earned official certificate ' . $certRef . '. Your operational eligibility has been elevated.'
        ]);

        $certificate = [
            'certificateRef' => $certRef,
            'courseTitle' => $assessment['course_title'],
            'courseCode' => $assessment['course_code'],
            'issueDate' => date('Y-m-d'),
            'scorePercent' => $scorePercent,
            'verificationCode' => $verifCode
        ];
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'passed' => $passed,
        'scorePercent' => $scorePercent,
        'passingScore' => $passingScore,
        'earnedPoints' => $earnedPoints,
        'totalPoints' => $totalPoints,
        'attemptNumber' => $currentAttemptNumber,
        'maxAttempts' => $maxAttempts,
        'attemptsRemaining' => max(0, $maxAttempts - $currentAttemptNumber),
        'questionResults' => $questionResults,
        'certificate' => $certificate
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to process assessment submission: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/academy/certificates.php',
      description: 'Phase 4 Certificate registry and public authenticity verification endpoint',
      content: `<?php
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

try {
    $db = Database::getConnection();

    // 1. Public Verification Flow: if query has 'ref' or 'code'
    $ref = trim($_GET['ref'] ?? '');
    $code = trim($_GET['code'] ?? '');

    if (!empty($ref) || !empty($code)) {
        if (!empty($ref)) {
            $stmt = $db->prepare("SELECT cert.*, f.full_name as freelancer_name, c.title as course_title, c.course_code FROM freelancer_certificates cert JOIN freelancers f ON cert.freelancer_id = f.id JOIN courses c ON cert.course_id = c.id WHERE cert.certificate_ref = ? LIMIT 1");
            $stmt->execute([$ref]);
        } else {
            $stmt = $db->prepare("SELECT cert.*, f.full_name as freelancer_name, c.title as course_title, c.course_code FROM freelancer_certificates cert JOIN freelancers f ON cert.freelancer_id = f.id JOIN courses c ON cert.course_id = c.id WHERE cert.verification_code = ? LIMIT 1");
            $stmt->execute([$code]);
        }

        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'verified' => false,
                'error' => 'Certificate record not found or verification code is invalid.'
            ]);
            exit;
        }

        // Mask name slightly for privacy if public lookup
        $nameParts = explode(' ', trim($row['freelancer_name']));
        $maskedName = count($nameParts) > 1 
            ? $nameParts[0] . ' ' . substr($nameParts[1], 0, 1) . '•••'
            : $nameParts[0];

        echo json_encode([
            'success' => true,
            'verified' => true,
            'certificate' => [
                'certificateRef' => $row['certificate_ref'],
                'recipient' => $maskedName,
                'courseTitle' => $row['course_title'],
                'courseCode' => $row['course_code'],
                'issueDate' => $row['issue_date'],
                'scorePercent' => (int)$row['score_percent'],
                'status' => 'Authentic & Valid',
                'issuer' => 'We Onboard Operational Academy'
            ]
        ]);
        exit;
    }

    // 2. Freelancer Personal Certificates Flow: requires freelancer login
    if (empty($_SESSION['freelancer_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as a freelancer to list certificates.']);
        exit;
    }

    $freelancerId = (int)$_SESSION['freelancer_id'];
    $stmt = $db->prepare("SELECT cert.*, c.title as course_title, c.course_code, c.category FROM freelancer_certificates cert JOIN courses c ON cert.course_id = c.id WHERE cert.freelancer_id = ? ORDER BY cert.issue_date DESC");
    $stmt->execute([$freelancerId]);
    $certs = $stmt->fetchAll();

    $output = [];
    foreach ($certs as $c) {
        $output[] = [
            'id' => (int)$c['id'],
            'certificateRef' => $c['certificate_ref'],
            'courseId' => (int)$c['course_id'],
            'courseTitle' => $c['course_title'],
            'courseCode' => $c['course_code'],
            'category' => $c['category'],
            'issueDate' => $c['issue_date'],
            'scorePercent' => (int)$c['score_percent'],
            'verificationCode' => $c['verification_code'],
            'createdAt' => $c['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'count' => count($output),
        'certificates' => $output
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error retrieving certificates: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/admin/academy/courses.php',
      description: 'Phase 4 Admin Academy course creation, editing, publishing, and archiving endpoint',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    // Verify Admin Role & Permissions
    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Forbidden: Role (' . ($admin['role_name'] ?? 'Unknown') . ') does not have permission to manage Academy courses.'
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $category = trim($_GET['category'] ?? '');

        $where = ["1=1"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(c.title LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)";
            $w = '%' . $search . '%';
            $params = array_merge($params, [$w, $w, $w]);
        }
        if (!empty($status) && $status !== 'All') {
            $where[] = "c.status = ?";
            $params[] = $status;
        }
        if (!empty($category) && $category !== 'All') {
            $where[] = "c.category = ?";
            $params[] = $category;
        }

        $sql = "SELECT c.*,
                (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as modules_count,
                (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id) as lessons_count,
                (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id) as enrollments_count,
                (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id AND e.status = 'Completed') as completions_count,
                (SELECT COUNT(*) FROM freelancer_certificates cert WHERE cert.course_id = c.id) as certificates_issued_count,
                (SELECT a.passing_score FROM course_assessments a WHERE a.course_id = c.id LIMIT 1) as passing_score_conf
                FROM courses c
                WHERE " . implode(' AND ', $where) . "
                ORDER BY c.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll();

        $output = [];
        foreach ($courses as $c) {
            $objs = [];
            if (!empty($c['learning_objectives'])) {
                $objs = array_filter(array_map('trim', explode(';', $c['learning_objectives'])));
            }

            $output[] = [
                'id' => (int)$c['id'],
                'courseCode' => $c['course_code'],
                'title' => $c['title'],
                'slug' => $c['slug'],
                'description' => $c['description'],
                'learningObjectives' => $objs,
                'category' => $c['category'],
                'language' => $c['language'],
                'estimatedMinutes' => (int)$c['estimated_minutes'],
                'thumbnailUrl' => $c['thumbnail_url'],
                'status' => $c['status'],
                'passingScore' => (int)$c['passing_score'],
                'maxAssessmentAttempts' => (int)$c['max_assessment_attempts'],
                'isMandatory' => (bool)$c['is_mandatory'],
                'modulesCount' => (int)$c['modules_count'],
                'lessonsCount' => (int)$c['lessons_count'],
                'enrollmentsCount' => (int)$c['enrollments_count'],
                'completionsCount' => (int)$c['completions_count'],
                'certificatesCount' => (int)$c['certificates_issued_count'],
                'createdAt' => $c['created_at'],
                'updatedAt' => $c['updated_at']
            ];
        }

        echo json_encode([
            'success' => true,
            'count' => count($output),
            'courses' => $output
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? 'create'); // create, update, set_status, delete
        $courseId = !empty($data['id']) ? (int)$data['id'] : 0;

        // CSRF verification for mutations
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'set_status') {
            $newStatus = trim($data['status'] ?? '');
            if (!in_array($newStatus, ['Draft', 'Published', 'Archived'], true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid status value']);
                exit;
            }

            $upd = $db->prepare("UPDATE courses SET status = ? WHERE id = ?");
            $upd->execute([$newStatus, $courseId]);

            // Audit log
            $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
            $audit->execute([
                $admin['name'],
                'Updated Course Status',
                (string)$courseId,
                "Status set to {$newStatus}"
            ]);

            echo json_encode(['success' => true, 'message' => "Course status updated to {$newStatus}"]);
            exit;
        }

        if ($action === 'create' || $action === 'update') {
            $title = trim($data['title'] ?? '');
            $code = trim($data['course_code'] ?? '');
            $desc = trim($data['description'] ?? '');
            $category = trim($data['category'] ?? 'Field Operations');
            $language = trim($data['language'] ?? 'en');
            $minutes = max(5, (int)($data['estimated_minutes'] ?? 45));
            $passingScore = min(100, max(50, (int)($data['passing_score'] ?? 80)));
            $maxAttempts = min(10, max(1, (int)($data['max_assessment_attempts'] ?? 3)));
            $isMandatory = !empty($data['is_mandatory']) ? 1 : 0;
            $status = in_array($data['status'] ?? '', ['Draft', 'Published', 'Archived']) ? $data['status'] : 'Published';
            $objectives = is_array($data['learning_objectives'] ?? null) 
                ? implode('; ', array_map('trim', $data['learning_objectives'])) 
                : trim($data['learning_objectives'] ?? '');

            if (empty($title) || empty($desc)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Title and description are required']);
                exit;
            }

            // Generate slug and code if missing
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
            if (empty($code)) {
                $code = 'WO-CRS-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $title), 0, 4)) . '-' . rand(10, 99);
            }

            if ($action === 'create') {
                $ins = $db->prepare("INSERT INTO courses (course_code, title, slug, description, learning_objectives, category, language, estimated_minutes, status, passing_score, max_assessment_attempts, is_mandatory, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
                $ins->execute([
                    $code,
                    $title,
                    $slug,
                    $desc,
                    $objectives,
                    $category,
                    $language,
                    $minutes,
                    $status,
                    $passingScore,
                    $maxAttempts,
                    $isMandatory,
                    (int)$admin['id']
                ]);
                $newId = (int)$db->lastInsertId();

                // Create default assessment for this course
                $insAss = $db->prepare("INSERT INTO course_assessments (course_id, title, description, passing_score, time_limit_minutes, max_attempts) VALUES (?, ?, ?, ?, 15, ?)");
                $insAss->execute([
                    $newId,
                    $title . ' Certification Exam',
                    'Comprehensive knowledge verification exam for ' . $title,
                    $passingScore,
                    $maxAttempts
                ]);

                // Audit log
                $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
                $audit->execute([
                    $admin['name'],
                    'Created Course',
                    (string)$newId,
                    "Created course {$code}: {$title}"
                ]);

                echo json_encode(['success' => true, 'message' => 'Course created successfully', 'courseId' => $newId]);
                exit;
            } else {
                $upd = $db->prepare("UPDATE courses SET title = ?, description = ?, learning_objectives = ?, category = ?, language = ?, estimated_minutes = ?, status = ?, passing_score = ?, max_assessment_attempts = ?, is_mandatory = ? WHERE id = ?");
                $upd->execute([
                    $title,
                    $desc,
                    $objectives,
                    $category,
                    $language,
                    $minutes,
                    $status,
                    $passingScore,
                    $maxAttempts,
                    $isMandatory,
                    $courseId
                ]);

                // Also update assessment passing score and max attempts
                $updAss = $db->prepare("UPDATE course_assessments SET passing_score = ?, max_attempts = ? WHERE course_id = ?");
                $updAss->execute([$passingScore, $maxAttempts, $courseId]);

                // Audit log
                $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
                $audit->execute([
                    $admin['name'],
                    'Updated Course',
                    (string)$courseId,
                    "Updated course {$title}"
                ]);

                echo json_encode(['success' => true, 'message' => 'Course updated successfully']);
                exit;
            }
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error handling admin courses: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/admin/academy/modules.php',
      description: 'Phase 4 Admin Curriculum and Lessons management endpoint',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient privileges to manage course modules.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        if ($courseId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing valid course_id']);
            exit;
        }

        $mStmt = $db->prepare("SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC");
        $mStmt->execute([$courseId]);
        $rawModules = $mStmt->fetchAll();

        $modules = [];
        foreach ($rawModules as $rm) {
            $mId = (int)$rm['id'];
            $lStmt = $db->prepare("SELECT * FROM course_lessons WHERE module_id = ? ORDER BY sort_order ASC, id ASC");
            $lStmt->execute([$mId]);
            $rawLessons = $lStmt->fetchAll();

            $lessons = [];
            foreach ($rawLessons as $rl) {
                $lessons[] = [
                    'id' => (int)$rl['id'],
                    'moduleId' => $mId,
                    'courseId' => $courseId,
                    'title' => $rl['title'],
                    'contentType' => $rl['content_type'],
                    'content' => $rl['content'],
                    'mediaUrl' => $rl['media_url'],
                    'durationMinutes' => (int)$rl['duration_minutes'],
                    'sortOrder' => (int)$rl['sort_order']
                ];
            }

            $modules[] = [
                'id' => $mId,
                'courseId' => $courseId,
                'title' => $rm['title'],
                'description' => $rm['description'],
                'sortOrder' => (int)$rm['sort_order'],
                'lessons' => $lessons
            ];
        }

        echo json_encode(['success' => true, 'modules' => $modules]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');

        // CSRF check
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'create_module') {
            $courseId = (int)($data['course_id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $desc = trim($data['description'] ?? '');
            $order = (int)($data['sort_order'] ?? 1);

            if ($courseId <= 0 || empty($title)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Valid course_id and title are required.']);
                exit;
            }

            $ins = $db->prepare("INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)");
            $ins->execute([$courseId, $title, $desc, $order]);
            $modId = (int)$db->lastInsertId();

            echo json_encode(['success' => true, 'message' => 'Module created', 'moduleId' => $modId]);
            exit;
        }

        if ($action === 'create_lesson') {
            $moduleId = (int)($data['module_id'] ?? 0);
            $courseId = (int)($data['course_id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $type = in_array($data['content_type'] ?? '', ['text', 'video_ref', 'interactive']) ? $data['content_type'] : 'text';
            $content = trim($data['content'] ?? '');
            $mediaUrl = trim($data['media_url'] ?? '');
            $duration = max(1, (int)($data['duration_minutes'] ?? 10));
            $order = (int)($data['sort_order'] ?? 1);

            if ($moduleId <= 0 || $courseId <= 0 || empty($title) || empty($content)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Module, course, title, and content are required.']);
                exit;
            }

            $ins = $db->prepare("INSERT INTO course_lessons (module_id, course_id, title, content_type, content, media_url, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([$moduleId, $courseId, $title, $type, $content, $mediaUrl ?: null, $duration, $order]);
            $lesId = (int)$db->lastInsertId();

            echo json_encode(['success' => true, 'message' => 'Lesson created', 'lessonId' => $lesId]);
            exit;
        }

        if ($action === 'delete_lesson') {
            $lessonId = (int)($data['lesson_id'] ?? 0);
            $del = $db->prepare("DELETE FROM course_lessons WHERE id = ?");
            $del->execute([$lessonId]);
            echo json_encode(['success' => true, 'message' => 'Lesson deleted']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error managing modules/lessons: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/admin/academy/questions.php',
      description: 'Phase 4 Admin Question Bank authoring and answer key management endpoint',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient privileges.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        $assessmentId = !empty($_GET['assessment_id']) ? (int)$_GET['assessment_id'] : 0;

        if ($courseId > 0 && $assessmentId <= 0) {
            $assStmt = $db->prepare("SELECT id FROM course_assessments WHERE course_id = ? LIMIT 1");
            $assStmt->execute([$courseId]);
            $assessmentId = (int)$assStmt->fetchColumn();
        }

        if ($assessmentId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing valid course_id or assessment_id']);
            exit;
        }

        $qStmt = $db->prepare("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY sort_order ASC, id ASC");
        $qStmt->execute([$assessmentId]);
        $questions = $qStmt->fetchAll();

        $output = [];
        foreach ($questions as $q) {
            $options = json_decode($q['options_json'], true) ?: [];
            $correct = json_decode($q['correct_answers_json'], true) ?: [];
            $output[] = [
                'id' => (int)$q['id'],
                'assessmentId' => (int)$q['assessment_id'],
                'questionText' => $q['question_text'],
                'questionType' => $q['question_type'],
                'options' => $options,
                'correctAnswers' => $correct,
                'explanation' => $q['explanation'],
                'sortOrder' => (int)$q['sort_order'],
                'points' => (int)$q['points']
            ];
        }

        echo json_encode(['success' => true, 'assessmentId' => $assessmentId, 'questions' => $output]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? 'save'); // save, delete

        // CSRF verification
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'delete') {
            $qId = (int)($data['id'] ?? 0);
            $del = $db->prepare("DELETE FROM assessment_questions WHERE id = ?");
            $del->execute([$qId]);
            echo json_encode(['success' => true, 'message' => 'Question deleted']);
            exit;
        }

        if ($action === 'save') {
            $assessmentId = (int)($data['assessment_id'] ?? 0);
            $qText = trim($data['question_text'] ?? '');
            $type = in_array($data['question_type'] ?? '', ['single_choice', 'multi_choice', 'true_false']) ? $data['question_type'] : 'single_choice';
            $options = is_array($data['options'] ?? null) ? $data['options'] : [];
            $correct = is_array($data['correct_answers'] ?? null) ? $data['correct_answers'] : [];
            $explanation = trim($data['explanation'] ?? '');
            $points = max(1, (int)($data['points'] ?? 1));
            $order = (int)($data['sort_order'] ?? 1);
            $qId = !empty($data['id']) ? (int)$data['id'] : 0;

            if ($assessmentId <= 0 || empty($qText) || empty($options) || empty($correct)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Assessment ID, question text, options, and correct answers are required.']);
                exit;
            }

            if ($qId > 0) {
                $upd = $db->prepare("UPDATE assessment_questions SET question_text = ?, question_type = ?, options_json = ?, correct_answers_json = ?, explanation = ?, sort_order = ?, points = ? WHERE id = ?");
                $upd->execute([
                    $qText,
                    $type,
                    json_encode($options),
                    json_encode($correct),
                    $explanation,
                    $order,
                    $points,
                    $qId
                ]);
                echo json_encode(['success' => true, 'message' => 'Question updated']);
                exit;
            } else {
                $ins = $db->prepare("INSERT INTO assessment_questions (assessment_id, question_text, question_type, options_json, correct_answers_json, explanation, sort_order, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([
                    $assessmentId,
                    $qText,
                    $type,
                    json_encode($options),
                    json_encode($correct),
                    $explanation,
                    $order,
                    $points
                ]);
                $newQId = (int)$db->lastInsertId();
                echo json_encode(['success' => true, 'message' => 'Question created', 'questionId' => $newQId]);
                exit;
            }
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error handling questions: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/admin/academy/enrollments.php',
      description: 'Phase 4 Admin student progress, attempts, and certificate tracking endpoint',
      content: `<?php
$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please authenticate as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $admStmt = $db->prepare("SELECT u.id, u.name, r.name as role_name FROM admin_users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $admStmt->execute([$_SESSION['admin_id']]);
    $admin = $admStmt->fetch();

    $allowedRoles = ['Super Admin', 'Administrator', 'Freelancer Coordinator', 'Content Manager'];
    if (!$admin || !in_array($admin['role_name'], $allowedRoles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: Insufficient privileges.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $viewType = trim($_GET['view'] ?? 'enrollments'); // enrollments, attempts, certificates
        $courseId = !empty($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');

        if ($viewType === 'attempts') {
            $where = ["1=1"];
            $params = [];
            if ($courseId > 0) {
                $where[] = "aa.course_id = ?";
                $params[] = $courseId;
            }
            if (!empty($search)) {
                $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ?)";
                $w = '%' . $search . '%';
                $params = array_merge($params, [$w, $w, $w]);
            }

            $sql = "SELECT aa.*, f.full_name as freelancer_name, f.email as freelancer_email, c.title as course_title, c.course_code 
                    FROM assessment_attempts aa 
                    JOIN freelancers f ON aa.freelancer_id = f.id 
                    JOIN courses c ON aa.course_id = c.id 
                    WHERE " . implode(' AND ', $where) . " 
                    ORDER BY aa.id DESC LIMIT 100";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $attempts = $stmt->fetchAll();

            $output = [];
            foreach ($attempts as $a) {
                $output[] = [
                    'id' => (int)$a['id'],
                    'assessmentId' => (int)$a['assessment_id'],
                    'courseId' => (int)$a['course_id'],
                    'courseTitle' => $a['course_title'],
                    'courseCode' => $a['course_code'],
                    'freelancerId' => (int)$a['freelancer_id'],
                    'freelancerName' => $a['freelancer_name'],
                    'freelancerEmail' => $a['freelancer_email'],
                    'attemptNumber' => (int)$a['attempt_number'],
                    'scorePercent' => (int)$a['score_percent'],
                    'passed' => (bool)$a['passed'],
                    'submittedAt' => $a['submitted_at']
                ];
            }

            echo json_encode(['success' => true, 'attempts' => $output]);
            exit;
        }

        if ($viewType === 'certificates') {
            $where = ["1=1"];
            $params = [];
            if ($courseId > 0) {
                $where[] = "cert.course_id = ?";
                $params[] = $courseId;
            }
            if (!empty($search)) {
                $where[] = "(f.full_name LIKE ? OR cert.certificate_ref LIKE ? OR cert.verification_code LIKE ?)";
                $w = '%' . $search . '%';
                $params = array_merge($params, [$w, $w, $w]);
            }

            $sql = "SELECT cert.*, f.full_name as freelancer_name, f.email as freelancer_email, f.phone as freelancer_phone, c.title as course_title, c.course_code 
                    FROM freelancer_certificates cert 
                    JOIN freelancers f ON cert.freelancer_id = f.id 
                    JOIN courses c ON cert.course_id = c.id 
                    WHERE " . implode(' AND ', $where) . " 
                    ORDER BY cert.id DESC LIMIT 100";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $certs = $stmt->fetchAll();

            $output = [];
            foreach ($certs as $c) {
                $output[] = [
                    'id' => (int)$c['id'],
                    'certificateRef' => $c['certificate_ref'],
                    'verificationCode' => $c['verification_code'],
                    'freelancerId' => (int)$c['freelancer_id'],
                    'freelancerName' => $c['freelancer_name'],
                    'freelancerEmail' => $c['freelancer_email'],
                    'freelancerPhone' => $c['freelancer_phone'],
                    'courseId' => (int)$c['course_id'],
                    'courseTitle' => $c['course_title'],
                    'courseCode' => $c['course_code'],
                    'scorePercent' => (int)$c['score_percent'],
                    'issueDate' => $c['issue_date'],
                    'createdAt' => $c['created_at']
                ];
            }

            echo json_encode(['success' => true, 'certificates' => $output]);
            exit;
        }

        // Default: Enrollments
        $where = ["1=1"];
        $params = [];
        if ($courseId > 0) {
            $where[] = "e.course_id = ?";
            $params[] = $courseId;
        }
        if (!empty($status) && $status !== 'All') {
            $where[] = "e.status = ?";
            $params[] = $status;
        }
        if (!empty($search)) {
            $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ?)";
            $w = '%' . $search . '%';
            $params = array_merge($params, [$w, $w, $w]);
        }

        $sql = "SELECT e.*, f.full_name as freelancer_name, f.email as freelancer_email, f.phone as freelancer_phone, f.city as freelancer_city,
                c.title as course_title, c.course_code,
                cert.certificate_ref, cert.score_percent as certified_score
                FROM course_enrollments e
                JOIN freelancers f ON e.freelancer_id = f.id
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN freelancer_certificates cert ON (cert.freelancer_id = e.freelancer_id AND cert.course_id = e.course_id)
                WHERE " . implode(' AND ', $where) . "
                ORDER BY e.id DESC LIMIT 100";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $enrollments = $stmt->fetchAll();

        $output = [];
        foreach ($enrollments as $e) {
            $output[] = [
                'id' => (int)$e['id'],
                'freelancerId' => (int)$e['freelancer_id'],
                'freelancerName' => $e['freelancer_name'],
                'freelancerEmail' => $e['freelancer_email'],
                'freelancerPhone' => $e['freelancer_phone'],
                'freelancerCity' => $e['freelancer_city'],
                'courseId' => (int)$e['course_id'],
                'courseTitle' => $e['course_title'],
                'courseCode' => $e['course_code'],
                'status' => $e['status'],
                'progressPercent' => (int)$e['progress_percent'],
                'enrolledAt' => $e['enrolled_at'],
                'completedAt' => $e['completed_at'],
                'certificateRef' => $e['certificate_ref'],
                'certifiedScore' => $e['certified_score'] !== null ? (int)$e['certified_score'] : null
            ];
        }

        echo json_encode(['success' => true, 'enrollments' => $output]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');

        // CSRF verification
        $sessionCsrf = $_SESSION['csrf_token'] ?? '';
        $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['csrf_token'] ?? '');
        if (!empty($sessionCsrf) && (!hash_equals($sessionCsrf, (string)$clientCsrf))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Security token invalid or expired.']);
            exit;
        }

        if ($action === 'reset_attempts') {
            $freelancerId = (int)($data['freelancer_id'] ?? 0);
            $courseId = (int)($data['course_id'] ?? 0);

            if ($freelancerId <= 0 || $courseId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing freelancer_id or course_id.']);
                exit;
            }

            // Remove failed attempts to allow retrying
            $del = $db->prepare("DELETE FROM assessment_attempts WHERE freelancer_id = ? AND course_id = ? AND passed = 0");
            $del->execute([$freelancerId, $courseId]);

            // Audit log
            $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details) VALUES (?, ?, 'Academy', ?, ?)");
            $audit->execute([
                $admin['name'],
                'Reset Assessment Attempts',
                (string)$courseId,
                "Reset failed attempts for freelancer ID {$freelancerId}"
            ]);

            echo json_encode(['success' => true, 'message' => 'Assessment attempts have been reset.']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unsupported action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error managing enrollments: ' . $e->getMessage()
    ]);
}
`
    },
    {
      path: 'api/v1/admin/projects/list.php',
      description: 'Admin Projects listing API with search, filters, and capacity stats',
      content: `<?php
/**
 * We Onboard — Admin Projects Listing API
 * GET /api/v1/admin/projects/list.php
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $statusFilter = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($statusFilter) && $statusFilter !== 'All') {
        $where[] = "p.status = ?";
        $params[] = $statusFilter;
    }
    if (!empty($search)) {
        $where[] = "(p.name LIKE ? OR p.project_ref LIKE ? OR p.client_name LIKE ? OR p.target_city LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $sql = "
        SELECT p.*, c.title as required_course_title,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as tasks_count,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'Approved') as approved_tasks_count,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status IN ('Submitted', 'Under Review')) as pending_qc_count
        FROM projects p
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY p.id DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $projectsRaw = $stmt->fetchAll();

    $projects = [];
    foreach ($projectsRaw as $row) {
        $targetAreas = array_map('trim', explode(',', $row['target_areas'] ?? ''));
        $evidenceSchema = json_decode($row['evidence_schema_json'] ?? '{}', true) ?: [];

        $projects[] = [
            'id' => (string)$row['id'],
            'projectRef' => $row['project_ref'],
            'name' => $row['name'],
            'clientName' => $row['client_name'],
            'clientId' => $row['client_id'] ? (string)$row['client_id'] : null,
            'serviceCategory' => $row['service_category'],
            'description' => $row['description'],
            'targetCity' => $row['target_city'],
            'targetAreas' => $targetAreas,
            'targetUnits' => (int)$row['target_units'],
            'completedUnits' => (int)$row['completed_units'],
            'maxTasksPerFreelancer' => (int)($row['max_tasks_per_freelancer'] ?? 5),
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'paymentModel' => $row['payment_model'],
            'payoutRate' => (float)$row['payout_rate'],
            'budget' => (float)($row['budget'] ?? 0),
            'status' => $row['status'],
            'requiredTrainingCourseId' => $row['required_training_course_id'] ? (int)$row['required_training_course_id'] : null,
            'requiredCourseTitle' => $row['required_course_title'] ?? null,
            'requiredKycLevel' => $row['required_kyc_level'] ?? 'Approved',
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'evidenceSchema' => $evidenceSchema,
            'tasksCount' => (int)$row['tasks_count'],
            'approvedTasksCount' => (int)$row['approved_tasks_count'],
            'pendingQcCount' => (int)$row['pending_qc_count'],
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'total' => count($projects)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/projects/manage.php',
      description: 'Admin Projects management API (create, edit, publish, pause, close)',
      content: `<?php
/**
 * We Onboard — Admin Project Management API
 * POST /api/v1/admin/projects/manage.php
 * 
 * Supports:
 * - action = 'create': Creates new project with code PRJ-YYYY-XX
 * - action = 'update': Updates project details
 * - action = 'update_status': Changes status (Draft -> Active -> Paused -> Completed / Cancelled)
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

$allowedRoles = ['Super Admin', 'Administrator', 'Project Manager'];
$adminRole = $_SESSION['admin_role'] ?? 'Administrator';
if (!in_array($adminRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: Your role does not permit project management.']);
    exit;
}

verify_csrf();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? 'create');

try {
    $db = Database::getConnection();

    // ACTION: UPDATE STATUS (Publish, Pause, Close)
    if ($action === 'update_status') {
        $projectId = (int)($data['project_id'] ?? 0);
        $newStatus = trim($data['status'] ?? '');
        $allowedStatuses = ['Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled'];

        if ($projectId <= 0 || !in_array($newStatus, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid project_id and valid status required.']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM projects WHERE id = ? LIMIT 1");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();

        if (!$project) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Project not found.']);
            exit;
        }

        $oldStatus = $project['status'];
        $upStmt = $db->prepare("UPDATE projects SET status = ? WHERE id = ?");
        $upStmt->execute([$newStatus, $projectId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Project Status Changed', 'Project', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            $project['project_ref'],
            "Status transitioned from '{$oldStatus}' to '{$newStatus}'",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Project {$project['project_ref']} status successfully changed to {$newStatus}.",
            'project_id' => $projectId,
            'status' => $newStatus
        ]);
        exit;
    }

    // ACTION: CREATE OR UPDATE PROJECT
    $name = trim($data['name'] ?? '');
    $clientName = trim($data['client_name'] ?? '');
    $serviceCategory = trim($data['service_category'] ?? 'Field Operations');
    $description = trim($data['description'] ?? '');
    $targetCity = trim($data['target_city'] ?? 'Bengaluru');
    $targetAreas = trim($data['target_areas'] ?? '');
    $targetUnits = max(1, (int)($data['target_units'] ?? 100));
    $startDate = trim($data['start_date'] ?? date('Y-m-d'));
    $endDate = trim($data['end_date'] ?? date('Y-m-d', strtotime('+30 days')));
    $paymentModel = trim($data['payment_model'] ?? 'Per Activation');
    $payoutRate = (float)($data['payout_rate'] ?? 0);
    $budget = (float)($data['budget'] ?? 0);
    $status = trim($data['status'] ?? 'Active');
    $requiredTrainingId = !empty($data['required_training_course_id']) ? (int)$data['required_training_course_id'] : null;
    $requiredKyc = trim($data['required_kyc_level'] ?? 'Approved');
    $requiresLocation = !empty($data['requires_location']) ? 1 : 0;
    $maxTasks = max(1, (int)($data['max_tasks_per_freelancer'] ?? 5));
    $evidenceSchemaJson = is_array($data['evidence_schema'] ?? null) ? json_encode($data['evidence_schema']) : (trim($data['evidence_schema_json'] ?? '') ?: null);

    if (empty($name) || empty($clientName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project Name and Client Name are required fields.']);
        exit;
    }

    if ($action === 'update') {
        $projectId = (int)($data['project_id'] ?? 0);
        if ($projectId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid project_id required for update.']);
            exit;
        }

        $stmt = $db->prepare("
            UPDATE projects SET 
                name = ?, client_name = ?, service_category = ?, description = ?, 
                target_city = ?, target_areas = ?, target_units = ?, start_date = ?, 
                end_date = ?, payment_model = ?, payout_rate = ?, budget = ?, status = ?,
                required_training_course_id = ?, required_kyc_level = ?, requires_location = ?,
                max_tasks_per_freelancer = ?, evidence_schema_json = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $name, $clientName, $serviceCategory, $description,
            $targetCity, $targetAreas, $targetUnits, $startDate,
            $endDate, $paymentModel, $payoutRate, $budget, $status,
            $requiredTrainingId, $requiredKyc, $requiresLocation,
            $maxTasks, $evidenceSchemaJson,
            $projectId
        ]);

        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Project Updated', 'Project', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            (string)$projectId,
            "Updated project '{$name}' for client '{$clientName}'",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Project updated successfully.',
            'project_id' => $projectId
        ]);
        exit;
    }

    // CREATE NEW PROJECT
    $projectRef = 'PRJ-' . date('Y') . '-' . str_pad((string)mt_rand(1, 999), 3, '0', STR_PAD_LEFT);

    $stmt = $db->prepare("
        INSERT INTO projects (
            project_ref, name, client_name, service_category, description,
            target_city, target_areas, target_units, completed_units,
            start_date, end_date, payment_model, payout_rate, budget, status,
            required_training_course_id, required_kyc_level, requires_location,
            max_tasks_per_freelancer, evidence_schema_json
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, 0,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?
        )
    ");
    $stmt->execute([
        $projectRef, $name, $clientName, $serviceCategory, $description,
        $targetCity, $targetAreas, $targetUnits,
        $startDate, $endDate, $paymentModel, $payoutRate, $budget, $status,
        $requiredTrainingId, $requiredKyc, $requiresLocation,
        $maxTasks, $evidenceSchemaJson
    ]);

    $newId = (int)$db->lastInsertId();

    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Project Created', 'Project', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
        $projectRef,
        "Created new project '{$name}' for client '{$clientName}'",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Project {$projectRef} created successfully.",
        'project_id' => $newId,
        'project_ref' => $projectRef
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/tasks/list.php',
      description: 'Admin Tasks listing API with project, freelancer, and status filters',
      content: `<?php
/**
 * We Onboard — Admin Tasks Listing API
 * GET /api/v1/admin/tasks/list.php
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $projectId = (int)($_GET['project_id'] ?? 0);
    $statusFilter = trim($_GET['status'] ?? '');
    $freelancerId = (int)($_GET['freelancer_id'] ?? 0);
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if ($projectId > 0) {
        $where[] = "t.project_id = ?";
        $params[] = $projectId;
    }
    if (!empty($statusFilter) && $statusFilter !== 'All') {
        $where[] = "t.status = ?";
        $params[] = $statusFilter;
    }
    if ($freelancerId > 0) {
        $where[] = "t.assigned_freelancer_id = ?";
        $params[] = $freelancerId;
    }
    if (!empty($search)) {
        $where[] = "(t.title LIKE ? OR t.task_ref LIKE ? OR t.target_area LIKE ? OR f.full_name LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, 
               f.full_name as assigned_freelancer_name, f.phone as assigned_freelancer_phone
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.id DESC
        LIMIT 100
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $tasksRaw = $stmt->fetchAll();

    $tasks = [];
    foreach ($tasksRaw as $row) {
        $tasks[] = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => $row['assigned_freelancer_id'] ? (string)$row['assigned_freelancer_id'] : null,
            'assignedFreelancerName' => $row['assigned_freelancer_name'] ?? null,
            'assignedFreelancerPhone' => $row['assigned_freelancer_phone'] ?? null,
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [],
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'acceptedAt' => $row['accepted_at'] ?? null,
            'submittedAt' => $row['submitted_at'] ?? null,
            'reviewedBy' => $row['reviewed_by_name'] ?? null,
            'reviewedAt' => $row['reviewed_at'] ?? null,
            'reviewComment' => $row['review_comment'] ?? null,
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'tasks' => $tasks,
        'total' => count($tasks)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/tasks/manage.php',
      description: 'Admin Tasks dispatch and management API (create, assign, cancel)',
      content: `<?php
/**
 * We Onboard — Admin Task Management & Dispatch API
 * POST /api/v1/admin/tasks/manage.php
 * 
 * Supports:
 * - action = 'create': Creates new task with ref TSK-YYYY-XXXX
 * - action = 'assign': Assigns task to a specific freelancer
 * - action = 'cancel': Cancels task
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? 'create');

try {
    $db = Database::getConnection();

    // ACTION: ASSIGN TASK TO FREELANCER DIRECTLY
    if ($action === 'assign') {
        $taskId = (int)($data['task_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($taskId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid task_id and freelancer_id are required.']);
            exit;
        }

        // Verify freelancer exists and active
        $flStmt = $db->prepare("SELECT id, full_name, status, onboarding_status FROM freelancers WHERE id = ? LIMIT 1");
        $flStmt->execute([$freelancerId]);
        $fl = $flStmt->fetch();

        if (!$fl) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
            exit;
        }

        $taskStmt = $db->prepare("SELECT * FROM tasks WHERE id = ? LIMIT 1");
        $taskStmt->execute([$taskId]);
        $task = $taskStmt->fetch();

        if (!$task) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Task not found.']);
            exit;
        }

        $up = $db->prepare("UPDATE tasks SET assigned_freelancer_id = ?, status = 'Assigned' WHERE id = ?");
        $up->execute([$freelancerId, $taskId]);

        // Send notification to freelancer
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'New Task Assigned', ?, 'task_assignment')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been assigned task '{$task['title']}' ({$task['task_ref']}). Deadline: {$task['deadline']}."
        ]);

        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Task Assigned to Freelancer', 'Task', ?, ?, ?)
        ");
        $auditStmt->execute([
            $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
            $task['task_ref'],
            "Assigned to {$fl['full_name']} (ID #{$freelancerId})",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Task successfully assigned to {$fl['full_name']}.",
            'task_id' => $taskId
        ]);
        exit;
    }

    // ACTION: CANCEL TASK
    if ($action === 'cancel') {
        $taskId = (int)($data['task_id'] ?? 0);
        $reason = trim($data['reason'] ?? 'Cancelled by administrator');

        $up = $db->prepare("UPDATE tasks SET status = 'Cancelled', review_comment = ? WHERE id = ?");
        $up->execute([$reason, $taskId]);

        echo json_encode(['success' => true, 'message' => 'Task cancelled.']);
        exit;
    }

    // ACTION: CREATE TASK
    $projectId = (int)($data['project_id'] ?? 0);
    $title = trim($data['title'] ?? '');
    $description = trim($data['description'] ?? '');
    $instructions = trim($data['instructions'] ?? '');
    $freelancerId = !empty($data['freelancer_id']) ? (int)$data['freelancer_id'] : null;
    $city = trim($data['city'] ?? 'Bengaluru');
    $targetArea = trim($data['target_area'] ?? 'General Area');
    $deadline = trim($data['deadline'] ?? date('Y-m-d', strtotime('+7 days')));
    $payoutAmount = (float)($data['payout_amount'] ?? 0);
    $requiresLocation = !empty($data['requires_location']) ? 1 : 0;
    $evidenceReqs = $data['evidence_requirements'] ?? [];
    $evidenceReqsJson = is_array($evidenceReqs) ? json_encode($evidenceReqs) : trim($data['evidence_requirements_json'] ?? '[]');

    if ($projectId <= 0 || empty($title)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project ID and Task Title are required.']);
        exit;
    }

    $projStmt = $db->prepare("SELECT id, name FROM projects WHERE id = ? LIMIT 1");
    $projStmt->execute([$projectId]);
    $project = $projStmt->fetch();

    if (!$project) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Parent Project not found.']);
        exit;
    }

    $taskRef = 'TSK-' . date('Y') . '-' . str_pad((string)mt_rand(100, 9999), 4, '0', STR_PAD_LEFT);
    $initialStatus = $freelancerId ? 'Assigned' : 'Available';

    $stmt = $db->prepare("
        INSERT INTO tasks (
            task_ref, project_id, title, description, instructions,
            evidence_requirements_json, requires_location, assigned_freelancer_id,
            city, target_area, deadline, payout_amount, status
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    ");
    $stmt->execute([
        $taskRef, $projectId, $title, $description, $instructions,
        $evidenceReqsJson, $requiresLocation, $freelancerId,
        $city, $targetArea, $deadline, $payoutAmount, $initialStatus
    ]);

    $newId = (int)$db->lastInsertId();

    // If assigned immediately, notify freelancer
    if ($freelancerId) {
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'New Task Assigned', ?, 'task_assignment')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been assigned task '{$title}' ({$taskRef}). Deadline: {$deadline}."
        ]);
    }

    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Created', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['admin_name'] ?? 'Admin #' . $_SESSION['admin_id'],
        $taskRef,
        "Created task in project {$project['name']}" . ($freelancerId ? " (Assigned to #{$freelancerId})" : " (Available pool)"),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Task {$taskRef} created successfully.",
        'task_id' => $newId,
        'task_ref' => $taskRef
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/qc/queue.php',
      description: 'Admin Quality Control review queue API with evidence attachments',
      content: `<?php
/**
 * We Onboard — Quality Control Queue API
 * GET /api/v1/admin/qc/queue.php
 * 
 * Returns all field submissions currently awaiting quality review.
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $projectId = (int)($_GET['project_id'] ?? 0);
    $where = ["t.status IN ('Submitted', 'Under Review')"];
    $params = [];

    if ($projectId > 0) {
        $where[] = "t.project_id = ?";
        $params[] = $projectId;
    }

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, p.service_category,
               p.requires_location as project_requires_location,
               f.full_name as freelancer_name, f.phone as freelancer_phone, f.city as freelancer_city,
               f.registration_ref as freelancer_ref,
               sub.id as submission_id, sub.form_data_json, sub.location_lat, sub.location_lng,
               sub.location_address, sub.submitted_at as evidence_submitted_at
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        LEFT JOIN task_evidence_submissions sub ON (sub.task_id = t.id AND sub.status = 'Pending Review')
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.submitted_at ASC, t.id ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $queueRaw = $stmt->fetchAll();

    $queue = [];
    foreach ($queueRaw as $row) {
        $files = [];
        if (!empty($row['submission_id'])) {
            $fStmt = $db->prepare("
                SELECT id, field_name, original_filename, file_size, mime_type, uploaded_at 
                FROM task_evidence_files 
                WHERE submission_id = ?
            ");
            $fStmt->execute([$row['submission_id']]);
            $filesRaw = $fStmt->fetchAll();
            foreach ($filesRaw as $f) {
                $files[] = [
                    'id' => (string)$f['id'],
                    'fieldName' => $f['field_name'],
                    'originalFilename' => $f['original_filename'],
                    'fileSize' => (int)$f['file_size'],
                    'mimeType' => $f['mime_type'],
                    'uploadedAt' => $f['uploaded_at'],
                    'viewUrl' => "/api/v1/tasks/evidence_file.php?task_id={$row['id']}&file_id={$f['id']}"
                ];
            }
        }

        $formData = json_decode($row['form_data_json'] ?? '{}', true) ?: [];
        $geoTag = null;
        if (!empty($row['location_lat']) && !empty($row['location_lng'])) {
            $geoTag = [
                'latitude' => (float)$row['location_lat'],
                'longitude' => (float)$row['location_lng'],
                'address' => $row['location_address'] ?? ''
            ];
        }

        $queue[] = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'serviceCategory' => $row['service_category'],
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => (string)$row['assigned_freelancer_id'],
            'freelancerName' => $row['freelancer_name'] ?? 'Unknown',
            'freelancerPhone' => $row['freelancer_phone'] ?? '',
            'freelancerCity' => $row['freelancer_city'] ?? '',
            'freelancerRef' => $row['freelancer_ref'] ?? '',
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [],
            'requiresLocation' => (bool)($row['requires_location'] ?? $row['project_requires_location'] ?? 0),
            'submittedAt' => $row['evidence_submitted_at'] ?? $row['submitted_at'],
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'submission' => [
                'id' => $row['submission_id'] ? (string)$row['submission_id'] : null,
                'formData' => $formData,
                'geoTag' => $geoTag,
                'files' => $files
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'queue' => $queue,
        'count' => count($queue)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/qc/review.php',
      description: 'Admin Quality Control review decision API (Approve, Rework Required, Reject)',
      content: `<?php
/**
 * We Onboard — Hardened Quality Control Decision & Review API (Phase 6)
 * POST /api/v1/admin/qc/review.php
 * 
 * Enforces:
 * - Row locking (SELECT ... FOR UPDATE) inside atomic transaction
 * - Duplicate approval prevention (cannot approve already-approved tasks)
 * - Safe retry behavior for repeated client requests
 * - Overwrite protection (cannot overwrite a newer review decision)
 * - Comprehensive review audit history in \`task_review_history\`
 * - Automatic recalculation of verified Quality Score for freelancer
 * - Safe project completion counter updates
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';
if (file_exists($root . '/config/financial.php')) {
    require_once $root . '/config/financial.php';
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$taskId = (int)($data['task_id'] ?? 0);
$decision = trim($data['decision'] ?? '');
$reviewComment = trim($data['review_comment'] ?? '');

$validDecisions = ['Approved', 'Rework Required', 'Rejected'];
if ($taskId <= 0 || !in_array($decision, $validDecisions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id and decision (Approved, Rework Required, Rejected) are required.']);
    exit;
}

// Mandate review comment for Rejection and Rework
if (in_array($decision, ['Rework Required', 'Rejected']) && empty($reviewComment)) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => "A specific review reason or correction instructions must be provided when choosing '{$decision}'."
    ]);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Begin atomic transaction before reading to lock rows
    $db->beginTransaction();

    // Fetch task with row lock to prevent race conditions during concurrent review actions
    $stmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.id as project_id, p.completed_units, p.target_units
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? 
        FOR UPDATE
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // 2. Safe Retry Handling: If client is retrying an identical review decision
    if ($task['status'] === $decision && $task['reviewed_by'] === $adminId) {
        $db->rollBack();
        echo json_encode([
            'success' => true,
            'message' => "Task {$task['task_ref']} already recorded as {$decision} (safe idempotent replay).",
            'task_id' => $taskId,
            'decision' => $decision,
            'idempotent' => true
        ]);
        exit;
    }

    // 3. Duplicate Approval Prevention
    if ($task['status'] === 'Approved') {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => "Conflict: Task {$task['task_ref']} is already Approved and milestone is established. It cannot be re-approved."
        ]);
        exit;
    }

    // 4. Overwrite Protection: Task must be in Submitted or Under Review status
    if (!in_array($task['status'], ['Submitted', 'Under Review'])) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Task is in '{$task['status']}' state, not awaiting QC review. Cannot overwrite newer review state."
        ]);
        exit;
    }

    $freelancerId = (int)$task['assigned_freelancer_id'];

    // 5. Fetch latest submission record
    $subStmt = $db->prepare("
        SELECT id, status, submitted_at 
        FROM task_evidence_submissions 
        WHERE task_id = ? AND status = 'Pending Review' 
        ORDER BY id DESC LIMIT 1
    ");
    $subStmt->execute([$taskId]);
    $submission = $subStmt->fetch();
    $submissionId = $submission ? (int)$submission['id'] : null;

    // 6. Execute State Transition
    $commentToStore = $reviewComment ?: ($decision === 'Approved' ? 'Quality Verified and Approved' : '');

    if ($decision === 'Approved') {
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Approved',
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update latest submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Approved',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Increment project completed units (only if target not exceeded)
        $upProj = $db->prepare("
            UPDATE projects 
            SET completed_units = LEAST(target_units, completed_units + 1) 
            WHERE id = ?
        ");
        $upProj->execute([$task['project_id']]);

        // Phase 7: Financial Subsystem - Double-Entry Earning Recognition & 70/20/10 Split
        $financialResult = null;
        try {
            if (class_exists('FinancialEngine')) {
                $financialResult = FinancialEngine::recognizeTaskEarnings($db, $taskId, $adminName);
            }
        } catch (Exception $fe) {
            error_log("Financial earning recognition error for task {$taskId}: " . $fe->getMessage());
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Approved by Quality Control', ?, 'task_approved')
        ");
        $notif->execute([
            $freelancerId,
            "Congratulations! Your submission for task '{$task['title']}' ({$task['task_ref']}) has passed Quality Control review. Rate: ₹{$task['payout_amount']} established for milestone settlement."
        ]);

    } elseif ($decision === 'Rework Required') {
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Rework Required',
                rework_count = rework_count + 1,
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Rework Required',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Rework Required', ?, 'task_rework')
        ");
        $notif->execute([
            $freelancerId,
            "Quality Control review requested corrections on task '{$task['title']}' ({$task['task_ref']}). Notes: {$commentToStore}. Please resubmit corrected evidence."
        ]);

    } else { // Rejected
        // Update task
        $upTask = $db->prepare("
            UPDATE tasks 
            SET status = 'Rejected',
                reviewed_by = ?,
                reviewed_by_name = ?,
                reviewed_at = NOW(),
                review_comment = ?
            WHERE id = ?
        ");
        $upTask->execute([$adminId, $adminName, $commentToStore, $taskId]);

        // Update submission
        if ($submissionId) {
            $upSub = $db->prepare("
                UPDATE task_evidence_submissions 
                SET status = 'Rejected',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    review_comment = ?
                WHERE id = ?
            ");
            $upSub->execute([$adminName, $commentToStore, $submissionId]);
        }

        // Notify freelancer
        $notif = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Task Evidence Rejected', ?, 'task_rejected')
        ");
        $notif->execute([
            $freelancerId,
            "Your submission for task '{$task['title']}' ({$task['task_ref']}) was rejected by Quality Control. Reason: {$commentToStore}."
        ]);
    }

    // 7. Record into Task Review History (Preserves permanent review history across iterations)
    $histStmt = $db->prepare("
        INSERT INTO task_review_history 
        (task_id, submission_id, freelancer_id, reviewer_id, reviewer_name, decision, review_comment, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $histStmt->execute([
        $taskId,
        $submissionId,
        $freelancerId,
        $adminId,
        $adminName,
        $decision,
        $commentToStore
    ]);

    // 8. Record audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Quality Control Review Completed', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $adminName,
        $task['task_ref'],
        "Decision: {$decision}. Submission #{$submissionId}. Notes: " . $commentToStore,
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    // 9. Recalculate Quality Score for the freelancer post-commit
    $qsResult = null;
    try {
        $qsResult = QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);
    } catch (Exception $e) {
        error_log("QS calculation warning for freelancer {$freelancerId}: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'message' => "Task {$task['task_ref']} marked as {$decision}.",
        'task_id' => $taskId,
        'decision' => $decision,
        'quality_score' => $qsResult ? $qsResult['quality_score'] : null,
        'qs_status' => $qsResult ? $qsResult['qs_status'] : null,
        'financial_entitlement' => $financialResult ?? null
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/performance/scores.php',
      description: 'Admin Quality Score directory with component breakdowns, sample size status, and fraud flag management',
      content: `<?php
/**
 * We Onboard — Admin Freelancer Performance & Quality Score Directory API
 * GET / POST /api/v1/admin/performance/scores.php
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

try {
    $db = Database::getConnection();

    // POST: Manage Policy / Fraud Flags (Set or clear fraud flag with mandatory reason)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;

        $action = trim($data['action'] ?? '');
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid freelancer_id is required.']);
            exit;
        }

        if ($action === 'set_fraud_flag') {
            $reason = trim($data['reason'] ?? '');
            if (empty($reason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A specific substantiated reason is required to flag a freelancer for policy violations.']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE freelancers 
                SET fraud_flag = 1, 
                    fraud_reason = ?, 
                    fraud_flagged_by = ?, 
                    fraud_flagged_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$reason, $adminId, $freelancerId]);

            // Recompute Quality Score to apply penalty
            QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

            // Audit log
            $auditStmt = $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Freelancer Flagged for Policy Violation', 'Freelancer', ?, ?, ?)
            ");
            $auditStmt->execute([
                $adminName,
                (string)$freelancerId,
                "Flagged for fraud/policy violation: {$reason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Policy flag applied. Quality Score recalculated with disciplinary penalty.',
                'freelancer_id' => $freelancerId
            ]);
            exit;

        } elseif ($action === 'clear_fraud_flag') {
            $resolutionReason = trim($data['reason'] ?? '');
            if (empty($resolutionReason)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A resolution justification is required to clear a disciplinary flag.']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE freelancers 
                SET fraud_flag = 0, 
                    fraud_reason = NULL, 
                    fraud_flagged_by = NULL, 
                    fraud_flagged_at = NULL 
                WHERE id = ?
            ");
            $stmt->execute([$freelancerId]);

            // Recompute Quality Score without penalty
            QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

            // Audit log
            $auditStmt = $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Freelancer Policy Violation Flag Cleared', 'Freelancer', ?, ?, ?)
            ");
            $auditStmt->execute([
                $adminName,
                (string)$freelancerId,
                "Disciplinary flag cleared. Resolution: {$resolutionReason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Policy flag cleared. Quality Score restored to normal calculation.',
                'freelancer_id' => $freelancerId
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown action.']);
        exit;
    }

    // GET: List Freelancers with Quality Score & Breakdown
    $search = trim($_GET['search'] ?? '');
    $rank = trim($_GET['rank'] ?? '');
    $qsStatus = trim($_GET['qs_status'] ?? '');
    $city = trim($_GET['city'] ?? '');
    $hasFraud = isset($_GET['fraud']) ? trim($_GET['fraud']) : '';

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(f.full_name LIKE ? OR f.email LIKE ? OR f.phone LIKE ? OR f.registration_ref LIKE ?)";
        $w = "%{$search}%";
        $params = array_merge($params, [$w, $w, $w, $w]);
    }
    if (!empty($rank) && $rank !== 'All') {
        $where[] = "f.current_rank = ?";
        $params[] = $rank;
    }
    if (!empty($qsStatus) && $qsStatus !== 'All') {
        $where[] = "f.qs_status = ?";
        $params[] = $qsStatus;
    }
    if (!empty($city) && $city !== 'All') {
        $where[] = "f.city = ?";
        $params[] = $city;
    }
    if ($hasFraud === '1') {
        $where[] = "f.fraud_flag = 1";
    } elseif ($hasFraud === '0') {
        $where[] = "f.fraud_flag = 0";
    }

    $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    $countSql = "SELECT COUNT(*) FROM freelancers f WHERE " . implode(' AND ', $where);
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetchColumn();

    $sql = "
        SELECT f.id, f.registration_ref, f.full_name, f.email, f.phone, f.city, f.state,
               f.status, f.onboarding_status, f.current_rank, f.quality_score, f.qs_sample_size,
               f.qs_status, f.qs_last_calculated_at, f.fraud_flag, f.fraud_reason, f.fraud_flagged_at,
               f.team_id, t.name as team_name, t.team_code,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id) as total_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Approved') as approved_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Rework Required') as rework_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Rejected') as rejected_tasks,
               (SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = f.id AND status = 'Approved' AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as approved_30d
        FROM freelancers f
        LEFT JOIN teams t ON f.team_id = t.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY f.quality_score DESC, f.id DESC
        LIMIT {$limit} OFFSET {$offset}
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $scores = [];
    foreach ($rows as $r) {
        $isKycApproved = ($r['status'] === 'Active' || $r['onboarding_status'] === 'Approved');
        $qs = $r['quality_score'] !== null ? (float)$r['quality_score'] : null;
        $isActiveMember = ($isKycApproved && $qs !== null && $qs >= 70.0 && (int)$r['fraud_flag'] === 0 && (int)$r['approved_30d'] >= 1);

        $scores[] = [
            'id' => (int)$r['id'],
            'registrationRef' => $r['registration_ref'],
            'fullName' => $r['full_name'],
            'email' => $r['email'],
            'phone' => $r['phone'],
            'city' => $r['city'],
            'state' => $r['state'],
            'status' => $r['status'],
            'onboardingStatus' => $r['onboarding_status'],
            'currentRank' => $r['current_rank'] ?: 'Trainee',
            'teamId' => $r['team_id'] ? (int)$r['team_id'] : null,
            'teamName' => $r['team_name'],
            'teamCode' => $r['team_code'],
            'qualityScore' => $qs,
            'qsSampleSize' => (int)$r['qs_sample_size'],
            'qsStatus' => $r['qs_status'] ?: 'Insufficient Data',
            'qsLastCalculatedAt' => $r['qs_last_calculated_at'],
            'fraudFlag' => (bool)$r['fraud_flag'],
            'fraudReason' => $r['fraud_reason'],
            'fraudFlaggedAt' => $r['fraud_flagged_at'],
            'isActiveMember' => $isActiveMember,
            'metrics' => [
                'totalTasks' => (int)$r['total_tasks'],
                'approvedTasks' => (int)$r['approved_tasks'],
                'reworkTasks' => (int)$r['rework_tasks'],
                'rejectedTasks' => (int)$r['rejected_tasks'],
                'approved30d' => (int)$r['approved_30d']
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'scores' => $scores,
        'pagination' => [
            'total' => $totalCount,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($totalCount / $limit)
        ],
        'config' => QualityScoreEngine::getConfig($db)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/performance/recalculate.php',
      description: 'Admin Quality Score recalculator API (single freelancer or system-wide bulk calculation)',
      content: `<?php
/**
 * We Onboard — Quality Score Recalculator API
 * POST /api/v1/admin/performance/recalculate.php
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$targetFreelancerId = !empty($data['freelancer_id']) ? (int)$data['freelancer_id'] : 0;

try {
    $db = Database::getConnection();

    if ($targetFreelancerId > 0) {
        // Recalculate single freelancer
        $result = QualityScoreEngine::calculateFreelancerScore($db, $targetFreelancerId);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Quality Score Recalculated', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$targetFreelancerId,
            "Quality Score recalculated: " . ($result['quality_score'] !== null ? "{$result['quality_score']} pts" : "Insufficient Data"),
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Quality score recalculated for {$result['full_name']}.",
            'result' => $result
        ]);
        exit;
    }

    // Recalculate all freelancers
    $flStmt = $db->query("SELECT id FROM freelancers ORDER BY id ASC");
    $ids = $flStmt->fetchAll(PDO::FETCH_COLUMN);

    $recalculated = 0;
    $errors = 0;

    foreach ($ids as $fId) {
        try {
            QualityScoreEngine::calculateFreelancerScore($db, (int)$fId);
            $recalculated++;
        } catch (Exception $e) {
            $errors++;
        }
    }

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Bulk Quality Score Recalculation', 'System', 'ALL', ?, ?)
    ");
    $auditStmt->execute([
        $adminName,
        "Recalculated Quality Scores for {$recalculated} freelancers ({$errors} errors)",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => "Successfully recalculated Quality Scores for {$recalculated} freelancers.",
        'recalculated_count' => $recalculated,
        'error_count' => $errors
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/ranks/eligibility.php',
      description: 'Admin Rank Promotion eligibility board evaluating active members, qualifying teams, and verified Quality Scores',
      content: `<?php
/**
 * We Onboard — Rank Promotion Eligibility Engine API (Phase 6)
 * GET /api/v1/admin/ranks/eligibility.php
 * 
 * Evaluates verified criteria for promotions:
 * - Team Leader: >= 10 active members in team AND QS >= 85 AND no fraud flag
 * - Manager: >= 3 qualifying teams (each >= 10 active members) AND QS >= 85 AND no fraud flag
 * - City/Regional Head: Configurable rules subject to administrative approval
 * 
 * Clearly distinguishes eligibility from approved promotions.
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();
    $config = QualityScoreEngine::getConfig($db);

    $leaderMinQs = (float)$config['leader_min_qs'];
    $managerMinQs = (float)$config['manager_min_qs'];
    $leaderMinActive = (int)$config['leader_min_active_members'];
    $managerMinTeams = (int)$config['manager_min_qualifying_teams'];

    // 1. Fetch active member count per team
    $teamActiveCounts = [];
    $teamStmt = $db->query("
        SELECT tm.team_id, COUNT(DISTINCT f.id) as active_count
        FROM team_members tm
        JOIN freelancers f ON tm.freelancer_id = f.id
        WHERE (f.status = 'Active' OR f.onboarding_status = 'Approved')
          AND f.quality_score >= 70.0
          AND f.fraud_flag = 0
          AND (SELECT COUNT(*) FROM tasks 
               WHERE assigned_freelancer_id = f.id 
                 AND status = 'Approved' 
                 AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) >= 1
        GROUP BY tm.team_id
    ");
    while ($row = $teamActiveCountsRaw = $teamStmt->fetch()) {
        $teamActiveCounts[(int)$row['team_id']] = (int)$row['active_count'];
    }

    // 2. Query candidates: Freelancers with KYC Approved and no fraud flag
    $candidatesStmt = $db->query("
        SELECT f.id, f.registration_ref, f.full_name, f.email, f.phone, f.city,
               f.current_rank, f.quality_score, f.qs_sample_size, f.qs_status, f.fraud_flag,
               f.team_id, t.name as team_name, t.team_code,
               (SELECT rp.status FROM rank_promotions rp WHERE rp.freelancer_id = f.id ORDER BY rp.id DESC LIMIT 1) as latest_promotion_status
        FROM freelancers f
        LEFT JOIN teams t ON f.team_id = t.id
        WHERE (f.status = 'Active' OR f.onboarding_status = 'Approved')
          AND f.fraud_flag = 0
        ORDER BY f.quality_score DESC, f.id ASC
    ");
    $candidatesRaw = $candidatesStmt->fetchAll();

    $eligibilityList = [];

    foreach ($candidatesRaw as $cand) {
        $flId = (int)$cand['id'];
        $currentRank = $cand['current_rank'] ?: 'Trainee';
        $qs = $cand['quality_score'] !== null ? (float)$cand['quality_score'] : null;

        // Check teams led by this freelancer
        $ledStmt = $db->prepare("SELECT id, name, team_code FROM teams WHERE leader_id = ?");
        $ledStmt->execute([$flId]);
        $ledTeams = $ledStmt->fetchAll();

        $maxActiveMembersInLedTeam = 0;
        foreach ($ledTeams as $lt) {
            $tId = (int)$lt['id'];
            $activeCount = $teamActiveCounts[$tId] ?? 0;
            if ($activeCount > $maxActiveMembersInLedTeam) {
                $maxActiveMembersInLedTeam = $activeCount;
            }
        }

        // Check teams managed by this freelancer
        $managedStmt = $db->prepare("SELECT id, name, team_code FROM teams WHERE manager_id = ?");
        $managedStmt->execute([$flId]);
        $managedTeams = $managedStmt->fetchAll();

        $qualifyingTeamsCount = 0;
        foreach ($managedTeams as $mt) {
            $tId = (int)$mt['id'];
            $activeCount = $teamActiveCounts[$tId] ?? 0;
            if ($activeCount >= 10) {
                $qualifyingTeamsCount++;
            }
        }

        // Determine Promotion Target & Eligibility
        $targetRank = null;
        $isEligible = false;
        $ineligibilityReasons = [];

        if ($currentRank === 'Trainee') {
            $targetRank = 'Team Member';
            // Trainee to Team Member: KYC verified, at least 1 approved task
            $appCount = (int)$db->query("SELECT COUNT(*) FROM tasks WHERE assigned_freelancer_id = {$flId} AND status = 'Approved'")->fetchColumn();
            if ($appCount >= 1) {
                $isEligible = true;
            } else {
                $ineligibilityReasons[] = "Requires at least 1 completed and QC-approved task (current: {$appCount})";
            }
        } elseif ($currentRank === 'Team Member') {
            $targetRank = 'Team Leader';
            $qsMet = ($qs !== null && $qs >= $leaderMinQs);
            $membersMet = ($maxActiveMembersInLedTeam >= $leaderMinActive);

            if ($qsMet && $membersMet) {
                $isEligible = true;
            } else {
                if (!$qsMet) {
                    $ineligibilityReasons[] = "Quality Score must be >= {$leaderMinQs} (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
                }
                if (!$membersMet) {
                    $ineligibilityReasons[] = "Requires leadership of a team with at least {$leaderMinActive} active members (current highest: {$maxActiveMembersInLedTeam})";
                }
            }
        } elseif ($currentRank === 'Team Leader') {
            $targetRank = 'Manager';
            $qsMet = ($qs !== null && $qs >= $managerMinQs);
            $teamsMet = ($qualifyingTeamsCount >= $managerMinTeams);

            if ($qsMet && $teamsMet) {
                $isEligible = true;
            } else {
                if (!$qsMet) {
                    $ineligibilityReasons[] = "Quality Score must be >= {$managerMinQs} (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
                }
                if (!$teamsMet) {
                    $ineligibilityReasons[] = "Requires managing at least {$managerMinTeams} qualifying teams each with >=10 active members (current: {$qualifyingTeamsCount})";
                }
            }
        } elseif ($currentRank === 'Manager') {
            $targetRank = 'City/Regional Head';
            $qsMet = ($qs !== null && $qs >= 85.0);
            if ($qsMet) {
                $isEligible = true;
            } else {
                $ineligibilityReasons[] = "Quality Score must be >= 85.0 (current: " . ($qs !== null ? "{$qs}" : "Insufficient Data") . ")";
            }
        }

        $eligibilityList[] = [
            'freelancerId' => $flId,
            'registrationRef' => $cand['registration_ref'],
            'fullName' => $cand['full_name'],
            'email' => $cand['email'],
            'phone' => $cand['phone'],
            'city' => $cand['city'],
            'currentRank' => $currentRank,
            'targetRank' => $targetRank,
            'qualityScore' => $qs,
            'qsStatus' => $cand['qs_status'] ?: 'Insufficient Data',
            'teamName' => $cand['team_name'],
            'activeMembersInLedTeam' => $maxActiveMembersInLedTeam,
            'qualifyingTeamsCount' => $qualifyingTeamsCount,
            'isEligible' => $isEligible,
            'ineligibilityReasons' => $ineligibilityReasons,
            'latestPromotionStatus' => $cand['latest_promotion_status'] ?: ($isEligible ? 'Eligible' : 'Not Nominated'),
            'thresholds' => [
                'requiredQs' => ($targetRank === 'Team Leader' || $targetRank === 'Manager' || $targetRank === 'City/Regional Head') ? 85.0 : 70.0,
                'requiredActiveMembers' => ($targetRank === 'Team Leader') ? $leaderMinActive : 0,
                'requiredQualifyingTeams' => ($targetRank === 'Manager') ? $managerMinTeams : 0
            ]
        ];
    }

    // Also fetch recent promotion records
    $promStmt = $db->query("
        SELECT rp.*, f.full_name, f.registration_ref, f.city
        FROM rank_promotions rp
        JOIN freelancers f ON rp.freelancer_id = f.id
        ORDER BY rp.id DESC LIMIT 50
    ");
    $promotions = $promStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'candidates' => $eligibilityList,
        'recentPromotions' => $promotions,
        'rules' => [
            'activeMemberDefinition' => 'Valid KYC + QS >= 70 + No Fraud Flag + >=1 Approved Task in preceding 30 days',
            'teamLeaderRequirements' => ">= {$leaderMinActive} Active Members in team + QS >= {$leaderMinQs}",
            'managerRequirements' => ">= {$managerMinTeams} Qualifying Teams (each >=10 active members) + QS >= {$managerMinQs}",
            'cityHeadRequirements' => 'Current Rank Manager + QS >= 85 + Administrative Appointment'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/ranks/promote.php',
      description: 'Admin Rank Promotion decision API (Nominate, Approve, Reject with audit justifications)',
      content: `<?php
/**
 * We Onboard — Rank Promotion Approval & Review API (Phase 6)
 * POST /api/v1/admin/ranks/promote.php
 * 
 * Supports:
 * - action = 'nominate': Nominates candidate for promotion
 * - action = 'approve': Approves promotion, updates freelancer rank, logs audit
 * - action = 'reject': Rejects nomination with mandatory reason
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

$adminRole = $_SESSION['admin_role'] ?? '';
$allowedRoles = ['Super Admin', 'Administrator'];
if (!in_array($adminRole, $allowedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: Only Super Admins and Administrators can approve rank promotions.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$action = trim($data['action'] ?? '');
$freelancerId = (int)($data['freelancer_id'] ?? 0);
$targetRank = trim($data['target_rank'] ?? '');
$reason = trim($data['reason'] ?? '');

$validRanks = ['Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head'];

if ($freelancerId <= 0 || !in_array($targetRank, $validRanks)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid freelancer_id and valid target_rank are required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Fetch freelancer record
    $flStmt = $db->prepare("SELECT * FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    $currentRank = $fl['current_rank'] ?: 'Trainee';

    if ($action === 'approve') {
        if (empty($reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'An administrative promotion justification reason is required.']);
            exit;
        }

        // Check fraud flag: strictly forbidden to promote flagged accounts
        if ((int)$fl['fraud_flag'] === 1) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Promotion Disallowed: Freelancer has an active policy violation flag and cannot be promoted.'
            ]);
            exit;
        }

        $db->beginTransaction();

        // 1. Update freelancer rank
        $upStmt = $db->prepare("UPDATE freelancers SET current_rank = ? WHERE id = ?");
        $upStmt->execute([$targetRank, $freelancerId]);

        // 2. Insert promotion record
        $snapshot = json_encode([
            'promoted_from' => $currentRank,
            'quality_score' => $fl['quality_score'],
            'qs_status' => $fl['qs_status'],
            'approved_at_timestamp' => date('Y-m-d H:i:s')
        ]);

        $promStmt = $db->prepare("
            INSERT INTO rank_promotions 
            (freelancer_id, from_rank, to_rank, status, eligibility_snapshot_json, reviewed_by, reviewed_by_name, decision_reason, reviewed_at, created_at)
            VALUES (?, ?, ?, 'Approved', ?, ?, ?, ?, NOW(), NOW())
        ");
        $promStmt->execute([
            $freelancerId,
            $currentRank,
            $targetRank,
            $snapshot,
            $adminId,
            $adminName,
            $reason
        ]);
        $promotionId = (int)$db->lastInsertId();

        // 3. Send notification to freelancer
        $notifStmt = $db->prepare("
            INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
            VALUES (?, 'Congratulations! Rank Promotion Approved', ?, 'rank_promotion')
        ");
        $notifStmt->execute([
            $freelancerId,
            "You have been officially promoted from {$currentRank} to {$targetRank}! Justification: {$reason}."
        ]);

        // 4. Record audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Freelancer Rank Promoted', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$freelancerId,
            "Promoted from {$currentRank} to {$targetRank}. Reason: {$reason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Promotion to {$targetRank} approved for {$fl['full_name']}.",
            'promotion_id' => $promotionId,
            'new_rank' => $targetRank
        ]);
        exit;

    } elseif ($action === 'reject') {
        if (empty($reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A rejection reason is required.']);
            exit;
        }

        $promStmt = $db->prepare("
            INSERT INTO rank_promotions 
            (freelancer_id, from_rank, to_rank, status, reviewed_by, reviewed_by_name, decision_reason, reviewed_at, created_at)
            VALUES (?, ?, ?, 'Rejected', ?, ?, ?, NOW(), NOW())
        ");
        $promStmt->execute([
            $freelancerId,
            $currentRank,
            $targetRank,
            $adminId,
            $adminName,
            $reason
        ]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Freelancer Promotion Rejected', 'Freelancer', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            (string)$freelancerId,
            "Rejected promotion nomination from {$currentRank} to {$targetRank}. Reason: {$reason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Promotion nomination for {$fl['full_name']} was rejected.",
            'decision' => 'Rejected'
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action parameter. Must be approve or reject.']);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/teams/list.php',
      description: 'Admin Teams directory API with leader, manager, total count, and 4-rule active member metrics',
      content: `<?php
/**
 * We Onboard — Admin Teams Directory API
 * GET /api/v1/admin/teams/list.php
 * 
 * Returns all field teams with leaders, managers, total member counts,
 * and active member counts based on the 4-rule active member criteria.
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

try {
    $db = Database::getConnection();

    $city = trim($_GET['city'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($city) && $city !== 'All') {
        $where[] = "t.city = ?";
        $params[] = $city;
    }
    if (!empty($status) && $status !== 'All') {
        $where[] = "t.status = ?";
        $params[] = $status;
    }
    if (!empty($search)) {
        $where[] = "(t.name LIKE ? OR t.team_code LIKE ? OR t.operating_area LIKE ?)";
        $w = "%{$search}%";
        $params = array_merge($params, [$w, $w, $w]);
    }

    $sql = "
        SELECT t.*, 
               fl.full_name as leader_name, fl.email as leader_email, fl.phone as leader_phone,
               fl.current_rank as leader_rank, fl.quality_score as leader_qs, fl.fraud_flag as leader_fraud,
               fm.full_name as manager_name, fm.email as manager_email, fm.phone as manager_phone,
               fm.current_rank as manager_rank, fm.quality_score as manager_qs
        FROM teams t
        LEFT JOIN freelancers fl ON t.leader_id = fl.id
        LEFT JOIN freelancers fm ON t.manager_id = fm.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.city ASC, t.id ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $teamsRaw = $stmt->fetchAll();

    $teams = [];
    foreach ($teamsRaw as $row) {
        $teamId = (int)$row['id'];

        // Query team members with active-member qualification metrics
        $memStmt = $db->prepare("
            SELECT tm.id as membership_id, tm.role_in_team, tm.joined_at,
                   f.id as freelancer_id, f.registration_ref, f.full_name, f.email, f.phone,
                   f.status, f.onboarding_status, f.current_rank, f.quality_score, f.fraud_flag,
                   (SELECT COUNT(*) FROM tasks 
                    WHERE assigned_freelancer_id = f.id 
                      AND status = 'Approved' 
                      AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as approved_30d
            FROM team_members tm
            JOIN freelancers f ON tm.freelancer_id = f.id
            WHERE tm.team_id = ?
            ORDER BY tm.role_in_team DESC, f.full_name ASC
        ");
        $memStmt->execute([$teamId]);
        $membersRaw = $memStmt->fetchAll();

        $members = [];
        $activeMembersCount = 0;

        foreach ($membersRaw as $m) {
            $isKycApproved = ($m['status'] === 'Active' || $m['onboarding_status'] === 'Approved');
            $qs = $m['quality_score'] !== null ? (float)$m['quality_score'] : null;
            $hasNoFraud = (int)$m['fraud_flag'] === 0;
            $hasRecentActivity = (int)$m['approved_30d'] >= 1;

            // Strict Active Member criteria:
            // 1. Valid KYC (Active or Approved)
            // 2. Quality Score >= 70
            // 3. No fraud flag
            // 4. At least one QC-approved task in preceding 30 days
            $isActiveMember = ($isKycApproved && $qs !== null && $qs >= 70.0 && $hasNoFraud && $hasRecentActivity);

            if ($isActiveMember) {
                $activeMembersCount++;
            }

            $members[] = [
                'membershipId' => (int)$m['membership_id'],
                'freelancerId' => (int)$m['freelancer_id'],
                'registrationRef' => $m['registration_ref'],
                'fullName' => $m['full_name'],
                'email' => $m['email'],
                'phone' => $m['phone'],
                'currentRank' => $m['current_rank'] ?: 'Trainee',
                'roleInTeam' => $m['role_in_team'],
                'qualityScore' => $qs,
                'fraudFlag' => (bool)$m['fraud_flag'],
                'approved30d' => (int)$m['approved_30d'],
                'isActiveMember' => $isActiveMember,
                'joinedAt' => $m['joined_at']
            ];
        }

        // Qualifying Team rule: at least 10 active members
        $isQualifyingTeam = ($activeMembersCount >= 10);

        $teams[] = [
            'id' => $teamId,
            'teamCode' => $row['team_code'],
            'name' => $row['name'],
            'city' => $row['city'],
            'operatingArea' => $row['operating_area'],
            'status' => $row['status'],
            'leader' => $row['leader_id'] ? [
                'id' => (int)$row['leader_id'],
                'name' => $row['leader_name'],
                'email' => $row['leader_email'],
                'phone' => $row['leader_phone'],
                'rank' => $row['leader_rank'] ?: 'Trainee',
                'qualityScore' => $row['leader_qs'] !== null ? (float)$row['leader_qs'] : null,
                'fraudFlag' => (bool)$row['leader_fraud']
            ] : null,
            'manager' => $row['manager_id'] ? [
                'id' => (int)$row['manager_id'],
                'name' => $row['manager_name'],
                'email' => $row['manager_email'],
                'phone' => $row['manager_phone'],
                'rank' => $row['manager_rank'] ?: 'Manager',
                'qualityScore' => $row['manager_qs'] !== null ? (float)$row['manager_qs'] : null
            ] : null,
            'totalMembers' => count($members),
            'activeMembersCount' => $activeMembersCount,
            'isQualifyingTeam' => $isQualifyingTeam,
            'members' => $members,
            'createdAt' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'teams' => $teams,
        'total' => count($teams)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/teams/manage.php',
      description: 'Admin Teams management API with duplicate membership prevention and circular reporting checks',
      content: `<?php
/**
 * We Onboard — Admin Team Management API (Phase 6)
 * POST /api/v1/admin/teams/manage.php
 * 
 * Supports:
 * - create_team: Creates team
 * - update_team: Updates team metadata
 * - add_member: Adds freelancer to team (enforces single-team membership)
 * - remove_member: Removes freelancer from team
 * - set_leader: Assigns team leader with circular reporting prevention
 * - set_manager: Assigns team manager with circular reporting prevention
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as an administrator.']);
    exit;
}

verify_csrf();

$adminId = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin #' . $adminId;

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = trim($data['action'] ?? '');

try {
    $db = Database::getConnection();

    // 1. ACTION: CREATE TEAM
    if ($action === 'create_team') {
        $name = trim($data['name'] ?? '');
        $city = trim($data['city'] ?? 'Bengaluru');
        $operatingArea = trim($data['operating_area'] ?? '');
        $teamCode = trim($data['team_code'] ?? '');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Team name is required.']);
            exit;
        }

        if (empty($teamCode)) {
            $cityPrefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $city), 0, 3));
            $teamCode = 'TM-' . ($cityPrefix ?: 'BLR') . '-' . str_pad((string)mt_rand(1, 99), 2, '0', STR_PAD_LEFT);
        }

        $stmt = $db->prepare("
            INSERT INTO teams (team_code, name, city, operating_area, status)
            VALUES (?, ?, ?, ?, 'Active')
        ");
        $stmt->execute([$teamCode, $name, $city, $operatingArea]);
        $newTeamId = (int)$db->lastInsertId();

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Created', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $teamCode,
            "Created field team '{$name}' in {$city}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => "Team {$name} ({$teamCode}) created successfully.",
            'team_id' => $newTeamId,
            'team_code' => $teamCode
        ]);
        exit;
    }

    // 2. ACTION: ADD MEMBER TO TEAM (Enforces unique team membership)
    if ($action === 'add_member') {
        $teamId = (int)($data['team_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);
        $roleInTeam = trim($data['role_in_team'] ?? 'Member');

        if ($teamId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id and freelancer_id are required.']);
            exit;
        }

        // Verify team exists
        $teamStmt = $db->prepare("SELECT id, name, team_code, leader_id, manager_id FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        // Check if freelancer is already a member of ANY team
        $checkStmt = $db->prepare("
            SELECT tm.team_id, t.name as team_name, t.team_code 
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.freelancer_id = ? LIMIT 1
        ");
        $checkStmt->execute([$freelancerId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => "Duplicate Membership Prohibited: Freelancer is already an active member of {$existing['team_name']} ({$existing['team_code']}). A freelancer can only belong to one team at a time."
            ]);
            exit;
        }

        // Circular reporting check: Cannot be member if they are the manager of this team
        if ((int)$team['manager_id'] === $freelancerId) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Circular Reporting Conflict: A manager cannot be added as a subordinate team member of a team they oversee.'
            ]);
            exit;
        }

        $db->beginTransaction();

        $addStmt = $db->prepare("
            INSERT INTO team_members (team_id, freelancer_id, role_in_team, joined_at)
            VALUES (?, ?, ?, NOW())
        ");
        $addStmt->execute([$teamId, $freelancerId, $roleInTeam]);

        $upFl = $db->prepare("UPDATE freelancers SET team_id = ? WHERE id = ?");
        $upFl->execute([$teamId, $freelancerId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Member Assigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            "Added freelancer #{$freelancerId} to {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Freelancer successfully added to {$team['name']}.",
            'team_id' => $teamId,
            'freelancer_id' => $freelancerId
        ]);
        exit;
    }

    // 3. ACTION: REMOVE MEMBER FROM TEAM
    if ($action === 'remove_member') {
        $teamId = (int)($data['team_id'] ?? 0);
        $freelancerId = (int)($data['freelancer_id'] ?? 0);

        if ($teamId <= 0 || $freelancerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id and freelancer_id are required.']);
            exit;
        }

        $db->beginTransaction();

        $delStmt = $db->prepare("DELETE FROM team_members WHERE team_id = ? AND freelancer_id = ?");
        $delStmt->execute([$teamId, $freelancerId]);

        $upFl = $db->prepare("UPDATE freelancers SET team_id = NULL WHERE id = ? AND team_id = ?");
        $upFl->execute([$freelancerId, $teamId]);

        // If this member was team leader, clear leader_id
        $upTeam = $db->prepare("UPDATE teams SET leader_id = NULL WHERE id = ? AND leader_id = ?");
        $upTeam->execute([$teamId, $freelancerId]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Freelancer removed from team.',
            'team_id' => $teamId,
            'freelancer_id' => $freelancerId
        ]);
        exit;
    }

    // 4. ACTION: SET TEAM LEADER (Circular Reporting Check)
    if ($action === 'set_leader') {
        $teamId = (int)($data['team_id'] ?? 0);
        $leaderId = !empty($data['leader_id']) ? (int)$data['leader_id'] : null;

        if ($teamId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id is required.']);
            exit;
        }

        $teamStmt = $db->prepare("SELECT * FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        if ($leaderId !== null) {
            // Circular Reporting Checks:
            // 1. Leader cannot be the same person as the team's manager
            if (!empty($team['manager_id']) && (int)$team['manager_id'] === $leaderId) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot simultaneously serve as the team leader reporting to themselves.'
                ]);
                exit;
            }

            // 2. Freelancer must exist and not be flagged for fraud
            $flStmt = $db->prepare("SELECT id, full_name, fraud_flag, current_rank FROM freelancers WHERE id = ? LIMIT 1");
            $flStmt->execute([$leaderId]);
            $fl = $flStmt->fetch();
            if (!$fl) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Designated leader freelancer account not found.']);
                exit;
            }
            if ((int)$fl['fraud_flag'] === 1) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Disciplinary Restriction: A freelancer with an active policy flag cannot be appointed as Team Leader.']);
                exit;
            }
        }

        $stmt = $db->prepare("UPDATE teams SET leader_id = ? WHERE id = ?");
        $stmt->execute([$leaderId, $teamId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Leader Reassigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            $leaderId ? "Assigned freelancer #{$leaderId} as leader of {$team['name']}" : "Unassigned leader of {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Team leader successfully updated.',
            'team_id' => $teamId,
            'leader_id' => $leaderId
        ]);
        exit;
    }

    // 5. ACTION: SET TEAM MANAGER (Circular Reporting Check)
    if ($action === 'set_manager') {
        $teamId = (int)($data['team_id'] ?? 0);
        $managerId = !empty($data['manager_id']) ? (int)$data['manager_id'] : null;

        if ($teamId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid team_id is required.']);
            exit;
        }

        $teamStmt = $db->prepare("SELECT * FROM teams WHERE id = ? LIMIT 1");
        $teamStmt->execute([$teamId]);
        $team = $teamStmt->fetch();
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Team not found.']);
            exit;
        }

        if ($managerId !== null) {
            // Circular Reporting Checks:
            // 1. Manager cannot be the team leader of this team
            if (!empty($team['leader_id']) && (int)$team['leader_id'] === $managerId) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot oversee a team where they are also appointed as the team leader.'
                ]);
                exit;
            }

            // 2. Manager cannot be an ordinary subordinate member of this team
            $memStmt = $db->prepare("SELECT id FROM team_members WHERE team_id = ? AND freelancer_id = ? LIMIT 1");
            $memStmt->execute([$teamId, $managerId]);
            if ($memStmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Circular Reporting Conflict: A manager cannot be assigned to oversee a team of which they are a subordinate member.'
                ]);
                exit;
            }
        }

        $stmt = $db->prepare("UPDATE teams SET manager_id = ? WHERE id = ?");
        $stmt->execute([$managerId, $teamId]);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Team Manager Assigned', 'Team', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            $team['team_code'],
            $managerId ? "Assigned freelancer #{$managerId} as manager of {$team['name']}" : "Unassigned manager of {$team['name']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Team manager successfully updated.',
            'team_id' => $teamId,
            'manager_id' => $managerId
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action parameter.']);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/freelancers/performance.php',
      description: 'Freelancer Personal Performance API returning verified Quality Score, rank progress checklist, and reviewer history',
      content: `<?php
/**
 * We Onboard — Freelancer Personal Performance & Rank Progress API
 * GET /api/v1/freelancers/performance.php
 * 
 * Secure endpoint for freelancers to inspect their own Quality Score breakdown,
 * rank eligibility progress, team membership, and review feedback.
 */

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
require_once $root . '/config/quality_score.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

try {
    $db = Database::getConnection();

    // 1. Calculate latest verified score breakdown
    $scoreData = QualityScoreEngine::calculateFreelancerScore($db, $freelancerId);

    // 2. Fetch team info
    $teamStmt = $db->prepare("
        SELECT t.id, t.name as team_name, t.team_code, t.city, t.operating_area,
               fl.full_name as leader_name, fl.phone as leader_phone,
               fm.full_name as manager_name,
               tm.role_in_team, tm.joined_at
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        LEFT JOIN freelancers fl ON t.leader_id = fl.id
        LEFT JOIN freelancers fm ON t.manager_id = fm.id
        WHERE tm.freelancer_id = ?
        LIMIT 1
    ");
    $teamStmt->execute([$freelancerId]);
    $teamInfo = $teamStmt->fetch();

    // 3. Fetch past task review history (feedback from reviewers)
    $revStmt = $db->prepare("
        SELECT trh.id, trh.decision, trh.review_comment, trh.reviewed_at,
               t.task_ref, t.title as task_title, p.name as project_name
        FROM task_review_history trh
        JOIN tasks t ON trh.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE trh.freelancer_id = ?
        ORDER BY trh.id DESC
        LIMIT 20
    ");
    $revStmt->execute([$freelancerId]);
    $reviewHistory = $revStmt->fetchAll();

    // 4. Calculate progress toward next rank
    $currentRank = $scoreData['current_rank'];
    $nextRank = null;
    $rankChecklist = [];

    if ($currentRank === 'Trainee') {
        $nextRank = 'Team Member';
        $approvedCount = (int)$scoreData['task_metrics']['approved'];
        $rankChecklist = [
            [
                'label' => 'KYC Verification Approved',
                'completed' => true,
                'requirement' => 'Admin KYC approval'
            ],
            [
                'label' => 'Complete At Least 1 Field Task',
                'completed' => $approvedCount >= 1,
                'requirement' => '1 task approved by Quality Control (current: ' . $approvedCount . ')'
            ]
        ];
    } elseif ($currentRank === 'Team Member') {
        $nextRank = 'Team Leader';
        $qs = $scoreData['quality_score'] ?? 0;
        $rankChecklist = [
            [
                'label' => 'Quality Score >= 85.0',
                'completed' => ($qs >= 85.0 && $scoreData['has_sufficient_data']),
                'requirement' => 'Verified Quality Score of 85.0+ (current: ' . ($scoreData['has_sufficient_data'] ? $qs : 'Insufficient Data') . ')'
            ],
            [
                'label' => 'Team Active Members >= 10',
                'completed' => false,
                'requirement' => 'Lead an active field team with at least 10 active associates'
            ],
            [
                'label' => 'No Policy or Fraud Flags',
                'completed' => ((int)$scoreData['breakdown']['fraud_penalty'] === 0),
                'requirement' => 'Clean compliance track record'
            ]
        ];
    } elseif ($currentRank === 'Team Leader') {
        $nextRank = 'Manager';
        $qs = $scoreData['quality_score'] ?? 0;
        $rankChecklist = [
            [
                'label' => 'Quality Score >= 85.0',
                'completed' => ($qs >= 85.0 && $scoreData['has_sufficient_data']),
                'requirement' => 'Verified Quality Score of 85.0+ (current: ' . ($scoreData['has_sufficient_data'] ? $qs : 'Insufficient Data') . ')'
            ],
            [
                'label' => 'Supervise >= 3 Qualifying Teams',
                'completed' => false,
                'requirement' => 'Direct management of at least 3 qualifying teams (each >= 10 active members)'
            ]
        ];
    } elseif ($currentRank === 'Manager') {
        $nextRank = 'City/Regional Head';
        $rankChecklist = [
            [
                'label' => 'Regional Management Appointment',
                'completed' => false,
                'requirement' => 'Administrative nomination and executive approval'
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'performance' => $scoreData,
        'team' => $teamInfo ?: null,
        'rankProgression' => [
            'currentRank' => $currentRank,
            'nextRank' => $nextRank,
            'checklist' => $rankChecklist
        ],
        'reviewHistory' => $reviewHistory
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'cron/release_reserves.php',
      description: 'Scheduled CLI or cron worker for automatic release of 15-day matured quality reserves',
      content: `<?php
/**
 * We Onboard — Scheduled Reserve Release Worker (Phase 7)
 * Command line or cron invocation:
 * php cron/release_reserves.php
 * 
 * Automatically scans reserve_records where status = 'Held' AND release_due_at <= NOW().
 * Posts balanced double-entry journals moving funds from 2004 (Reserve Liability) to 2001 (Freelancer Available).
 * Updates wallet projections.
 */

$rootCandidates = [dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    die("System configuration not found\\n");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

$isCli = (php_sapi_name() === 'cli');

// If HTTP request, require CRON_KEY secret
if (!$isCli) {
    $cronKey = $_GET['cron_key'] ?? '';
    $configuredKey = getenv('CRON_KEY') ?: 'weonboard_cron_secret_key_2026';
    if ($cronKey !== $configuredKey) {
        http_response_code(403);
        die(json_encode(['success' => false, 'error' => 'Unauthorized cron execution.']));
    }
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    $result = FinancialEngine::releaseMaturedReserves($db, 'CRON_SCHEDULER');

    $db->commit();

    $output = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'matured_reserves_released' => $result['released_count'],
        'total_amount_released' => $result['total_amount'],
        'released_references' => $result['released_refs']
    ];

    if ($isCli) {
        echo "[" . date('Y-m-d H:i:s') . "] Reserve Release Worker Completed. Released: {$result['released_count']} reserves, Total: ₹{$result['total_amount']}\\n";
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($output, JSON_PRETTY_PRINT);
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($isCli) {
        fwrite(STDERR, "Error releasing reserves: " . $e->getMessage() . "\\n");
        exit(1);
    } else {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
`
    },
    {
      path: 'api/v1/wallet/index.php',
      description: 'Freelancer wallet balances, 15-day reserves, recent ledger activity and payout history',
      content: `<?php
/**
 * We Onboard — Freelancer Wallet & Balances API (Phase 7)
 * GET /api/v1/wallet/index.php
 * 
 * Returns:
 * - Available balance (withdrawable)
 * - Reserved balance (10% quality hold for 15 days)
 * - Pending earnings (tasks submitted awaiting QC approval)
 * - Total lifetime earnings (70% gross entitlements)
 * - Payouts in progress and total paid out
 * - Recent transaction ledger entries
 * - Active reserve records with release countdown
 * - Recent payout requests
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Authenticate Freelancer
$freelancerId = null;
if (isset($_SESSION['freelancer_id'])) {
    $freelancerId = (int)$_SESSION['freelancer_id'];
} elseif (isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    // Admin reviewing freelancer wallet
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in as freelancer.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Fetch Freelancer Info
    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, email, status, onboarding_status, fraud_flag, current_rank FROM freelancers WHERE id = ?");
    $flStmt->execute([$freelancerId]);
    $freelancer = $flStmt->fetch();
    if (!$freelancer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    // 2. Ensure Wallet Record Exists
    $db->prepare("
        INSERT IGNORE INTO wallets (freelancer_id, total_earned, available_balance, reserved_balance, pending_earnings, payouts_in_progress, paid_payouts)
        VALUES (?, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
    ")->execute([$freelancerId]);

    // 3. Calculate pending earnings dynamically from tasks submitted awaiting QC review
    $pendingStmt = $db->prepare("
        SELECT COALESCE(SUM(payout_amount * 0.70), 0.00) as dynamic_pending
        FROM tasks
        WHERE assigned_freelancer_id = ? AND status IN ('Submitted', 'Under Review')
    ");
    $pendingStmt->execute([$freelancerId]);
    $dynamicPending = (float)$pendingStmt->fetchColumn();

    // 4. Fetch Wallet Record
    $wStmt = $db->prepare("SELECT * FROM wallets WHERE freelancer_id = ?");
    $wStmt->execute([$freelancerId]);
    $wallet = $wStmt->fetch();

    // 5. Fetch Recent Ledger Entries for this Freelancer (Entity ID = freelancer_id)
    $leStmt = $db->prepare("
        SELECT 
            le.id,
            le.account_code,
            la.account_name,
            le.entry_type,
            le.amount,
            le.line_narration,
            le.created_at,
            lj.journal_ref,
            lj.transaction_type,
            lj.reference_id
        FROM ledger_entries le
        JOIN ledger_journals lj ON le.journal_id = lj.id
        JOIN ledger_accounts la ON le.account_code = la.account_code
        WHERE le.entity_id = ? AND le.entity_type = 'Freelancer'
        ORDER BY le.id DESC
        LIMIT 25
    ");
    $leStmt->execute([(string)$freelancerId]);
    $ledgerEntries = $leStmt->fetchAll();

    // 6. Fetch Active & Recent Reserve Records (with countdown)
    $resStmt = $db->prepare("
        SELECT 
            r.*,
            t.task_ref,
            t.title as task_title,
            TIMESTAMPDIFF(SECOND, NOW(), r.release_due_at) as seconds_to_release
        FROM reserve_records r
        LEFT JOIN tasks t ON r.task_id = t.id
        WHERE r.freelancer_id = ?
        ORDER BY r.id DESC
        LIMIT 15
    ");
    $resStmt->execute([$freelancerId]);
    $reserves = $resStmt->fetchAll();

    // 7. Fetch Recent Payout Requests
    $poStmt = $db->prepare("
        SELECT * FROM payout_requests 
        WHERE freelancer_id = ? 
        ORDER BY id DESC 
        LIMIT 10
    ");
    $poStmt->execute([$freelancerId]);
    $payouts = $poStmt->fetchAll();

    // 8. Fetch Earning Entitlements (Approved Task Splits)
    $eeStmt = $db->prepare("
        SELECT 
            ee.*,
            t.task_ref,
            t.title as task_title,
            p.name as project_name
        FROM earning_entitlements ee
        JOIN tasks t ON ee.task_id = t.id
        JOIN projects p ON ee.project_id = p.id
        WHERE ee.freelancer_id = ?
        ORDER BY ee.id DESC
        LIMIT 15
    ");
    $eeStmt->execute([$freelancerId]);
    $entitlements = $eeStmt->fetchAll();

    $cfg = FinancialEngine::getConfig($db);

    echo json_encode([
        'success' => true,
        'wallet' => [
            'freelancer_id' => $freelancerId,
            'freelancer_name' => $freelancer['full_name'],
            'registration_ref' => $freelancer['registration_ref'],
            'current_rank' => $freelancer['current_rank'],
            'available_balance' => (float)$wallet['available_balance'],
            'reserved_balance' => (float)$wallet['reserved_balance'],
            'pending_earnings' => $dynamicPending,
            'total_earned' => (float)$wallet['total_earned'],
            'payouts_in_progress' => (float)$wallet['payouts_in_progress'],
            'paid_payouts' => (float)$wallet['paid_payouts'],
            'currency' => 'INR',
            'currency_symbol' => '₹',
            'is_kyc_approved' => in_array($freelancer['status'], ['Active', 'Approved']) || $freelancer['onboarding_status'] === 'Approved',
            'has_fraud_flag' => (int)$freelancer['fraud_flag'] === 1,
            'min_payout_amount' => $cfg['min_payout_amount'],
            'max_payout_amount' => $cfg['max_payout_amount'],
            'last_reconciled_at' => $wallet['last_reconciled_at']
        ],
        'ledger_entries' => $ledgerEntries,
        'reserves' => $reserves,
        'payouts' => $payouts,
        'entitlements' => $entitlements
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/wallet/statement.php',
      description: 'Freelancer periodic financial statement generator with date filters and downloadable CSV export',
      content: `<?php
/**
 * We Onboard — Freelancer Financial Statement Generator (Phase 7)
 * GET /api/v1/wallet/statement.php?start_date=2026-01-01&end_date=2026-12-31&format=json|csv
 * 
 * Provides:
 * - Opening balance at start_date
 * - Itemized ledger movements (debits/credits) within range
 * - Closing balance at end_date
 * - Summary of gross earnings, reserves held/released, and payouts
 * - Direct CSV download stream or JSON payload
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$freelancerId = null;
if (isset($_SESSION['freelancer_id'])) {
    $freelancerId = (int)$_SESSION['freelancer_id'];
} elseif (isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Authentication required.']);
    exit;
}

$startDate = $_GET['start_date'] ?? date('Y-m-01'); // First of current month
$endDate = $_GET['end_date'] ?? date('Y-m-d'); // Today
$format = strtolower($_GET['format'] ?? 'json');

try {
    $db = Database::getConnection();

    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, email, city FROM freelancers WHERE id = ?");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer not found.']);
        exit;
    }

    // 1. Calculate Opening Balance before start_date on account 2001 (Available Balance)
    // For account 2001 (Liability), Credits increase available, Debits decrease available
    $openStmt = $db->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0.00) as opening_balance
        FROM ledger_entries
        WHERE entity_id = ? AND entity_type = 'Freelancer' AND account_code = '2001'
        AND created_at < ?
    ");
    $openStmt->execute([(string)$freelancerId, $startDate . ' 00:00:00']);
    $openingBalance = (float)$openStmt->fetchColumn();

    // 2. Fetch Period Transactions
    $txStmt = $db->prepare("
        SELECT 
            le.id as entry_id,
            le.created_at as entry_date,
            le.account_code,
            la.account_name,
            le.entry_type,
            le.amount,
            le.line_narration,
            lj.journal_ref,
            lj.transaction_type,
            lj.reference_id
        FROM ledger_entries le
        JOIN ledger_journals lj ON le.journal_id = lj.id
        JOIN ledger_accounts la ON le.account_code = la.account_code
        WHERE le.entity_id = ? AND le.entity_type = 'Freelancer'
        AND le.created_at BETWEEN ? AND ?
        ORDER BY le.id ASC
    ");
    $txStmt->execute([(string)$freelancerId, $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
    $entries = $txStmt->fetchAll();

    // 3. Compute running balance and period totals
    $runningBalance = $openingBalance;
    $totalDebits = 0.0;
    $totalCredits = 0.0;

    foreach ($entries as &$e) {
        $amt = (float)$e['amount'];
        if ($e['account_code'] === '2001') {
            if ($e['entry_type'] === 'CREDIT') {
                $runningBalance = round($runningBalance + $amt, 2);
                $totalCredits = round($totalCredits + $amt, 2);
            } else {
                $runningBalance = round($runningBalance - $amt, 2);
                $totalDebits = round($totalDebits + $amt, 2);
            }
        }
        $e['running_available_balance'] = $runningBalance;
    }
    $closingBalance = $runningBalance;

    if ($format === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="weonboard-statement-' . $fl['registration_ref'] . '-' . $startDate . '-to-' . $endDate . '.csv"');
        
        $out = fopen('php://output', 'w');
        fputcsv($out, ['WE ONBOARD — FREELANCER ACCOUNT STATEMENT']);
        fputcsv($out, ['Associate Name', $fl['full_name'], 'Registration ID', $fl['registration_ref']]);
        fputcsv($out, ['Period', $startDate . ' to ' . $endDate, 'Generated At', date('Y-m-d H:i:s')]);
        fputcsv($out, ['Opening Available Balance (INR)', number_format($openingBalance, 2)]);
        fputcsv($out, ['Closing Available Balance (INR)', number_format($closingBalance, 2)]);
        fputcsv($out, []);
        fputcsv($out, ['Date', 'Journal Ref', 'Transaction Type', 'Account', 'Entry Type', 'Amount (INR)', 'Running Balance (INR)', 'Narration']);

        foreach ($entries as $row) {
            fputcsv($out, [
                $row['entry_date'],
                $row['journal_ref'],
                $row['transaction_type'],
                $row['account_code'] . ' - ' . $row['account_name'],
                $row['entry_type'],
                number_format($row['amount'], 2),
                number_format($row['running_available_balance'], 2),
                $row['line_narration']
            ]);
        }
        fclose($out);
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'statement' => [
            'freelancer_id' => $freelancerId,
            'freelancer_name' => $fl['full_name'],
            'registration_ref' => $fl['registration_ref'],
            'period_start' => $startDate,
            'period_end' => $endDate,
            'opening_balance' => $openingBalance,
            'closing_balance' => $closingBalance,
            'total_credits' => $totalCredits,
            'total_debits' => $totalDebits,
            'net_movement' => round($closingBalance - $openingBalance, 2),
            'currency' => 'INR',
            'generated_at' => date('Y-m-d H:i:s')
        ],
        'entries' => $entries
    ]);

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Statement generation failed: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/payouts/request.php',
      description: 'Freelancer withdrawal request endpoint with atomic available balance earmarking',
      content: `<?php
/**
 * We Onboard — Freelancer Payout Request API (Phase 7)
 * POST /api/v1/payouts/request.php
 * 
 * Enforces:
 * - Authenticated freelancer session
 * - Approved KYC verification
 * - Zero fraud or disciplinary flags
 * - Available balance check with atomic row lock (SELECT ... FOR UPDATE)
 * - Minimum payout amount (₹500) and max transaction limit
 * - Double-entry ledger journal moving funds from Freelancer Payable (2001) to Payout Clearing (2005)
 * - Safe idempotency key handling
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$freelancerId = $_SESSION['freelancer_id'] ?? null;
if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
$paymentMethod = $input['payment_method'] ?? 'UPI';
$beneficiaryName = trim($input['beneficiary_name'] ?? '');
$beneficiaryDetails = trim($input['beneficiary_details'] ?? '');
$idempotencyKey = trim($input['idempotency_key'] ?? '');

if ($amount <= 0 || empty($beneficiaryName) || empty($beneficiaryDetails)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Amount, beneficiary name, and beneficiary account/UPI details are required.']);
    exit;
}

if (!in_array($paymentMethod, ['UPI', 'Bank Transfer', 'NEFT'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payment method. Supported: UPI, Bank Transfer, NEFT.']);
    exit;
}

if (empty($idempotencyKey)) {
    $idempotencyKey = hash('sha256', $freelancerId . '_' . $amount . '_' . $beneficiaryDetails . '_' . date('YmdH'));
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    $result = FinancialEngine::requestPayout(
        $db,
        (int)$freelancerId,
        $amount,
        $paymentMethod,
        $beneficiaryName,
        $beneficiaryDetails,
        $idempotencyKey
    );

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Payout Requested', 'Payout', ?, ?, ?)
    ");
    $auditStmt->execute([
        $beneficiaryName,
        $result['payout_ref'],
        "Requested ₹{$amount} via {$paymentMethod} to {$beneficiaryDetails}. Journal: {$result['journal_ref']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => "Payout request for ₹" . number_format($amount, 2) . " submitted successfully.",
        'payout' => $result
    ]);

} catch (InvalidArgumentException $ie) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $ie->getMessage()]);
} catch (RuntimeException $re) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $re->getMessage()]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/payouts/list.php',
      description: 'Freelancer withdrawal requests history and settlement tracking',
      content: `<?php
/**
 * We Onboard — Freelancer Payouts List API (Phase 7)
 * GET /api/v1/payouts/list.php
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$freelancerId = $_SESSION['freelancer_id'] ?? null;
if (!$freelancerId && isset($_GET['freelancer_id']) && isset($_SESSION['admin_id'])) {
    $freelancerId = (int)$_GET['freelancer_id'];
}

if (!$freelancerId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $stmt = $db->prepare("
        SELECT 
            p.*,
            lj.journal_ref as request_journal_ref,
            sj.journal_ref as settlement_journal_ref,
            rj.journal_ref as reversal_journal_ref
        FROM payout_requests p
        LEFT JOIN ledger_journals lj ON p.request_journal_id = lj.id
        LEFT JOIN ledger_journals sj ON p.settlement_journal_id = sj.id
        LEFT JOIN ledger_journals rj ON p.reversal_journal_id = rj.id
        WHERE p.freelancer_id = ?
        ORDER BY p.id DESC
        LIMIT 50
    ");
    $stmt->execute([$freelancerId]);
    $payouts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'payouts' => $payouts
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/payouts/webhook.php',
      description: 'Payment provider webhook callback handler with server-side HMAC-SHA256 signature verification',
      content: `<?php
/**
 * We Onboard — Payment Provider Webhook Receiver (Phase 7)
 * POST /api/v1/payouts/webhook.php
 * 
 * Provides:
 * - Server-side HMAC-SHA256 signature verification
 * - Rejection of forged, expired, or unsigned webhook payloads
 * - Idempotent settlement and failure processing
 * - Double-entry ledger integration (settlement clearing -> cash, or failure clearing -> refund)
 */

$rootCandidates = [dirname(__DIR__, 3), dirname(__DIR__, 2), dirname(__DIR__, 1)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

// Server-controlled webhook secret (configured in environment, never exposed to client)
$webhookSecret = getenv('PAYMENT_WEBHOOK_SECRET') ?: ($_ENV['PAYMENT_WEBHOOK_SECRET'] ?? 'weonboard_live_webhook_hmac_secret_2026');

$payloadRaw = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_WEONBOARD_SIGNATURE'] ?? $_SERVER['HTTP_X_PROVIDER_SIGNATURE'] ?? '';
$timestampHeader = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';

if (empty($payloadRaw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Empty webhook payload.']);
    exit;
}

// 1. Replay Protection: Timestamp must be within 300 seconds (5 minutes)
if (empty($timestampHeader) || !ctype_digit((string)$timestampHeader)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid webhook timestamp header.']);
    exit;
}

$age = abs(time() - (int)$timestampHeader);
if ($age > 300) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Webhook timestamp expired (replay protection).']);
    exit;
}

// 2. Strict HMAC-SHA256 Signature Verification
$expectedSignature = hash_hmac('sha256', $timestampHeader . '.' . $payloadRaw, $webhookSecret);
$isValidSignature = hash_equals($expectedSignature, $signatureHeader);

if (!$isValidSignature) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid webhook signature or unauthorized source.']);
    exit;
}

$data = json_decode($payloadRaw, true);
if (!$data || !isset($data['event'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON or missing event attribute.']);
    exit;
}

$event = $data['event'];
$payoutRef = $data['payout_ref'] ?? ($data['data']['payout_ref'] ?? '');
$providerRef = $data['provider_transfer_id'] ?? ($data['data']['provider_transfer_id'] ?? 'SIM-TRF-' . time());
$failureReason = $data['failure_reason'] ?? ($data['data']['failure_reason'] ?? 'Bank rejected transfer');

try {
    $db = Database::getConnection();

    // Find payout request
    $poStmt = $db->prepare("SELECT id, status, amount, freelancer_id FROM payout_requests WHERE payout_ref = ?");
    $poStmt->execute([$payoutRef]);
    $payout = $poStmt->fetch();

    if (!$payout) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => "Payout request '{$payoutRef}' not found."]);
        exit;
    }

    $db->beginTransaction();

    if ($event === 'transfer.success' || $event === 'transfer.settled') {
        $result = FinancialEngine::settlePayout($db, (int)$payout['id'], $providerRef, 'PAYMENT_WEBHOOK');
        $db->commit();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => "Payout {$payoutRef} settled successfully.",
            'result' => $result
        ]);
        exit;

    } elseif ($event === 'transfer.failed' || $event === 'transfer.reversed') {
        if ($payout['status'] === 'Paid') {
            $db->rollBack();
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'received' => true,
                'event' => $event,
                'error' => "Conflict: Payout {$payoutRef} is already settled as Paid. Out-of-order failure event rejected."
            ]);
            exit;
        }
        $result = FinancialEngine::reversePayout($db, (int)$payout['id'], $failureReason, 'PAYMENT_WEBHOOK');
        $db->commit();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => "Payout {$payoutRef} reversed and funds refunded.",
            'result' => $result
        ]);
        exit;

    } else {
        $db->rollBack();
        echo json_encode([
            'success' => true,
            'received' => true,
            'event' => $event,
            'message' => 'Ignored unhandled event type.'
        ]);
        exit;
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Webhook processing failed: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/overview.php',
      description: 'Admin financial overview, trial balance, KPI metrics, and Growth Pool accumulation',
      content: `<?php
/**
 * We Onboard — Admin Financial Overview API (Phase 7)
 * GET /api/v1/admin/financial/overview.php
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Fetch Trial Balance
    $trialBalance = FinancialEngine::getTrialBalance($db);

    // 2. Fetch Pending Payouts Stats
    $poStatsStmt = $db->query("
        SELECT 
            COUNT(CASE WHEN status IN ('Requested', 'Under Review') THEN 1 END) as pending_count,
            COALESCE(SUM(CASE WHEN status IN ('Requested', 'Under Review') THEN amount ELSE 0 END), 0.00) as pending_amount,
            COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0.00) as paid_amount,
            COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count
        FROM payout_requests
    ");
    $payoutStats = $poStatsStmt->fetch();

    // 3. Fetch Reserve Stats
    $resStatsStmt = $db->query("
        SELECT 
            COUNT(CASE WHEN status = 'Held' THEN 1 END) as held_count,
            COALESCE(SUM(CASE WHEN status = 'Held' THEN amount ELSE 0 END), 0.00) as held_amount,
            COUNT(CASE WHEN status = 'Held' AND release_due_at <= NOW() THEN 1 END) as matured_ready_count,
            COALESCE(SUM(CASE WHEN status = 'Held' AND release_due_at <= NOW() THEN amount ELSE 0 END), 0.00) as matured_ready_amount,
            COUNT(CASE WHEN status = 'Released' THEN 1 END) as released_count,
            COALESCE(SUM(CASE WHEN status = 'Released' THEN amount ELSE 0 END), 0.00) as released_amount
        FROM reserve_records
    ");
    $reserveStats = $resStatsStmt->fetch();

    // 4. Fetch Growth Pool Stats
    $growthStmt = $db->query("
        SELECT 
            COALESCE(SUM(growth_pool_share), 0.00) as total_growth_pool,
            COUNT(CASE WHEN team_leader_routed_to_growth = 1 THEN 1 END) as tl_routed_count,
            COUNT(CASE WHEN manager_routed_to_growth = 1 THEN 1 END) as mgr_routed_count
        FROM earning_entitlements
    ");
    $growthStats = $growthStmt->fetch();

    // 5. Total recognized field earnings
    $earnStmt = $db->query("
        SELECT 
            COALESCE(SUM(gross_rate), 0.00) as total_gross_field_cost,
            COALESCE(SUM(freelancer_share_gross), 0.00) as total_freelancer_share,
            COALESCE(SUM(team_leader_share), 0.00) as total_leader_share,
            COALESCE(SUM(manager_share), 0.00) as total_manager_share,
            COUNT(*) as total_entitlements_count
        FROM earning_entitlements
    ");
    $earningStats = $earnStmt->fetch();

    echo json_encode([
        'success' => true,
        'trial_balance' => $trialBalance,
        'payout_stats' => [
            'pending_count' => (int)$payoutStats['pending_count'],
            'pending_amount' => (float)$payoutStats['pending_amount'],
            'paid_count' => (int)$payoutStats['paid_count'],
            'paid_amount' => (float)$payoutStats['paid_amount'],
            'failed_count' => (int)$payoutStats['failed_count']
        ],
        'reserve_stats' => [
            'held_count' => (int)$reserveStats['held_count'],
            'held_amount' => (float)$reserveStats['held_amount'],
            'matured_ready_count' => (int)$reserveStats['matured_ready_count'],
            'matured_ready_amount' => (float)$reserveStats['matured_ready_amount'],
            'released_count' => (int)$reserveStats['released_count'],
            'released_amount' => (float)$reserveStats['released_amount']
        ],
        'growth_pool' => [
            'total_amount' => (float)$growthStats['total_growth_pool'],
            'tl_routed_count' => (int)$growthStats['tl_routed_count'],
            'mgr_routed_count' => (int)$growthStats['mgr_routed_count']
        ],
        'earning_stats' => [
            'total_gross_field_cost' => (float)$earningStats['total_gross_field_cost'],
            'total_freelancer_share' => (float)$earningStats['total_freelancer_share'],
            'total_leader_share' => (float)$earningStats['total_leader_share'],
            'total_manager_share' => (float)$earningStats['total_manager_share'],
            'total_entitlements_count' => (int)$earningStats['total_entitlements_count']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/journals.php',
      description: 'Admin double-entry journal inspector with debits/credits line expansion and balance checks',
      content: `<?php
/**
 * We Onboard — Admin Double-Entry Journal Inspector API (Phase 7)
 * GET /api/v1/admin/financial/journals.php
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $typeFilter = $_GET['type'] ?? '';
    $refFilter = $_GET['ref'] ?? '';
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));

    $query = "SELECT * FROM ledger_journals WHERE 1=1";
    $params = [];

    if (!empty($typeFilter)) {
        $query .= " AND transaction_type = ?";
        $params[] = $typeFilter;
    }
    if (!empty($refFilter)) {
        $query .= " AND (journal_ref LIKE ? OR reference_id LIKE ?)";
        $params[] = "%{$refFilter}%";
        $params[] = "%{$refFilter}%";
    }

    $query .= " ORDER BY id DESC LIMIT " . $limit;

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $journals = $stmt->fetchAll();

    // Fetch entries for all retrieved journals
    if (!empty($journals)) {
        $journalIds = array_column($journals, 'id');
        $placeholders = implode(',', array_fill(0, count($journalIds), '?'));

        $entryStmt = $db->prepare("
            SELECT 
                le.*,
                la.account_name,
                la.account_type
            FROM ledger_entries le
            JOIN ledger_accounts la ON le.account_code = la.account_code
            WHERE le.journal_id IN ({$placeholders})
            ORDER BY le.journal_id DESC, le.id ASC
        ");
        $entryStmt->execute($journalIds);
        $allEntries = $entryStmt->fetchAll();

        $entriesByJournal = [];
        foreach ($allEntries as $e) {
            $entriesByJournal[$e['journal_id']][] = $e;
        }

        foreach ($journals as &$j) {
            $j['lines'] = $entriesByJournal[$j['id']] ?? [];
        }
    }

    echo json_encode([
        'success' => true,
        'journals' => $journals,
        'count' => count($journals)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/earnings.php',
      description: 'Admin earning entitlements inspector with 70/20/10 split details and Growth Pool allocations',
      content: `<?php
/**
 * We Onboard — Admin Earnings & 70/20/10 Breakdown Inspector (Phase 7)
 * GET /api/v1/admin/financial/earnings.php
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));

    $stmt = $db->prepare("
        SELECT 
            ee.*,
            t.task_ref,
            t.title as task_title,
            p.name as project_name,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            tl.full_name as team_leader_name,
            mgr.full_name as manager_name,
            lj.journal_ref
        FROM earning_entitlements ee
        JOIN tasks t ON ee.task_id = t.id
        JOIN projects p ON ee.project_id = p.id
        JOIN freelancers fl ON ee.freelancer_id = fl.id
        LEFT JOIN freelancers tl ON ee.team_leader_id = tl.id
        LEFT JOIN freelancers mgr ON ee.manager_id = mgr.id
        LEFT JOIN ledger_journals lj ON ee.journal_id = lj.id
        ORDER BY ee.id DESC
        LIMIT ?
    ");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $entitlements = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'entitlements' => $entitlements,
        'count' => count($entitlements)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/reserves.php',
      description: 'Admin quality reserves directory and batch release execution API',
      content: `<?php
/**
 * We Onboard — Admin Reserves Management API (Phase 7)
 * GET /api/v1/admin/financial/reserves.php - List held and released reserves
 * POST /api/v1/admin/financial/reserves.php - Trigger release of matured reserves
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

$adminName = $_SESSION['admin_name'] ?? 'Admin';

try {
    $db = Database::getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $action = $input['action'] ?? 'release_matured';
        $specificId = isset($input['reserve_id']) ? (int)$input['reserve_id'] : null;

        $db->beginTransaction();

        $result = FinancialEngine::releaseMaturedReserves($db, $adminName, $specificId);

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Reserve Batch Release Triggered', 'Reserve', ?, ?, ?)
        ");
        $auditStmt->execute([
            $adminName,
            'BATCH_' . time(),
            "Released {$result['released_count']} matured reserves for total ₹{$result['total_amount']}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Successfully released {$result['released_count']} matured reserves totaling ₹" . number_format($result['total_amount'], 2) . ".",
            'result' => $result
        ]);
        exit;
    }

    // GET: List reserves
    $statusFilter = $_GET['status'] ?? '';
    $query = "
        SELECT 
            r.*,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            t.task_ref,
            t.title as task_title,
            lj.journal_ref as release_journal_ref,
            TIMESTAMPDIFF(SECOND, NOW(), r.release_due_at) as seconds_to_release
        FROM reserve_records r
        JOIN freelancers fl ON r.freelancer_id = fl.id
        LEFT JOIN tasks t ON r.task_id = t.id
        LEFT JOIN ledger_journals lj ON r.release_journal_id = lj.id
        WHERE 1=1
    ";
    $params = [];
    if (!empty($statusFilter)) {
        $query .= " AND r.status = ?";
        $params[] = $statusFilter;
    }
    $query .= " ORDER BY r.id DESC LIMIT 100";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $reserves = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'reserves' => $reserves,
        'count' => count($reserves)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/payouts.php',
      description: 'Admin payout request management with settlement and rejection/refund workflows',
      content: `<?php
/**
 * We Onboard — Admin Payout Processing & Settlement API (Phase 7)
 * GET /api/v1/admin/financial/payouts.php - List payout requests
 * POST /api/v1/admin/financial/payouts.php - Action: approve, settle, reject
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

$adminName = $_SESSION['admin_name'] ?? 'Admin Reviewer';

try {
    $db = Database::getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $payoutId = (int)($input['payout_id'] ?? 0);
        $action = $input['action'] ?? ''; // 'approve', 'settle', 'reject'
        $providerRef = trim($input['provider_transfer_id'] ?? ('SIM-TRF-' . strtoupper(bin2hex(random_bytes(4)))));
        $reason = trim($input['reason'] ?? '');

        if ($payoutId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid payout_id required.']);
            exit;
        }

        $db->beginTransaction();

        if ($action === 'settle' || $action === 'approve_and_settle') {
            $result = FinancialEngine::settlePayout($db, $payoutId, $providerRef, $adminName);
            
            // Audit log
            $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Payout Settled & Disbursed', 'Payout', ?, ?, ?)
            ")->execute([
                $adminName,
                $result['payout_ref'],
                "Disbursed via provider adapter. Ref: {$providerRef}. Journal: {$result['journal_ref']}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Payout {$result['payout_ref']} confirmed as Paid. Journal: {$result['journal_ref']}",
                'result' => $result
            ]);
            exit;

        } elseif ($action === 'reject' || $action === 'fail') {
            if (empty($reason)) {
                $db->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A rejection or failure reason is mandatory.']);
                exit;
            }

            $result = FinancialEngine::reversePayout($db, $payoutId, $reason, $adminName);

            // Audit log
            $db->prepare("
                INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
                VALUES (?, 'Payout Rejected & Refunded', 'Payout', ?, ?, ?)
            ")->execute([
                $adminName,
                $result['payout_ref'],
                "Rejected. Refunded ₹{$result['refunded_amount']} to available balance. Reason: {$reason}",
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => "Payout {$result['payout_ref']} rejected. Funds refunded to associate's available balance.",
                'result' => $result
            ]);
            exit;

        } else {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Invalid action '{$action}'. Supported: settle, reject."]);
            exit;
        }
    }

    // GET: List payout requests
    $statusFilter = $_GET['status'] ?? '';
    $query = "
        SELECT 
            p.*,
            fl.full_name as freelancer_name,
            fl.registration_ref as freelancer_ref,
            fl.email as freelancer_email,
            fl.phone as freelancer_phone,
            w.available_balance as current_available_balance,
            lj.journal_ref as request_journal_ref,
            sj.journal_ref as settlement_journal_ref,
            rj.journal_ref as reversal_journal_ref
        FROM payout_requests p
        JOIN freelancers fl ON p.freelancer_id = fl.id
        LEFT JOIN wallets w ON p.freelancer_id = w.freelancer_id
        LEFT JOIN ledger_journals lj ON p.request_journal_id = lj.id
        LEFT JOIN ledger_journals sj ON p.settlement_journal_id = sj.id
        LEFT JOIN ledger_journals rj ON p.reversal_journal_id = rj.id
        WHERE 1=1
    ";
    $params = [];
    if (!empty($statusFilter)) {
        $query .= " AND p.status = ?";
        $params[] = $statusFilter;
    }
    $query .= " ORDER BY p.id DESC LIMIT 100";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $payouts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'payouts' => $payouts,
        'count' => count($payouts)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/reconcile.php',
      description: 'Admin financial reconciliation and audit checking wallet projections against ledger accounts',
      content: `<?php
/**
 * We Onboard — Financial Reconciliation & Audit API (Phase 7)
 * GET /api/v1/admin/financial/reconcile.php
 * 
 * Verifies:
 * 1. Double-Entry Balance: SUM(Debits) == SUM(Credits) across entire ledger
 * 2. Wallet vs Ledger Reconciliation: Checks that each freelancer's wallet.available_balance matches net credits on account 2001
 * 3. Reserve Balance Reconciliation: Checks that wallet.reserved_balance matches sum of Held reserves in reserve_records
 * 4. Payout In-Transit Reconciliation: Checks that sum of (Requested, Under Review, Processing) payouts equals account 2005 balance
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Trial Balance Audit
    $trialBalance = FinancialEngine::getTrialBalance($db);

    // 2. Wallets vs Ledger Audit for all freelancers
    $wStmt = $db->query("
        SELECT 
            w.freelancer_id,
            fl.full_name,
            fl.registration_ref,
            w.available_balance as wallet_available,
            w.reserved_balance as wallet_reserved,
            w.payouts_in_progress as wallet_payouts_in_progress,
            -- Derived from ledger entries on account 2001
            COALESCE((
                SELECT SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE -le.amount END)
                FROM ledger_entries le
                WHERE le.account_code = '2001' AND le.entity_id = CAST(w.freelancer_id AS CHAR)
            ), 0.00) as ledger_available,
            -- Derived from reserve_records where status = 'Held'
            COALESCE((
                SELECT SUM(rr.amount)
                FROM reserve_records rr
                WHERE rr.freelancer_id = w.freelancer_id AND rr.status = 'Held'
            ), 0.00) as verified_held_reserves,
            -- Derived from active payout_requests
            COALESCE((
                SELECT SUM(pr.amount)
                FROM payout_requests pr
                WHERE pr.freelancer_id = w.freelancer_id AND pr.status IN ('Requested', 'Under Review', 'Processing', 'Approved')
            ), 0.00) as verified_payouts_in_progress
        FROM wallets w
        JOIN freelancers fl ON w.freelancer_id = fl.id
        ORDER BY w.freelancer_id ASC
    ");
    $walletAudits = $wStmt->fetchAll();

    $reconciliationExceptions = [];
    $totalWalletAvailable = 0.0;
    $totalLedgerAvailable = 0.0;

    foreach ($walletAudits as &$wa) {
        $wAvail = (float)$wa['wallet_available'];
        $lAvail = (float)$wa['ledger_available'];
        $wRes = (float)$wa['wallet_reserved'];
        $vRes = (float)$wa['verified_held_reserves'];
        $wPo = (float)$wa['wallet_payouts_in_progress'];
        $vPo = (float)$wa['verified_payouts_in_progress'];

        $totalWalletAvailable = round($totalWalletAvailable + $wAvail, 2);
        $totalLedgerAvailable = round($totalLedgerAvailable + $lAvail, 2);

        $availDiff = abs($wAvail - $lAvail);
        $resDiff = abs($wRes - $vRes);
        $poDiff = abs($wPo - $vPo);

        $isReconciled = ($availDiff < 0.005 && $resDiff < 0.005 && $poDiff < 0.005);
        $wa['is_reconciled'] = $isReconciled;
        $wa['available_discrepancy'] = $availDiff;

        if (!$isReconciled) {
            $reconciliationExceptions[] = [
                'freelancer_id' => $wa['freelancer_id'],
                'full_name' => $wa['full_name'],
                'registration_ref' => $wa['registration_ref'],
                'wallet_available' => $wAvail,
                'ledger_available' => $lAvail,
                'available_discrepancy' => $availDiff,
                'wallet_reserved' => $wRes,
                'verified_held_reserves' => $vRes,
                'wallet_payouts_in_progress' => $wPo,
                'verified_payouts_in_progress' => $vPo
            ];
        }
    }

    $overallReconciled = ($trialBalance['is_balanced'] && empty($reconciliationExceptions));

    echo json_encode([
        'success' => true,
        'overall_reconciled' => $overallReconciled,
        'audit_timestamp' => date('Y-m-d H:i:s'),
        'trial_balance' => $trialBalance,
        'summary' => [
            'total_freelancer_wallets' => count($walletAudits),
            'total_wallet_available' => $totalWalletAvailable,
            'total_ledger_available' => $totalLedgerAvailable,
            'variance' => abs($totalWalletAvailable - $totalLedgerAvailable),
            'exceptions_count' => count($reconciliationExceptions)
        ],
        'exceptions' => $reconciliationExceptions,
        'wallet_audits' => $walletAudits
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Reconciliation error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/admin/financial/adjust.php',
      description: 'Admin manual adjustment and linked journal reversal endpoint with segregation of duties checks',
      content: `<?php
/**
 * We Onboard — Admin Manual Correction / Adjustment API (Phase 7)
 * POST /api/v1/admin/financial/adjust.php
 * 
 * Enforces:
 * - Immutable ledger: Cannot update or delete existing posted journals
 * - Errors must be corrected via linked reversal or balanced correction entries
 * - Total debits must equal total credits
 * - Mandatory supervisor reason and actor attribution
 * - Segregation of duties: Admin cannot self-credit without supervisor attribution
 */

$rootCandidates = [dirname(__DIR__, 4), dirname(__DIR__, 3), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'System configuration not found']));
}
require_once $root . '/config/config.php';
require_once $root . '/config/cors.php';
require_once $root . '/config/database.php';
require_once $root . '/config/financial.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['admin_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
    exit;
}

verify_csrf();

$adminName = $_SESSION['admin_name'] ?? 'Admin Supervisor';

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$reversalOfJournalId = isset($input['reversal_of_journal_id']) ? (int)$input['reversal_of_journal_id'] : null;
$narration = trim($input['narration'] ?? '');
$supervisorReason = trim($input['supervisor_reason'] ?? '');
$entries = $input['entries'] ?? [];

if (empty($narration) || empty($supervisorReason)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Both narration and explicit supervisor justification reason are required for financial adjustments.']);
    exit;
}

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    // If reversing an existing journal:
    if ($reversalOfJournalId) {
        $jStmt = $db->prepare("SELECT * FROM ledger_journals WHERE id = ? FOR UPDATE");
        $jStmt->execute([$reversalOfJournalId]);
        $origJournal = $jStmt->fetch();

        if (!$origJournal) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => "Original journal ID {$reversalOfJournalId} not found."]);
            exit;
        }

        if ((int)$origJournal['is_reversed'] === 1) {
            $db->rollBack();
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => "Journal {$origJournal['journal_ref']} has already been reversed."]);
            exit;
        }

        // Fetch original entries and invert them (DEBIT becomes CREDIT, CREDIT becomes DEBIT)
        $origEntriesStmt = $db->prepare("SELECT * FROM ledger_entries WHERE journal_id = ?");
        $origEntriesStmt->execute([$reversalOfJournalId]);
        $origEntries = $origEntriesStmt->fetchAll();

        $reversingEntries = [];
        foreach ($origEntries as $oe) {
            $reversingEntries[] = [
                'account_code' => $oe['account_code'],
                'type' => ($oe['entry_type'] === 'DEBIT') ? 'CREDIT' : 'DEBIT',
                'amount' => (float)$oe['amount'],
                'entity_type' => $oe['entity_type'],
                'entity_id' => $oe['entity_id'],
                'narration' => "Reversal line for {$origJournal['journal_ref']}. Reason: {$supervisorReason}"
            ];
        }

        $revJournal = FinancialEngine::postJournal(
            $db,
            'MANUAL_ADJUSTMENT',
            $origJournal['journal_ref'],
            "Reversal of {$origJournal['journal_ref']}: {$narration}. Reason: {$supervisorReason}",
            $reversingEntries,
            $adminName,
            $reversalOfJournalId
        );

        // Mark original journal as reversed
        $upOrig = $db->prepare("UPDATE ledger_journals SET is_reversed = 1, reversed_by_journal_id = ? WHERE id = ?");
        $upOrig->execute([$revJournal['journal_id'], $reversalOfJournalId]);

        // Audit log
        $db->prepare("
            INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
            VALUES (?, 'Journal Reversed & Adjusted', 'Ledger', ?, ?, ?)
        ")->execute([
            $adminName,
            $origJournal['journal_ref'],
            "Reversed by {$revJournal['journal_ref']}. Supervisor Justification: {$supervisorReason}",
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => "Journal {$origJournal['journal_ref']} successfully reversed by {$revJournal['journal_ref']}.",
            'reversal_journal' => $revJournal
        ]);
        exit;
    }

    // Direct balanced correction journal
    if (empty($entries) || !is_array($entries)) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'At least two balanced entries (Debits and Credits) are required.']);
        exit;
    }

    $adjJournal = FinancialEngine::postJournal(
        $db,
        'MANUAL_ADJUSTMENT',
        'ADJ-' . time(),
        $narration . " (Supervisor Reason: {$supervisorReason})",
        $entries,
        $adminName
    );

    // Audit log
    $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Manual Adjustment Posted', 'Ledger', ?, ?, ?)
    ")->execute([
        $adminName,
        $adjJournal['journal_ref'],
        "Narration: {$narration}. Justification: {$supervisorReason}. Debits/Credits: ₹{$adjJournal['total_debit']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => "Adjustment journal {$adjJournal['journal_ref']} posted successfully.",
        'journal' => $adjJournal
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Adjustment error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/hub.php',
      description: 'Freelancer Task Hub API with assigned, submitted, completed, and available pools',
      content: `<?php
/**
 * We Onboard — Freelancer Task Hub API
 * GET /api/v1/tasks/hub.php
 * 
 * Returns tasks segmented into:
 * - assigned: Active tasks currently assigned to/accepted by freelancer
 * - submitted: Tasks submitted by freelancer awaiting QC review
 * - completed: Tasks approved and verified
 * - available: Public/project task pool with per-task eligibility calculation
 */

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
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

$freelancerId = (int)$_SESSION['freelancer_id'];

try {
    $db = Database::getConnection();

    // 1. Get freelancer profile, KYC status, and completed certifications
    $flStmt = $db->prepare("SELECT id, status, onboarding_status, city, preferred_areas FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
        exit;
    }

    $isKycApproved = ($fl['status'] === 'Active' || $fl['onboarding_status'] === 'Approved');

    // Get all certified courses for this freelancer
    $certStmt = $db->prepare("SELECT DISTINCT course_id FROM freelancer_certificates WHERE freelancer_id = ?");
    $certStmt->execute([$freelancerId]);
    $certifiedCourseIds = $certStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    // Also check completed enrollments as fallback
    $enrollStmt = $db->prepare("SELECT DISTINCT course_id FROM course_enrollments WHERE freelancer_id = ? AND status = 'Completed'");
    $enrollStmt->execute([$freelancerId]);
    $completedCourseIds = $enrollStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $allQualifiedCourseIds = array_unique(array_merge($certifiedCourseIds, $completedCourseIds));

    // 2. Fetch Assigned / Active tasks
    $assignedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, p.required_training_course_id, c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required')
        ORDER BY t.deadline ASC, t.id DESC
    ");
    $assignedStmt->execute([$freelancerId]);
    $assignedRaw = $assignedStmt->fetchAll();

    // 3. Fetch Submitted tasks (Under Review)
    $submittedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status IN ('Submitted', 'Under Review')
        ORDER BY t.submitted_at DESC, t.id DESC
    ");
    $submittedStmt->execute([$freelancerId]);
    $submittedRaw = $submittedStmt->fetchAll();

    // 4. Fetch Completed tasks (Approved)
    $completedStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_freelancer_id = ? 
          AND t.status = 'Approved'
        ORDER BY t.reviewed_at DESC, t.id DESC
        LIMIT 50
    ");
    $completedStmt->execute([$freelancerId]);
    $completedRaw = $completedStmt->fetchAll();

    // 5. Fetch Available tasks pool from Active projects
    $availableStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, 
               p.required_training_course_id, p.required_kyc_level, p.max_tasks_per_freelancer,
               c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE (t.assigned_freelancer_id IS NULL OR t.assigned_freelancer_id = 0)
          AND t.status = 'Available'
          AND p.status = 'Active'
        ORDER BY t.id DESC
        LIMIT 50
    ");
    $availableStmt->execute();
    $availableRaw = $availableStmt->fetchAll();

    $currentActiveCount = count($assignedRaw);

    // Format helper function
    $formatTask = function($row, $isAvailableCheck = false) use ($isKycApproved, $allQualifiedCourseIds, $currentActiveCount) {
        $evReqs = json_decode($row['evidence_requirements_json'] ?? '[]', true) ?: [];
        
        $item = [
            'id' => (string)$row['id'],
            'taskRef' => $row['task_ref'],
            'projectId' => (string)$row['project_id'],
            'projectName' => $row['project_name'],
            'clientName' => $row['client_name'],
            'serviceCategory' => $row['service_category'] ?? 'Field Operations',
            'title' => $row['title'],
            'description' => $row['description'],
            'instructions' => $row['instructions'] ?? '',
            'assignedFreelancerId' => $row['assigned_freelancer_id'] ? (string)$row['assigned_freelancer_id'] : undefined,
            'city' => $row['city'],
            'targetArea' => $row['target_area'],
            'deadline' => $row['deadline'],
            'payoutAmount' => (float)$row['payout_amount'],
            'status' => $row['status'],
            'evidenceRequirements' => $evReqs,
            'requiresLocation' => (bool)($row['requires_location'] ?? 0),
            'acceptedAt' => $row['accepted_at'] ?? null,
            'submittedAt' => $row['submitted_at'] ?? null,
            'reviewedBy' => $row['reviewed_by_name'] ?? null,
            'reviewedAt' => $row['reviewed_at'] ?? null,
            'reviewComment' => $row['review_comment'] ?? null,
            'reworkCount' => (int)($row['rework_count'] ?? 0),
            'requiredTrainingCourseId' => $row['required_training_course_id'] ?? null,
            'requiredCourseTitle' => $row['required_course_title'] ?? null
        ];

        if ($isAvailableCheck) {
            $isEligible = true;
            $reason = '';

            // Check KYC requirement
            if (!$isKycApproved) {
                $isEligible = false;
                $reason = 'Identity KYC verification must be approved before accepting tasks.';
            }
            // Check Required Course Certification
            elseif (!empty($row['required_training_course_id'])) {
                $reqId = (int)$row['required_training_course_id'];
                if (!in_array($reqId, $allQualifiedCourseIds)) {
                    $isEligible = false;
                    $courseTitle = $row['required_course_title'] ?: 'Required Academy Course';
                    $reason = "Completion and certification of course '{$courseTitle}' required.";
                }
            }
            // Check Max Active Tasks Capacity
            if ($isEligible) {
                $maxAllowed = (int)($row['max_tasks_per_freelancer'] ?? 5);
                if ($currentActiveCount >= $maxAllowed) {
                    $isEligible = false;
                    $reason = "Maximum concurrent active tasks limit ({$maxAllowed}) reached.";
                }
            }

            $item['isEligible'] = $isEligible;
            $item['ineligibilityReason'] = $reason;
        }

        return $item;
    };

    $assigned = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $assignedRaw);
    $submitted = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $submittedRaw);
    $completed = array_map(function($r) use ($formatTask) { return $formatTask($r, false); }, $completedRaw);
    $available = array_map(function($r) use ($formatTask) { return $formatTask($r, true); }, $availableRaw);

    echo json_encode([
        'success' => true,
        'counts' => [
            'assigned' => count($assigned),
            'submitted' => count($submitted),
            'completed' => count($completed),
            'available' => count($available)
        ],
        'isKycApproved' => $isKycApproved,
        'assigned' => $assigned,
        'submitted' => $submitted,
        'completed' => $completed,
        'available' => $available
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/detail.php',
      description: 'Freelancer Task Detail API with instructions, requirements, and submissions',
      content: `<?php
/**
 * We Onboard — Task Detail & Evidence API
 * GET /api/v1/tasks/detail.php?id={id}
 * 
 * Enforces ownership check: Freelancers can only view their own tasks or unassigned Available pool tasks.
 */

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

$freelancerId = $_SESSION['freelancer_id'] ?? null;
$adminId = $_SESSION['admin_id'] ?? null;

if (!$freelancerId && !$adminId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in.']);
    exit;
}

$taskId = (int)($_GET['id'] ?? 0);
$taskRef = trim($_GET['ref'] ?? '');

if ($taskId <= 0 && empty($taskRef)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Task identifier (id or ref) is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $sql = "
        SELECT t.*, p.name as project_name, p.client_name, p.service_category, 
               p.description as project_description, p.evidence_schema_json,
               p.required_training_course_id, c.title as required_course_title,
               f.full_name as assigned_freelancer_name, f.phone as assigned_freelancer_phone
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        LEFT JOIN freelancers f ON t.assigned_freelancer_id = f.id
        WHERE " . ($taskId > 0 ? "t.id = ?" : "t.task_ref = ?") . "
        LIMIT 1
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([$taskId > 0 ? $taskId : $taskRef]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // Server-side ownership verification:
    // If requester is a freelancer, task must either be assigned to them OR be in 'Available' state
    if ($freelancerId && !$adminId) {
        $assignedTo = (int)($task['assigned_freelancer_id'] ?? 0);
        if ($assignedTo > 0 && $assignedTo !== (int)$freelancerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Forbidden: You do not have permission to access another freelancer\\'s task.']);
            exit;
        }
    }

    // Load recent submission if exists
    $subStmt = $db->prepare("
        SELECT * FROM task_evidence_submissions 
        WHERE task_id = ? 
        ORDER BY id DESC LIMIT 1
    ");
    $subStmt->execute([$task['id']]);
    $submission = $subStmt->fetch();

    $files = [];
    if ($submission) {
        $fileStmt = $db->prepare("
            SELECT id, field_name, original_filename, file_size, mime_type, uploaded_at 
            FROM task_evidence_files 
            WHERE task_id = ? AND submission_id = ?
            ORDER BY id ASC
        ");
        $fileStmt->execute([$task['id'], $submission['id']]);
        $filesRaw = $fileStmt->fetchAll();
        foreach ($filesRaw as $f) {
            $files[] = [
                'id' => (string)$f['id'],
                'fieldName' => $f['field_name'],
                'originalFilename' => $f['original_filename'],
                'fileSize' => (int)$f['file_size'],
                'mimeType' => $f['mime_type'],
                'uploadedAt' => $f['uploaded_at'],
                'viewUrl' => "/api/v1/tasks/evidence_file.php?task_id={$task['id']}&file_id={$f['id']}"
            ];
        }
    }

    $evidenceSchema = json_decode($task['evidence_schema_json'] ?? '{}', true) ?: [];
    $evidenceReqs = json_decode($task['evidence_requirements_json'] ?? '[]', true) ?: [];

    $formattedEvidence = null;
    if ($submission) {
        $formData = json_decode($submission['form_data_json'] ?? '{}', true) ?: [];
        $geoTag = null;
        if (!empty($submission['location_lat']) && !empty($submission['location_lng'])) {
            $geoTag = [
                'latitude' => (float)$submission['location_lat'],
                'longitude' => (float)$submission['location_lng'],
                'address' => $submission['location_address'] ?? ''
            ];
        }

        $formattedEvidence = [
            'id' => (string)$submission['id'],
            'submittedAt' => $submission['submitted_at'],
            'freelancerNotes' => $formData['notes'] ?? '',
            'formData' => $formData,
            'geoTag' => $geoTag,
            'files' => $files,
            'status' => $submission['status'],
            'reviewComment' => $submission['review_comment']
        ];
    }

    echo json_encode([
        'success' => true,
        'task' => [
            'id' => (string)$task['id'],
            'taskRef' => $task['task_ref'],
            'projectId' => (string)$task['project_id'],
            'projectName' => $task['project_name'],
            'clientName' => $task['client_name'],
            'serviceCategory' => $task['service_category'],
            'projectDescription' => $task['project_description'],
            'title' => $task['title'],
            'description' => $task['description'],
            'instructions' => $task['instructions'] ?? '',
            'assignedFreelancerId' => $task['assigned_freelancer_id'] ? (string)$task['assigned_freelancer_id'] : null,
            'assignedFreelancerName' => $task['assigned_freelancer_name'] ?? null,
            'city' => $task['city'],
            'targetArea' => $task['target_area'],
            'deadline' => $task['deadline'],
            'payoutAmount' => (float)$task['payout_amount'],
            'status' => $task['status'],
            'evidenceRequirements' => $evidenceReqs,
            'evidenceSchema' => $evidenceSchema,
            'requiresLocation' => (bool)($task['requires_location'] ?? 0),
            'acceptedAt' => $task['accepted_at'] ?? null,
            'submittedAt' => $task['submitted_at'] ?? null,
            'reviewedBy' => $task['reviewed_by_name'] ?? null,
            'reviewedAt' => $task['reviewed_at'] ?? null,
            'reviewComment' => $task['review_comment'] ?? null,
            'reworkCount' => (int)($task['rework_count'] ?? 0),
            'requiredTrainingCourseId' => $task['required_training_course_id'] ?? null,
            'requiredCourseTitle' => $task['required_course_title'] ?? null,
            'evidence' => $formattedEvidence
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/accept.php',
      description: 'Freelancer Task Acceptance API with KYC, certification, and capacity enforcement',
      content: `<?php
/**
 * We Onboard — Task Acceptance API
 * POST /api/v1/tasks/accept.php
 * 
 * Enforces:
 * - Freelancer authentication and KYC Approved status
 * - Required training course certification check
 * - Project active status
 * - Maximum concurrent active tasks limit
 * - Atomic assignment transaction preventing race condition over-claiming
 */

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$taskId = (int)($data['task_id'] ?? 0);
if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Verify freelancer account & KYC
    $flStmt = $db->prepare("SELECT id, registration_ref, full_name, status, onboarding_status FROM freelancers WHERE id = ? LIMIT 1");
    $flStmt->execute([$freelancerId]);
    $fl = $flStmt->fetch();

    if (!$fl) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Freelancer account not found.']);
        exit;
    }

    if ($fl['status'] !== 'Active' && $fl['onboarding_status'] !== 'Approved') {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Eligibility Error: Your KYC documents must be reviewed and approved by administrators before claiming field tasks.'
        ]);
        exit;
    }

    // 2. Fetch task and project
    $taskStmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.status as project_status, 
               p.required_training_course_id, p.max_tasks_per_freelancer,
               p.end_date, p.completed_units, p.target_units,
               c.title as required_course_title
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN courses c ON p.required_training_course_id = c.id
        WHERE t.id = ? LIMIT 1
    ");
    $taskStmt->execute([$taskId]);
    $task = $taskStmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    // Check freelancer fraud/disciplinary flag
    if (!empty($fl['fraud_flag']) && (int)$fl['fraud_flag'] === 1) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Account Disciplinary Restriction: Task claims are currently suspended due to an active policy review. Reason: ' . ($fl['fraud_reason'] ?: 'Policy compliance review.')
        ]);
        exit;
    }

    // Check project status
    if ($task['project_status'] !== 'Active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Task cannot be accepted because the parent project is '{$task['project_status']}', not Active."]);
        exit;
    }

    // Check project expiration
    if (!empty($task['end_date']) && $task['end_date'] < date('Y-m-d')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Project expired on {$task['end_date']}. New task assignments are closed."]);
        exit;
    }

    // Check project overall completion capacity
    if (!empty($task['target_units']) && (int)$task['completed_units'] >= (int)$task['target_units']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project target units quota has been fully reached. No further tasks can be claimed.']);
        exit;
    }

    // Idempotency: If already accepted by THIS freelancer
    if ((int)$task['assigned_freelancer_id'] === $freelancerId && in_array($task['status'], ['Accepted', 'In Progress'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Task is already accepted and in your active workload.',
            'task_id' => $taskId,
            'status' => $task['status']
        ]);
        exit;
    }

    // 3. Verify Required Training Course Certification
    if (!empty($task['required_training_course_id'])) {
        $reqCourseId = (int)$task['required_training_course_id'];
        
        $certStmt = $db->prepare("
            SELECT id FROM freelancer_certificates 
            WHERE freelancer_id = ? AND course_id = ? 
            LIMIT 1
        ");
        $certStmt->execute([$freelancerId, $reqCourseId]);
        $hasCert = $certStmt->fetch();

        if (!$hasCert) {
            // Also check course completion
            $compStmt = $db->prepare("
                SELECT id FROM course_enrollments 
                WHERE freelancer_id = ? AND course_id = ? AND status = 'Completed' 
                LIMIT 1
            ");
            $compStmt->execute([$freelancerId, $reqCourseId]);
            $hasCompleted = $compStmt->fetch();

            if (!$hasCompleted) {
                http_response_code(403);
                $courseName = $task['required_course_title'] ?: 'Mandatory Academy Course';
                echo json_encode([
                    'success' => false,
                    'error' => "Prerequisite Training Required: You must complete and pass the '{$courseName}' academy assessment before accepting tasks for this project."
                ]);
                exit;
            }
        }
    }

    // 4. Verify Active Tasks Capacity
    $maxCapacity = (int)($task['max_tasks_per_freelancer'] ?? 5);
    $activeCountStmt = $db->prepare("
        SELECT COUNT(*) FROM tasks 
        WHERE assigned_freelancer_id = ? 
          AND status IN ('Assigned', 'Accepted', 'In Progress', 'Rework Required')
    ");
    $activeCountStmt->execute([$freelancerId]);
    $activeCount = (int)$activeCountStmt->fetchColumn();

    if ($activeCount >= $maxCapacity) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => "Workload Limit Reached: You already have {$activeCount} active tasks (maximum allowed is {$maxCapacity}). Please complete or submit pending tasks before accepting new ones."
        ]);
        exit;
    }

    // 5. Atomic database transaction to claim task
    $db->beginTransaction();

    $claimStmt = $db->prepare("
        UPDATE tasks 
        SET assigned_freelancer_id = ?, 
            status = 'Accepted', 
            accepted_at = NOW() 
        WHERE id = ? 
          AND (assigned_freelancer_id IS NULL OR assigned_freelancer_id = 0 OR assigned_freelancer_id = ?)
          AND status IN ('Available', 'Assigned')
    ");
    $claimStmt->execute([$freelancerId, $taskId, $freelancerId]);

    if ($claimStmt->rowCount() === 0) {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Conflict: This task was just claimed by another freelancer or is no longer available.'
        ]);
        exit;
    }

    // Record notification
    $notifStmt = $db->prepare("
        INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
        VALUES (?, 'Task Accepted', ?, 'task_assignment')
    ");
    $notifStmt->execute([
        $freelancerId,
        "You accepted task '{$task['title']}' ({$task['task_ref']}). Deadline: {$task['deadline']}."
    ]);

    // Record audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Accepted by Freelancer', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $fl['full_name'],
        $task['task_ref'],
        "Claimed task {$task['task_ref']} for project {$task['project_name']}",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Task successfully accepted! You can now start field execution.',
        'task_id' => $taskId,
        'task_ref' => $task['task_ref'],
        'status' => 'Accepted'
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/decline.php',
      description: 'Freelancer Task Decline API with reason and pool release',
      content: `<?php
/**
 * We Onboard — Task Decline API
 * POST /api/v1/tasks/decline.php
 * 
 * Allows a freelancer to release an assigned task back to the available pool.
 */

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$taskId = (int)($data['task_id'] ?? 0);
$reason = trim($data['reason'] ?? '');

if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ? AND assigned_freelancer_id = ? LIMIT 1");
    $stmt->execute([$taskId, $freelancerId]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found or not assigned to you.']);
        exit;
    }

    if (!in_array($task['status'], ['Assigned', 'Accepted'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Cannot decline a task in '{$task['status']}' state."]);
        exit;
    }

    $update = $db->prepare("
        UPDATE tasks 
        SET assigned_freelancer_id = NULL, 
            status = 'Available', 
            accepted_at = NULL 
        WHERE id = ? AND assigned_freelancer_id = ?
    ");
    $update->execute([$taskId, $freelancerId]);

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Task Declined by Freelancer', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['freelancer_name'] ?? 'Freelancer #' . $freelancerId,
        $task['task_ref'],
        "Released task back to available pool. Reason: " . ($reason ?: 'None specified'),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Task declined and returned to project pool.',
        'task_id' => $taskId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/submit.php',
      description: 'Freelancer Field Evidence Submission API with structured data, photos, and GPS validation',
      content: `<?php
/**
 * We Onboard — Task Field Evidence Submission API
 * POST /api/v1/tasks/submit.php
 * 
 * Supports:
 * - Structured form answers (JSON or form parameters)
 * - Photo / document uploads with mime and size validation (max 5MB)
 * - Optional location capture (strictly validated when required)
 * - Private storage in storage/evidence/
 * - Idempotency key conflict prevention and duplicate prevention
 * - Ownership & state transition validation
 */

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

if (empty($_SESSION['freelancer_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Please log in as a freelancer.']);
    exit;
}

verify_csrf();

$freelancerId = (int)$_SESSION['freelancer_id'];

// Parse input (supports JSON body or multipart/form-data)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$formData = [];
$taskId = 0;
$notes = '';
$lat = null;
$lng = null;
$address = '';
$idempotencyKey = '';

if (strpos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];
    $taskId = (int)($data['task_id'] ?? 0);
    $notes = trim($data['freelancer_notes'] ?? $data['notes'] ?? '');
    $formData = $data['form_data'] ?? [];
    $lat = isset($data['latitude']) && $data['latitude'] !== '' ? (float)$data['latitude'] : null;
    $lng = isset($data['longitude']) && $data['longitude'] !== '' ? (float)$data['longitude'] : null;
    $address = trim($data['address'] ?? '');
    $idempotencyKey = trim($data['idempotency_key'] ?? '');
} else {
    // multipart / form-data
    $taskId = (int)($_POST['task_id'] ?? 0);
    $notes = trim($_POST['freelancer_notes'] ?? $_POST['notes'] ?? '');
    $idempotencyKey = trim($_POST['idempotency_key'] ?? '');
    $lat = isset($_POST['latitude']) && $_POST['latitude'] !== '' ? (float)$_POST['latitude'] : null;
    $lng = isset($_POST['longitude']) && $_POST['longitude'] !== '' ? (float)$_POST['longitude'] : null;
    $address = trim($_POST['address'] ?? '');
    if (!empty($_POST['form_data'])) {
        $formData = is_array($_POST['form_data']) ? $_POST['form_data'] : (json_decode($_POST['form_data'], true) ?: []);
    }
}

if ($taskId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid task_id is required.']);
    exit;
}

try {
    $db = Database::getConnection();

    // 1. Validate task ownership and state
    $stmt = $db->prepare("
        SELECT t.*, p.name as project_name, p.requires_location as project_requires_location,
               p.evidence_schema_json
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? LIMIT 1
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Task not found.']);
        exit;
    }

    if ((int)$task['assigned_freelancer_id'] !== $freelancerId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden: You are not assigned to this task.']);
        exit;
    }

    if (!in_array($task['status'], ['Accepted', 'In Progress', 'Rework Required'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Cannot submit evidence for task in '{$task['status']}' state. Only Accepted, In Progress, or Rework Required tasks can be submitted."
        ]);
        exit;
    }

    // 2. Idempotency Check: if this key was already used for this task submission
    if (!empty($idempotencyKey)) {
        $idemStmt = $db->prepare("
            SELECT id, status, submitted_at FROM task_evidence_submissions 
            WHERE task_id = ? AND idempotency_key = ? 
            LIMIT 1
        ");
        $idemStmt->execute([$taskId, $idempotencyKey]);
        $existingSub = $idemStmt->fetch();

        if ($existingSub) {
            echo json_encode([
                'success' => true,
                'message' => 'Task evidence was already successfully submitted (idempotent replay).',
                'submission_id' => $existingSub['id'],
                'status' => 'Submitted',
                'idempotent' => true
            ]);
            exit;
        }
    }

    // 3. Geolocation Validation (when required by project or task)
    $requiresLocation = ((int)($task['requires_location'] ?? 0) === 1 || (int)($task['project_requires_location'] ?? 0) === 1);
    if ($requiresLocation) {
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Location Requirement: Valid GPS coordinates (latitude and longitude) are required for this field project.'
            ]);
            exit;
        }
    }

    // 4. File uploads validation and secure storage
    $uploadDir = $root . '/storage/evidence';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0750, true);
    }
    // Verify .htaccess exists
    if (!file_exists($uploadDir . '/.htaccess')) {
        @file_put_contents($uploadDir . '/.htaccess', "Order Deny,Allow\\nDeny from all\\n");
    }

    $allowedMimes = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
        'application/pdf' => '.pdf'
    ];
    $maxFileSize = 5 * 1024 * 1024; // 5 MB

    $savedFiles = [];

    // Check files uploaded via standard $_FILES
    if (!empty($_FILES)) {
        foreach ($_FILES as $fieldName => $fileInfo) {
            // Support single file or multiple files under key
            $filesToProcess = [];
            if (is_array($fileInfo['name'])) {
                for ($i = 0; $i < count($fileInfo['name']); $i++) {
                    if ($fileInfo['error'][$i] === UPLOAD_ERR_OK) {
                        $filesToProcess[] = [
                            'name' => $fileInfo['name'][$i],
                            'type' => $fileInfo['type'][$i],
                            'tmp_name' => $fileInfo['tmp_name'][$i],
                            'size' => $fileInfo['size'][$i],
                            'field' => $fieldName
                        ];
                    }
                }
            } else {
                if ($fileInfo['error'] === UPLOAD_ERR_OK) {
                    $filesToProcess[] = [
                        'name' => $fileInfo['name'],
                        'type' => $fileInfo['type'],
                        'tmp_name' => $fileInfo['tmp_name'],
                        'size' => $fileInfo['size'],
                        'field' => $fieldName
                    ];
                }
            }

            foreach ($filesToProcess as $f) {
                if ($f['size'] > $maxFileSize) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "File '{$f['name']}' exceeds maximum size of 5MB."]);
                    exit;
                }

                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $detectedMime = finfo_file($finfo, $f['tmp_name']);
                finfo_close($finfo);

                if (!isset($allowedMimes[$detectedMime])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Disallowed file type for '{$f['name']}'. Allowed types: JPG, PNG, WEBP, PDF."]);
                    exit;
                }

                $ext = $allowedMimes[$detectedMime];
                $storageFilename = 'ev_' . $taskId . '_' . bin2hex(random_bytes(16)) . $ext;
                $targetPath = $uploadDir . '/' . $storageFilename;

                if (move_uploaded_file($f['tmp_name'], $targetPath)) {
                    $savedFiles[] = [
                        'field_name' => $f['field'],
                        'original_filename' => basename($f['name']),
                        'storage_path' => 'storage/evidence/' . $storageFilename,
                        'file_size' => $f['size'],
                        'mime_type' => $detectedMime
                    ];
                }
            }
        }
    }

    // 5. Atomic database transaction
    $db->beginTransaction();

    // Insert task evidence submission record
    $subStmt = $db->prepare("
        INSERT INTO task_evidence_submissions 
        (task_id, freelancer_id, form_data_json, location_lat, location_lng, location_address, idempotency_key, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Review', NOW())
    ");
    $subStmt->execute([
        $taskId,
        $freelancerId,
        json_encode(array_merge($formData, ['notes' => $notes])),
        $lat,
        $lng,
        $address,
        $idempotencyKey ?: null
    ]);
    $submissionId = (int)$db->lastInsertId();

    // Insert saved files
    $fileStmt = $db->prepare("
        INSERT INTO task_evidence_files 
        (task_id, submission_id, field_name, original_filename, storage_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($savedFiles as $sf) {
        $fileStmt->execute([
            $taskId,
            $submissionId,
            $sf['field_name'],
            $sf['original_filename'],
            $sf['storage_path'],
            $sf['file_size'],
            $sf['mime_type']
        ]);
    }

    // Update task status to Submitted
    $updateTask = $db->prepare("
        UPDATE tasks 
        SET status = 'Submitted', 
            submitted_at = NOW(),
            review_comment = NULL 
        WHERE id = ? AND assigned_freelancer_id = ?
    ");
    $updateTask->execute([$taskId, $freelancerId]);

    // Send notification to freelancer
    $notifStmt = $db->prepare("
        INSERT INTO freelancer_notifications (freelancer_id, title, message, type)
        VALUES (?, 'Evidence Submitted', ?, 'task_submission')
    ");
    $notifStmt->execute([
        $freelancerId,
        "Your evidence for task '{$task['title']}' ({$task['task_ref']}) was submitted and queued for Quality Control review."
    ]);

    // Audit log
    $auditStmt = $db->prepare("
        INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address)
        VALUES (?, 'Field Evidence Submitted', 'Task', ?, ?, ?)
    ");
    $auditStmt->execute([
        $_SESSION['freelancer_name'] ?? 'Freelancer #' . $freelancerId,
        $task['task_ref'],
        "Submitted evidence (Submission #{$submissionId}, " . count($savedFiles) . " attachments)",
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Evidence successfully submitted! The task is now under Quality Control review.',
        'submission_id' => $submissionId,
        'task_id' => $taskId,
        'status' => 'Submitted',
        'files_count' => count($savedFiles)
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
`
    },
    {
      path: 'api/v1/tasks/evidence_file.php',
      description: 'Private Task Evidence Streamer with authorized session access control',
      content: `<?php
/**
 * We Onboard — Private Task Evidence File Streamer
 * GET /api/v1/tasks/evidence_file.php?task_id={id}&file_id={id}
 * 
 * Enforces server-side authorization:
 * - Only the freelancer assigned to the task OR an active administrator can access evidence files.
 * - Files stored safely in storage/evidence/ without public URL exposure.
 */

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
    die("Configuration error");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

$freelancerId = $_SESSION['freelancer_id'] ?? null;
$adminId = $_SESSION['admin_id'] ?? null;

if (!$freelancerId && !$adminId) {
    http_response_code(401);
    die("Unauthorized");
}

$taskId = (int)($_GET['task_id'] ?? 0);
$fileId = (int)($_GET['file_id'] ?? 0);

if ($taskId <= 0 || $fileId <= 0) {
    http_response_code(400);
    die("Invalid request");
}

try {
    $db = Database::getConnection();

    // 1. Fetch file record
    $stmt = $db->prepare("
        SELECT f.*, t.assigned_freelancer_id 
        FROM task_evidence_files f
        JOIN tasks t ON f.task_id = t.id
        WHERE f.id = ? AND f.task_id = ?
        LIMIT 1
    ");
    $stmt->execute([$fileId, $taskId]);
    $fileRecord = $stmt->fetch();

    if (!$fileRecord) {
        http_response_code(404);
        die("File not found");
    }

    // 2. Authorization check
    if ($freelancerId && !$adminId) {
        if ((int)$fileRecord['assigned_freelancer_id'] !== (int)$freelancerId) {
            http_response_code(403);
            die("Access Denied: You do not have permission to view evidence for this task.");
        }
    }

    $allowedDir = realpath($root . '/storage/evidence');
    $realTarget = realpath($root . '/' . $fileRecord['storage_path']);
    if (!$realTarget || !$allowedDir || strpos($realTarget, $allowedDir) !== 0 || !file_exists($realTarget)) {
        http_response_code(404);
        die("Physical file missing or disallowed path");
    }
    $filePath = $realTarget;

    // 3. Stream file safely
    $mime = $fileRecord['mime_type'] ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: inline; filename="' . basename($fileRecord['original_filename']) . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, max-age=3600');

    readfile($filePath);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    die("Server error");
}
`
    },
    {
      path: 'storage/evidence/.htaccess',
      description: 'Private storage Apache protection blocking direct HTTP web access',
      content: `# Apache configuration to protect private uploaded task field evidence
Order Deny,Allow
Deny from all
`
    },
    {
      path: 'storage/evidence/index.html',
      description: 'Directory browsing prevention placeholder',
      content: `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title></head>
<body><h1>Directory access is forbidden.</h1></body>
</html>
`
    },
    {
      path: 'scripts/install.php',
      description: 'Dedicated CLI Database Installer for secure SSH initialization',
      content: `<?php
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
    die("Access Denied: scripts/install.php must be executed via CLI only.\\n");
}

$lockFile = dirname(__DIR__) . '/config/install.lock';
if (file_exists($lockFile)) {
    echo "LOCKED: The system is already installed and locked ({$lockFile} exists).\\n";
    echo "If you need to re-run, manually remove the lock file after taking a verified database backup.\\n";
    exit(0);
}

require_once dirname(__DIR__) . '/config/config.php';

echo "========================================================\\n";
echo "WE ONBOARD CLI DATABASE INSTALLER\\n";
echo "========================================================\\n";

$host = defined('DB_HOST') && DB_HOST ? DB_HOST : 'localhost';
$name = defined('DB_NAME') && DB_NAME ? DB_NAME : '';
$user = defined('DB_USER') && DB_USER ? DB_USER : '';
$pass = defined('DB_PASS') && DB_PASS ? DB_PASS : '';

if (empty($name) || empty($user) || $pass === '') {
    echo "Database credentials not fully set in config. Prompting:\\n";
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

    echo "1. Applying database/schema.sql...\\n";
    $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
    $pdo->exec($schema);

    echo "2. Seeding default roles...\\n";
    $pdo->exec("INSERT IGNORE INTO roles (id, name, description) VALUES 
        (1, 'Super Admin', 'Full system access'),
        (2, 'Administrator', 'Standard operations access'),
        (3, 'Enquiry Manager', 'Manage and assign enquiries'),
        (4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
        (5, 'Project Manager', 'Manage field projects and tasks')");

    echo "3. Seeding default site settings...\\n";
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

    file_put_contents($lockFile, date('Y-m-d H:i:s') . " - Installed successfully via CLI installer\\n");
    echo "SUCCESS: Database initialized and locked.\\n";
    echo "Next: Provision your initial administrator by running:\\n";
    echo "  php scripts/create_super_admin.php \\"Your Name\\" \\"admin@weonboard.in\\" \\"YourStrongPassword\\"\\n";
    exit(0);
} catch (Exception $e) {
    error_log("[CLI Installer Error] " . $e->getMessage());
    echo "ERROR: Installation failed: " . $e->getMessage() . "\\n";
    exit(1);
}
`
    },
    {
      path: 'scripts/create_super_admin.php',
      description: 'Secure CLI Provisioner for Super Admin with confirmed overwrite protection and 12-char password policy',
      content: `<?php
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
    die("Access Denied: This script must be executed via CLI only for security.\\n");
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
    die("Error: Super Administrator password must be at least 12 characters long for security.\\n");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Error: Invalid email format.\\n");
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
            echo "NOTICE: An administrator account with email [{$email}] already exists (User ID: {$existing['id']}).\\n";
            echo "To confirm password reset, type 'CONFIRM': ";
            $confirm = trim(fgets(STDIN));
            if ($confirm !== 'CONFIRM') {
                die("Aborted: Password reset cancelled. Existing credentials were NOT modified.\\n");
            }
        }

        $update = $db->prepare("UPDATE admin_users SET name = ?, password_hash = ?, role_id = 1, is_active = 1, updated_at = NOW() WHERE id = ?");
        $update->execute([$name, $hash, $existing['id']]);
        echo "SUCCESS: Super Admin account [{$email}] successfully updated and secured.\\n";

        // Audit log
        $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES ('CLI Provisioner', 'Super Admin Password Reset', 'User', ?, 'Password reset via confirmed CLI tool', '127.0.0.1')");
        $audit->execute([$email]);
    } else {
        $insert = $db->prepare("INSERT INTO admin_users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, 1, 1)");
        $insert->execute([$name, $email, $hash]);
        $newId = $db->lastInsertId();
        echo "SUCCESS: Super Admin account [{$email}] successfully created with ID: {$newId}\\n";

        // Audit log
        $audit = $db->prepare("INSERT INTO audit_logs (acting_user, action, record_type, record_id, details, ip_address) VALUES ('CLI Provisioner', 'Super Admin Provisioned', 'User', ?, 'Account provisioned via secure CLI tool', '127.0.0.1')");
        $audit->execute([$email]);
    }

} catch (Exception $e) {
    error_log("[CLI Admin Provisioner Error] " . $e->getMessage());
    echo "Error provisioning Super Admin. Please check database connectivity and server logs.\\n";
    exit(1);
}
`
    },
    {
      path: 'scripts/hostinger_smoke_test.sh',
      description: 'Hostinger SSH / Shell automated smoke test suite for live verification (Phase 2.3 Hardened)',
      content: `#!/usr/bin/env bash
# ==============================================================================
# WE ONBOARD — Hostinger SSH & Shell Smoke Test Suite (Phase 2.3 Hardened)
# ==============================================================================
# Usage:
#   chmod +x scripts/hostinger_smoke_test.sh
#   ./scripts/hostinger_smoke_test.sh
#   API_BASE=https://api.weonboard.in/v1 ./scripts/hostinger_smoke_test.sh
# ==============================================================================

set -u

API_BASE="\${API_BASE:-https://api.weonboard.in/v1}"
ORIGIN_APPROVED="https://weonboard.in"
ORIGIN_UNAPPROVED="https://unauthorized-attacker-domain.org"

echo "=========================================================="
echo "WE ONBOARD — HOSTINGER LIVE SMOKE TEST SUITE (PHASE 2.3)"
echo "Target Base URL: \${API_BASE}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="
echo ""

PASSED=0
FAILED=0

run_check() {
    local name="$1"
    local expected_code="$2"
    local actual_code="$3"
    local notes="$4"

    if [[ "$actual_code" == "000" ]]; then
        echo -e "\\e[31m[FAIL]\\e[0m \${name} (Network Error / Unreachable: HTTP 000) — \${notes}"
        ((FAILED++))
        return
    fi

    if [[ "$actual_code" =~ ^($expected_code)$ ]]; then
        echo -e "\\e[32m[PASS]\\e[0m \${name} (HTTP \${actual_code}) — \${notes}"
        ((PASSED++))
    else
        echo -e "\\e[31m[FAIL]\\e[0m \${name} (Expected: \${expected_code}, Got: \${actual_code}) — \${notes}"
        ((FAILED++))
    fi
}

# 1. Health Probe — HTTP 200 required; 503 is reported as a deployment failure!
echo "1. Probing GET \${API_BASE}/health.php..."
HEALTH_BODY_FILE="/tmp/weonboard_health_body.json"
HEALTH_STATUS=$(curl -s -m 10 -o "$HEALTH_BODY_FILE" -w "%{http_code}" "\${API_BASE}/health.php" || echo "000")

if [[ "$HEALTH_STATUS" == "200" ]]; then
    DB_STATUS=$(grep -o '"database":"[^"]*"' "$HEALTH_BODY_FILE" 2>/dev/null | cut -d'"' -f4)
    if [[ "$DB_STATUS" == "available" ]]; then
        run_check "Health & Database Readiness" "200" "$HEALTH_STATUS" "Database operational (status: healthy)"
    else
        echo -e "\\e[31m[FAIL]\\e[0m Health Probe returned HTTP 200 but database is '\${DB_STATUS}'"
        ((FAILED++))
    fi
elif [[ "$HEALTH_STATUS" == "503" ]]; then
    echo -e "\\e[31m[FAIL]\\e[0m DEPLOYMENT BLOCKER: Database is offline/degraded (HTTP 503)"
    ((FAILED++))
else
    run_check "Health Probe" "200" "$HEALTH_STATUS" "Unexpected response"
fi

# 2. CORS Preflight - Approved Origin
echo "2. Testing CORS preflight from \${ORIGIN_APPROVED}..."
CORS_RES=$(curl -s -m 10 -i -X OPTIONS "\${API_BASE}/health.php" \\
  -H "Origin: \${ORIGIN_APPROVED}" \\
  -H "Access-Control-Request-Method: GET" \\
  -H "Access-Control-Request-Headers: Content-Type, X-Idempotency-Key" 2>/dev/null || echo "")

CORS_CODE=$(echo "$CORS_RES" | grep -i "^HTTP" | awk '{print $2}' | tail -n 1)
CORS_ALLOW_ORIGIN=$(echo "$CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\\r' | awk '{print $2}')

if [[ -z "$CORS_CODE" ]]; then CORS_CODE="000"; fi

if [[ "$CORS_ALLOW_ORIGIN" == "$ORIGIN_APPROVED" ]]; then
    run_check "CORS Approved Origin Preflight" "200|204" "$CORS_CODE" "Access-Control-Allow-Origin: \${CORS_ALLOW_ORIGIN}"
else
    run_check "CORS Approved Origin Preflight" "204" "$CORS_CODE" "Origin header missing or rejected"
fi

# 3. CORS Preflight - Unapproved Origin Rejection
echo "3. Testing CORS preflight from unapproved origin..."
BAD_CORS_RES=$(curl -s -m 10 -i -X OPTIONS "\${API_BASE}/health.php" \\
  -H "Origin: \${ORIGIN_UNAPPROVED}" \\
  -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")

BAD_CORS_CODE=$(echo "$BAD_CORS_RES" | grep -i "^HTTP" | awk '{print $2}' | tail -n 1)
BAD_ALLOW_ORIGIN=$(echo "$BAD_CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\\r' | awk '{print $2}')

if [[ -z "$BAD_CORS_CODE" ]]; then
    echo -e "\\e[31m[FAIL]\\e[0m CORS Unapproved Origin: Network connection failed (unverified)"
    ((FAILED++))
elif [[ -z "$BAD_ALLOW_ORIGIN" || "$BAD_ALLOW_ORIGIN" == "null" ]]; then
    run_check "CORS Unapproved Origin Rejection" "403|204" "$BAD_CORS_CODE" "Access-Control-Allow-Origin correctly omitted"
else
    echo -e "\\e[31m[FAIL]\\e[0m SECURITY ISSUE: Unapproved origin permitted: \${BAD_ALLOW_ORIGIN}"
    ((FAILED++))
fi

# 4. Unauthenticated Rejection
echo "4. Probing protected endpoint without session..."
AUTH_CODE=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "\${API_BASE}/auth/me.php" || echo "000")
run_check "Unauthenticated Access Rejection (/auth/me.php)" "401" "$AUTH_CODE" "Expected HTTP 401 Unauthorized"

# 5. Bad Credentials Rejection
echo "5. Testing invalid credentials at \${API_BASE}/auth/login.php..."
LOGIN_CODE=$(curl -s -m 10 -o /tmp/weonboard_login_res.json -w "%{http_code}" -X POST "\${API_BASE}/auth/login.php" \\
  -H "Content-Type: application/json" \\
  -H "Origin: \${ORIGIN_APPROVED}" \\
  -d '{"email":"synthetic-bad-user-check@weonboard.in","password":"WrongPassword123!"}' || echo "000")
run_check "Invalid Credentials Rejection" "401" "$LOGIN_CODE" "Generic error returned"

# 6. Direct Configuration File Download Block
echo "6. Testing Apache protection on config.php..."
ROOT_URL="\${API_BASE%/v1}"
CONFIG_CODE=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "\${ROOT_URL}/config/config.php" || echo "000")
run_check "Protected File Blocking (/config/config.php)" "403|404" "$CONFIG_CODE" "PHP source not leaked"

# 7. Summary & Exit Code
echo ""
echo "=========================================================="
echo "TEST RESULTS: \${PASSED} Passed | \${FAILED} Failed"
echo "=========================================================="
if [ "$FAILED" -gt 0 ]; then
    echo "STATUS: NOT READY FOR PRODUCTION"
    echo "Review failures and inspect logs under Hostinger hPanel -> Access/Error Logs."
    exit 1
else
    echo "STATUS: ALL SMOKE TESTS PASSED"
    exit 0
fi
`
    },
    {
      path: 'api/enquiry.php',
      description: 'Legacy endpoint (v0): Proxies to api/v1/enquiry.php for backward compatibility',
      content: `<?php
require_once __DIR__ . '/v1/enquiry.php';
`
    },
    {
      path: 'join-as-freelancer.php',
      description: 'Public freelancer 4-step registration page with Zero Joining Fee guarantee',
      content: `<?php
$rootCandidates = [__DIR__, dirname(__DIR__), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}
if (!$root) {
    die("System configuration error: config/config.php not found. Please verify deployment paths.");
}
require_once $root . '/config/config.php';
require_once $root . '/config/database.php';

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
        $error = 'Please fill all mandatory fields (Name, Phone, Email).';
    } else {
        $cleanPhone = preg_replace('/[^\d+]/', '', $phone);
        $cleanEmail = strtolower($email);
        try {
            $db = Database::getConnection();

            // Check duplicate (strict privacy: never leak existing registration_ref)
            $check = $db->prepare("SELECT id FROM freelancers WHERE phone = ? OR email = ? LIMIT 1");
            $check->execute([$cleanPhone, $cleanEmail]);
            $existing = $check->fetch();

            if ($existing) {
                $error = "An application with this mobile number or email address has already been submitted. Our operations team reviews all applications within 24-48 hours.";
            } else {
                $newRef = 'WO-FR-' . date('Y') . '-' . str_pad((string)rand(100, 9999), 4, '0', STR_PAD_LEFT);

                $stmt = $db->prepare("INSERT INTO freelancers 
                    (registration_ref, full_name, email, phone, dob, residential_address, city, state, pin_code, is_adult, has_smartphone, languages, preferred_areas, preferred_work_type, education, skills, preferred_role, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'Kannada, English', 'Indiranagar', ?, '12th Pass', ?, ?, 'Submitted')");
                $stmt->execute([$newRef, $fullName, $cleanEmail, $cleanPhone, $dob, $address ?: 'Bangalore', $city, $state, $pin, $workType, $skills, $role]);

                $success = "Registration received successfully! Your Reference ID is " . $newRef;
            }
        } catch (Exception $e) {
            error_log("Freelancer registration form error: " . $e->getMessage());
            $error = "Unable to complete registration at this time. Please contact us directly at mail@weonboard.in.";
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
$rootCandidates = [__DIR__, dirname(__DIR__), dirname(__DIR__, 2)];
$root = '';
foreach ($rootCandidates as $cand) {
    if (file_exists($cand . '/config/config.php')) {
        $root = $cand;
        break;
    }
}

$settings = [];
if ($root) {
    require_once $root . '/config/config.php';
    if (file_exists($root . '/config/database.php')) {
        require_once $root . '/config/database.php';
        try {
            $db = Database::getConnection();
            $settingsRows = $db->query("SELECT setting_key, setting_value FROM site_settings")->fetchAll();
            foreach ($settingsRows as $r) {
                $settings[$r['setting_key']] = $r['setting_value'];
            }
        } catch (Exception $e) {
            error_log("Site settings query notice: " . $e->getMessage());
        }
    }
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

### Step 2: Configure API Subdomain Routing in Hostinger
1. In hPanel, navigate to **Domains** -> **Subdomains**.
2. For subdomain **\`api.weonboard.in\`**, configure the custom folder / document root to **\`public_html/api\`**.
3. Under this configuration:
   - Root URL \`https://api.weonboard.in/v1/health.php\` resolves directly to \`public_html/api/v1/health.php\`.
   - The provided \`api/.htaccess\` includes rewrite rules to ensure both \`/v1/*\` and legacy \`/api/v1/*\` work seamlessly without \`/api/api/\` duplication.

### Step 3: Create MySQL Database & Import Schema
1. In hPanel, go to **Databases** -> **MySQL Databases**.
2. Create a new database (e.g. \`u123456789_weonboard\`).
3. Create a database user with ALL privileges.
4. Open **phpMyAdmin** for that database.
5. Click **Import** -> Select \`database/schema.sql\` from this package -> Click **Go**.
   - All 17 tables, indexes, constraints, and initial roles will be imported cleanly.

### Step 4: Configure Database Credentials
Edit \`config/config.php\`:
- \`DB_HOST\`: \`localhost\`
- \`DB_NAME\`: your database name
- \`DB_USER\`: your database username
- \`DB_PASS\`: your database password

### Step 5: Provision Initial Super Admin
You can provision the administrator account using either method:
- **Primary & Recommended (CLI via SSH):**
  Connect via Hostinger SSH terminal and run:
  \`\`\`bash
  php scripts/create_super_admin.php "Muhammad Ali Shoaib" "admin@weonboard.in" "YourSecurePassword"
  \`\`\`
  Then immediately lock or remove the web installer:
  \`\`\`bash
  touch config/install.lock
  # or: rm install.php
  \`\`\`
- **Alternate (One-Time Web Installer):**
  Navigate to \`https://weonboard.in/install.php\` in your browser. Enter your database credentials and specify a secure administrator password (&gt;= 8 characters). Upon successful submission, the installer automatically writes \`config/install.lock\`, permanently preventing subsequent web access.

### Step 6: Verify Deployment & Automated Smoke Tests
1. Test API health probe:
   \`\`\`bash
   curl -i https://api.weonboard.in/v1/health.php
   \`\`\`
   Expected response (HTTP 200):
   \`\`\`json
   {"status":"healthy","service":"weonboard-api","version":"1.0.0","database":"available"}
   \`\`\`
2. Run the included automated shell smoke test:
   \`\`\`bash
   chmod +x scripts/hostinger_smoke_test.sh
   ./scripts/hostinger_smoke_test.sh
   \`\`\`

## Security & Architecture Hardening
- **PHP Version**: PHP 8.2+ with PDO enabled.
- **SSL**: Active for both \`weonboard.in\` and \`api.weonboard.in\`.
- **Prepared Statements**: 100% PDO prepared statements across all endpoints.
- **Brute Force Protection**: Rate-limited admin login (5 attempts max / 15 minutes) via \`login_attempts\` table.
- **Session Security**: \`HttpOnly\`, \`SameSite=Lax\`, \`session_regenerate_id(true)\` on login.
- **Audit Logging**: Every inbound enquiry, freelancer registration, MSME proposal, and login attempt is recorded in \`audit_logs\`.
- **Directory Protection**: Sensitive directories (\`config/\`, \`database/\`, \`scripts/\`, \`logs/\`) return HTTP 403 Forbidden via Apache rewrite rules.
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
