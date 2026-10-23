-- We Onboard Non-Destructive Migration 005: Projects, Task Dispatch, Field Evidence & Quality Control (Phase 5)
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
    'ALTER TABLE `projects` ADD COLUMN `required_training_course_id` INT NULL AFTER `service_category`', 
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
    'ALTER TABLE `projects` ADD COLUMN `required_kyc_level` VARCHAR(50) DEFAULT \'Approved\' AFTER `required_training_course_id`', 
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
    'ALTER TABLE `projects` ADD COLUMN `evidence_schema_json` TEXT NULL AFTER `description`', 
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
    'ALTER TABLE `projects` ADD COLUMN `requires_location` TINYINT(1) DEFAULT 0 AFTER `evidence_schema_json`', 
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
    'ALTER TABLE `projects` ADD COLUMN `max_tasks_per_freelancer` INT DEFAULT 5 AFTER `target_units`', 
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
    'ALTER TABLE `projects` ADD COLUMN `payout_rate` DECIMAL(10,2) DEFAULT 0.00 AFTER `payment_model`', 
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
    'ALTER TABLE `tasks` MODIFY COLUMN `status` ENUM(\'Available\', \'Assigned\', \'Accepted\', \'In Progress\', \'Submitted\', \'Under Review\', \'Approved\', \'Rework Required\', \'Rejected\', \'Cancelled\') DEFAULT \'Available\'', 
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
    'ALTER TABLE `tasks` ADD COLUMN `instructions` LONGTEXT NULL AFTER `description`', 
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
    'ALTER TABLE `tasks` ADD COLUMN `evidence_requirements_json` TEXT NULL AFTER `instructions`', 
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
    'ALTER TABLE `tasks` ADD COLUMN `requires_location` TINYINT(1) DEFAULT 0 AFTER `evidence_requirements_json`', 
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
    'ALTER TABLE `tasks` ADD COLUMN `accepted_at` DATETIME NULL AFTER `deadline`, ADD COLUMN `submitted_at` DATETIME NULL AFTER `accepted_at`, ADD COLUMN `reviewed_by` INT NULL AFTER `submitted_at`, ADD COLUMN `reviewed_by_name` VARCHAR(150) NULL AFTER `reviewed_by`, ADD COLUMN `reviewed_at` DATETIME NULL AFTER `reviewed_by_name`, ADD COLUMN `rework_count` INT DEFAULT 0 AFTER `reviewed_at`', 
    'SELECT "Audit and tracking columns already exist on tasks" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 12. Create Task Evidence Submissions Table
CREATE TABLE IF NOT EXISTS `task_evidence_submissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL,
    `form_data_json` LONGTEXT NULL,
    `location_lat` DECIMAL(10,8) NULL,
    `location_lng` DECIMAL(11,8) NULL,
    `location_address` TEXT NULL,
    `idempotency_key` VARCHAR(64) NULL,
    `status` ENUM('Pending Review', 'Approved', 'Rework Required', 'Rejected') DEFAULT 'Pending Review',
    `review_comment` TEXT NULL,
    `reviewed_by` VARCHAR(150) NULL,
    `reviewed_at` DATETIME NULL,
    `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sub_task` (`task_id`),
    INDEX `idx_sub_freelancer` (`freelancer_id`),
    INDEX `idx_sub_idempotency` (`idempotency_key`),
    CONSTRAINT `fk_sub_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sub_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Create Task Evidence Files Table
CREATE TABLE IF NOT EXISTS `task_evidence_files` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_id` INT NOT NULL,
    `submission_id` INT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `file_size` INT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tef_task` (`task_id`),
    INDEX `idx_tef_submission` (`submission_id`),
    CONSTRAINT `fk_tef_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tef_submission` FOREIGN KEY (`submission_id`) REFERENCES `task_evidence_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Seed Sample Projects and Initial Task Pool if not present
INSERT IGNORE INTO `projects` (
    `id`, `project_ref`, `name`, `client_name`, `service_category`, 
    `required_training_course_id`, `required_kyc_level`, `description`, 
    `evidence_schema_json`, `requires_location`, `target_city`, `target_areas`, 
    `target_units`, `completed_units`, `max_tasks_per_freelancer`, `start_date`, 
    `end_date`, `payment_model`, `payout_rate`, `budget`, `status`
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
INSERT IGNORE INTO `tasks` (
    `id`, `task_ref`, `project_id`, `title`, `description`, `instructions`, 
    `evidence_requirements_json`, `requires_location`, `city`, `target_area`, 
    `deadline`, `payout_amount`, `status`, `assigned_freelancer_id`
) VALUES 
(
    1, 'TSK-2026-101', 1, 'Deploy Soundbox & QR — Shri Krishna Provision Store',
    'Visit merchant, verify business PAN/GST, affix QR standee, bind NFC soundbox, and execute test sound confirmation.',
    '1. Greet store owner and show We Onboard Associate ID.\n2. Verify merchant name matches legal registration.\n3. Position soundbox near billing counter away from loud refrigerators.\n4. Trigger 1 INR test transaction and verify clear local language broadcast.\n5. Capture required photos through the We Onboard task submitter.',
    '["Front of Store Photo with Soundbox Mounted", "Merchant Signed Handover Slip", "Terminal Serial Barcode Photo"]',
    1, 'Bengaluru', '100ft Road, Indiranagar', '2026-10-25', 350.00, 'Available', NULL
),
(
    2, 'TSK-2026-102', 1, 'POS Terminal Activation — New Modern Bakery',
    'Merchant POS soundbox setup and merchant app training on daily settlement summaries.',
    '1. Verify store location on map.\n2. Complete merchant bank details verification.\n3. Ensure battery is charged to 100%.\n4. Demonstrate QR scan on owner\'s smartphone.\n5. Obtain merchant signature on handover sheet.',
    '["Front of Store Photo with Soundbox Mounted", "Merchant Signed Handover Slip"]',
    1, 'Bengaluru', 'Koramangala 4th Block', '2026-10-26', 350.00, 'Available', NULL
),
(
    3, 'TSK-2026-103', 2, 'FMCG Shelf Share Audit — Balaji Supermarket',
    'Audit personal care and packaged food shelf allocation. Record stock levels and take clear photographs of brand display units.',
    '1. Enter store politely and request store manager permission for annual brand audit.\n2. Measure and photograph product bays.\n3. Record missing stock codes and count shelf facings.\n4. Do not engage in dispute if store refuses; log incident report.',
    '["Full Shelf Display Wide Angle Photo", "Store Frontage Photo"]',
    0, 'Bengaluru', 'Jayanagar 4th Block', '2026-10-24', 250.00, 'Available', NULL
);
