<?php
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
