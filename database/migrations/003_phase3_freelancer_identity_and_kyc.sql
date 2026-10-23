-- We Onboard Non-Destructive Migration 003: Freelancer Identity, Authentication & KYC Workflow
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
    'ALTER TABLE `freelancers` ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `verification_notes`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `onboarding_status` ENUM(\'Registered\', \'Profile Incomplete\', \'KYC Pending\', \'Under Review\', \'Action Required\', \'Approved\', \'Rejected\') DEFAULT \'KYC Pending\' AFTER `status`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `language_preference` VARCHAR(10) DEFAULT \'en\' AFTER `onboarding_status`', 
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
    'ALTER TABLE `freelancers` ADD COLUMN `profile_completed_percent` INT DEFAULT 60 AFTER `language_preference`', 
    'SELECT "Column profile_completed_percent already exists on freelancers" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Create freelancer_documents table for KYC document workflow
CREATE TABLE IF NOT EXISTS `freelancer_documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `document_ref` VARCHAR(30) NOT NULL UNIQUE,
    `freelancer_id` INT NOT NULL,
    `document_type` VARCHAR(60) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size` INT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected', 'Resubmission Required') DEFAULT 'Pending',
    `rejection_reason` TEXT NULL,
    `reviewed_by` INT NULL,
    `reviewed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_fl (`freelancer_id`),
    INDEX idx_doc_status (`status`),
    INDEX idx_doc_type (`document_type`),
    FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reviewed_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create freelancer_notifications table
CREATE TABLE IF NOT EXISTS `freelancer_notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `freelancer_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) DEFAULT 'system',
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fn_fl (`freelancer_id`),
    FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Ensure permissions for KYC and Freelancer Management
INSERT IGNORE INTO `permissions` (`slug`, `name`, `module`) VALUES
('freelancer.view', 'View Freelancer Profiles & KYC', 'freelancers'),
('freelancer.verify', 'Review & Verify KYC Documents', 'freelancers'),
('freelancer.manage', 'Approve & Manage Freelancer Status', 'freelancers');

-- 8. Assign permissions to roles (Super Admin id=1, Administrator id=2, Freelancer Coordinator id=4)
-- Note: Enquiry Manager (id=3) does NOT receive freelancer verification permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify', 'freelancer.manage');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify', 'freelancer.manage');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 4, id FROM permissions WHERE slug IN ('freelancer.view', 'freelancer.verify');
