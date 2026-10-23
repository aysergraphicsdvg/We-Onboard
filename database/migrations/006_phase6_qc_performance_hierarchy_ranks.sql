-- We Onboard Non-Destructive Migration 006: QC Hardening, Freelancer Performance, Team Hierarchy & Rank Engine (Phase 6)
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
    'ALTER TABLE `freelancers` ADD COLUMN `current_rank` ENUM(\'Trainee\', \'Team Member\', \'Team Leader\', \'Manager\', \'City/Regional Head\') DEFAULT \'Trainee\' AFTER `preferred_role`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `team_id` INT NULL AFTER `current_rank`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `quality_score` DECIMAL(5,2) NULL AFTER `team_id`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `qs_sample_size` INT DEFAULT 0 AFTER `quality_score`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `qs_status` ENUM(\'Insufficient Data\', \'Active\', \'Under Observation\', \'Suspended\') DEFAULT \'Insufficient Data\' AFTER `qs_sample_size`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `qs_last_calculated_at` DATETIME NULL AFTER `qs_status`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `fraud_flag` TINYINT(1) DEFAULT 0 AFTER `qs_last_calculated_at`, ADD COLUMN `fraud_reason` TEXT NULL AFTER `fraud_flag`, ADD COLUMN `fraud_flagged_by` INT NULL AFTER `fraud_reason`, ADD COLUMN `fraud_flagged_at` DATETIME NULL AFTER `fraud_flagged_by`', 
    'SELECT "Fraud columns already exist on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. Create Teams Table
CREATE TABLE IF NOT EXISTS `teams` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `team_code` VARCHAR(30) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `leader_id` INT NULL,
    `manager_id` INT NULL,
    `city` VARCHAR(100) NOT NULL,
    `operating_area` VARCHAR(200) NULL,
    `status` ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_team_city` (`city`),
    INDEX `idx_team_status` (`status`),
    INDEX `idx_team_leader` (`leader_id`),
    INDEX `idx_team_manager` (`manager_id`),
    CONSTRAINT `fk_team_leader` FOREIGN KEY (`leader_id`) REFERENCES `freelancers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_team_manager` FOREIGN KEY (`manager_id`) REFERENCES `freelancers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Create Team Members Table (Enforces unique membership: one team per freelancer)
CREATE TABLE IF NOT EXISTS `team_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `team_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL UNIQUE,
    `role_in_team` ENUM('Member', 'Deputy Leader') DEFAULT 'Member',
    `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tm_team` (`team_id`),
    INDEX `idx_tm_fl` (`freelancer_id`),
    CONSTRAINT `fk_tm_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tm_fl` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Create Rank Promotions Table (Tracks eligibility, nomination, approval, decision reason and history)
CREATE TABLE IF NOT EXISTS `rank_promotions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `freelancer_id` INT NOT NULL,
    `from_rank` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    `to_rank` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') NOT NULL,
    `status` ENUM('Eligible', 'Nominated', 'Approved', 'Rejected') DEFAULT 'Eligible',
    `eligibility_snapshot_json` LONGTEXT NULL,
    `reviewed_by` INT NULL,
    `reviewed_by_name` VARCHAR(150) NULL,
    `decision_reason` TEXT NULL,
    `reviewed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_rp_fl` (`freelancer_id`),
    INDEX `idx_rp_status` (`status`),
    CONSTRAINT `fk_rp_fl` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Create Task Review History Table (Preserves complete review audit trail across rework cycles)
CREATE TABLE IF NOT EXISTS `task_review_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_id` INT NOT NULL,
    `submission_id` INT NULL,
    `freelancer_id` INT NOT NULL,
    `reviewer_id` INT NULL,
    `reviewer_name` VARCHAR(150) NOT NULL,
    `decision` ENUM('Approved', 'Rework Required', 'Rejected') NOT NULL,
    `review_comment` TEXT NULL,
    `reviewed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_trh_task` (`task_id`),
    INDEX `idx_trh_fl` (`freelancer_id`),
    INDEX `idx_trh_sub` (`submission_id`),
    CONSTRAINT `fk_trh_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Create Quality Score Configuration Table
CREATE TABLE IF NOT EXISTS `quality_score_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(50) NOT NULL UNIQUE,
    `config_value` DECIMAL(6,2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `quality_score_config` (`config_key`, `config_value`, `description`) VALUES
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
INSERT IGNORE INTO `teams` (`id`, `team_code`, `name`, `city`, `operating_area`, `status`) VALUES
(1, 'TM-BLR-01', 'Indiranagar Commercial Activation Team', 'Bengaluru', '100ft Road, CMH Road, Defence Colony', 'Active'),
(2, 'TM-BLR-02', 'Koramangala Retail Corridor Team', 'Bengaluru', '80ft Road, Sony Signal, 4th & 5th Block', 'Active'),
(3, 'TM-BLR-03', 'HSR Layout & BTM Field Unit', 'Bengaluru', '27th Main, Sector 1-4, Silk Board Junction', 'Active'),
(4, 'TM-BLR-04', 'Whitefield Tech Corridor Rollout Team', 'Bengaluru', 'ITPL Main Road, Hope Farm, Kadugodi', 'Active');

SET FOREIGN_KEY_CHECKS = 1;
