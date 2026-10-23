-- We Onboard — Migration 007: Phase 7 Financial Architecture, Double-Entry Ledger, Earnings & Payout Management
-- Hostinger MySQL / MariaDB compatible, idempotent, non-destructive

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Chart of Accounts Table
CREATE TABLE IF NOT EXISTS `ledger_accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_code` VARCHAR(20) NOT NULL UNIQUE,
    `account_name` VARCHAR(100) NOT NULL,
    `account_type` ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_la_type` (`account_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Chart of Accounts
INSERT IGNORE INTO `ledger_accounts` (`account_code`, `account_name`, `account_type`, `description`) VALUES
('1001', 'Cash & Bank Clearing', 'Asset', 'Platform disbursement bank account and payment gateway settlement escrow'),
('2001', 'Freelancer Payable (Available)', 'Liability', 'Withdrawable available balance owed to field freelancers for verified completed tasks'),
('2002', 'Team Leader Payable', 'Liability', 'Performance overrides owed to qualified Team Leaders (20% share)'),
('2003', 'Manager Payable', 'Liability', 'Corridor supervision overrides owed to qualified Area Managers (10% share)'),
('2004', 'Reserve Liability (15-day Hold)', 'Liability', '10% quality assurance reserve retained for 15 days before release to available balance'),
('2005', 'Payout In-Transit Clearing', 'Liability', 'Temporary clearing holding funds from requested payouts until provider confirmation'),
('3001', 'Growth Pool (Platform Retained)', 'Equity', 'Retained unallocated supervisor shares when Team Leaders or Managers are disqualified or vacant'),
('5001', 'Project Direct Execution Cost', 'Expense', 'Platform field delivery expense recognized upon task Quality Control verification');

-- 2. Double-Entry Journal Records (Balanced Debits and Credits)
CREATE TABLE IF NOT EXISTS `ledger_journals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `journal_ref` VARCHAR(50) NOT NULL UNIQUE,
    `transaction_type` ENUM('EARNING_RECOGNITION', 'RESERVE_RELEASE', 'PAYOUT_REQUESTED', 'PAYOUT_SETTLED', 'PAYOUT_REVERSED', 'MANUAL_ADJUSTMENT') NOT NULL,
    `reference_id` VARCHAR(50) NULL,
    `narration` TEXT NOT NULL,
    `total_debit` DECIMAL(14,2) NOT NULL,
    `total_credit` DECIMAL(14,2) NOT NULL,
    `posted_by` VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    `is_reversed` TINYINT(1) DEFAULT 0,
    `reversed_by_journal_id` INT NULL,
    `reversal_of_journal_id` INT NULL,
    `posted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lj_ref` (`reference_id`),
    INDEX `idx_lj_type` (`transaction_type`),
    INDEX `idx_lj_date` (`posted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Double-Entry Journal Lines
CREATE TABLE IF NOT EXISTS `ledger_entries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `journal_id` INT NOT NULL,
    `account_code` VARCHAR(20) NOT NULL,
    `entry_type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(14,2) NOT NULL,
    `entity_type` ENUM('Freelancer', 'TeamLeader', 'Manager', 'Platform', 'System') NOT NULL DEFAULT 'System',
    `entity_id` VARCHAR(50) NULL,
    `line_narration` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_le_journal` (`journal_id`),
    INDEX `idx_le_account` (`account_code`),
    INDEX `idx_le_entity` (`entity_type`, `entity_id`),
    CONSTRAINT `fk_le_journal` FOREIGN KEY (`journal_id`) REFERENCES `ledger_journals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Earning Entitlements (QC-Approved Work Breakdown)
CREATE TABLE IF NOT EXISTS `earning_entitlements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entitlement_ref` VARCHAR(50) NOT NULL UNIQUE,
    `task_id` INT NOT NULL UNIQUE,
    `project_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL,
    `gross_rate` DECIMAL(14,2) NOT NULL,
    `freelancer_share_gross` DECIMAL(14,2) NOT NULL,
    `freelancer_reserve_amount` DECIMAL(14,2) NOT NULL,
    `freelancer_share_net` DECIMAL(14,2) NOT NULL,
    `team_leader_id` INT NULL,
    `team_leader_share` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `team_leader_routed_to_growth` TINYINT(1) DEFAULT 0,
    `manager_id` INT NULL,
    `manager_share` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `manager_routed_to_growth` TINYINT(1) DEFAULT 0,
    `growth_pool_share` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `hierarchy_snapshot_json` LONGTEXT NULL,
    `journal_id` INT NOT NULL,
    `status` ENUM('Recognized', 'Reversed') DEFAULT 'Recognized',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ee_freelancer` (`freelancer_id`),
    INDEX `idx_ee_task` (`task_id`),
    INDEX `idx_ee_project` (`project_id`),
    CONSTRAINT `fk_ee_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Reserve Records (10% Retained for 15 Days)
CREATE TABLE IF NOT EXISTS `reserve_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `reserve_ref` VARCHAR(50) NOT NULL UNIQUE,
    `freelancer_id` INT NOT NULL,
    `task_id` INT NOT NULL,
    `earning_entitlement_id` INT NOT NULL,
    `amount` DECIMAL(14,2) NOT NULL,
    `reserve_pct` DECIMAL(5,2) DEFAULT 10.00,
    `hold_days` INT DEFAULT 15,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `release_due_at` TIMESTAMP NOT NULL,
    `released_at` TIMESTAMP NULL,
    `status` ENUM('Held', 'Released', 'Extended', 'Reversed') DEFAULT 'Held',
    `release_journal_id` INT NULL,
    `notes` VARCHAR(255) NULL,
    INDEX `idx_rr_freelancer` (`freelancer_id`),
    INDEX `idx_rr_status_due` (`status`, `release_due_at`),
    CONSTRAINT `fk_rr_fl` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Payout Requests & Settlement Lifecycle
CREATE TABLE IF NOT EXISTS `payout_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payout_ref` VARCHAR(50) NOT NULL UNIQUE,
    `idempotency_key` VARCHAR(64) NOT NULL UNIQUE,
    `freelancer_id` INT NOT NULL,
    `amount` DECIMAL(14,2) NOT NULL,
    `payment_method` ENUM('UPI', 'Bank Transfer', 'NEFT') NOT NULL DEFAULT 'UPI',
    `beneficiary_name` VARCHAR(150) NOT NULL,
    `beneficiary_details` VARCHAR(255) NOT NULL,
    `status` ENUM('Requested', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed', 'Cancelled') DEFAULT 'Requested',
    `request_journal_id` INT NULL,
    `settlement_journal_id` INT NULL,
    `reversal_journal_id` INT NULL,
    `provider_name` VARCHAR(50) DEFAULT 'SimulatedPaymentAdapter',
    `provider_transfer_id` VARCHAR(100) NULL,
    `failure_reason` TEXT NULL,
    `reviewed_by` VARCHAR(150) NULL,
    `reviewed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_po_freelancer` (`freelancer_id`),
    INDEX `idx_po_status` (`status`),
    INDEX `idx_po_created` (`created_at`),
    CONSTRAINT `fk_po_fl` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Wallets Projections Table (Reconciled against Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS `wallets` (
    `freelancer_id` INT PRIMARY KEY,
    `total_earned` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `available_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `reserved_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `pending_earnings` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `payouts_in_progress` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `paid_payouts` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `last_reconciled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_w_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Configurable Financial Engine Settings
CREATE TABLE IF NOT EXISTS `financial_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(50) NOT NULL UNIQUE,
    `config_value` DECIMAL(14,2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `financial_config` (`config_key`, `config_value`, `description`) VALUES
('freelancer_share_pct', 70.00, 'Baseline revenue share percentage for executing freelancer'),
('team_leader_share_pct', 20.00, 'Leadership override percentage for active qualifying Team Leader'),
('manager_share_pct', 10.00, 'Corridor oversight percentage for active qualifying Area Manager'),
('reserve_pct', 10.00, 'Quality assurance reserve withheld from freelancer share'),
('reserve_hold_days', 15.00, 'Duration in calendar days before withheld reserve matures and auto-releases'),
('min_payout_amount', 500.00, 'Minimum single payout request threshold in INR'),
('max_payout_amount', 50000.00, 'Maximum single payout request limit in INR');

SET FOREIGN_KEY_CHECKS = 1;
