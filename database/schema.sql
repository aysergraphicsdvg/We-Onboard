-- We Onboard Master Database Schema
-- Compatible with Hostinger MySQL 5.7+ / MariaDB 10.4+ (InnoDB, utf8mb4)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles & Permissions (RBAC)
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Admin Users
CREATE TABLE IF NOT EXISTS `admin_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `last_login` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Enquiries Table
CREATE TABLE IF NOT EXISTS `enquiries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `enquiry_ref` VARCHAR(30) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `company_name` VARCHAR(150) NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `enquiry_type` ENUM('Business', 'Freelancer', 'MSME', 'Franchise / dealership brand', 'General enquiry') NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `service_required` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `consent` TINYINT(1) DEFAULT 1,
    `source` VARCHAR(100) DEFAULT 'Website Contact Form',
    `assigned_user_id` INT NULL,
    `status` ENUM('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Follow-up Required', 'Converted', 'Closed — Not Converted', 'Spam') DEFAULT 'New',
    `proposal_value` DECIMAL(12,2) NULL,
    `follow_up_date` DATE NULL,
    `call_outcome` TEXT NULL,
    `converted_client_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (`status`),
    INDEX idx_city (`city`),
    INDEX idx_created (`created_at`),
    FOREIGN KEY (`assigned_user_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Enquiry Notes
CREATE TABLE IF NOT EXISTS `enquiry_notes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `enquiry_id` INT NOT NULL,
    `author_name` VARCHAR(100) NOT NULL,
    `note_text` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Freelancers
CREATE TABLE IF NOT EXISTS `freelancers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_ref` VARCHAR(30) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(30) NOT NULL UNIQUE,
    `dob` DATE NOT NULL,
    `gender` VARCHAR(20) NULL,
    `residential_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pin_code` VARCHAR(10) NOT NULL,
    `is_adult` TINYINT(1) DEFAULT 1,
    `has_smartphone` TINYINT(1) DEFAULT 1,
    `languages` TEXT NOT NULL,
    `preferred_areas` TEXT NOT NULL,
    `preferred_work_type` ENUM('Full-time', 'Part-time', 'Flexible') NOT NULL,
    `education` VARCHAR(100) NOT NULL,
    `previous_experience_years` INT DEFAULT 0,
    `sales_field_experience` TINYINT(1) DEFAULT 0,
    `skills` TEXT NOT NULL,
    `preferred_role` VARCHAR(100) NOT NULL,
    `previous_employer` VARCHAR(150) NULL,
    `status` ENUM('Submitted', 'Under Review', 'Documents Required', 'Verification Pending', 'Approved', 'Training Pending', 'Ready for Assignment', 'Active', 'Suspended', 'Rejected', 'Inactive') DEFAULT 'Submitted',
    `verification_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fl_status (`status`),
    INDEX idx_fl_city (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Clients
CREATE TABLE IF NOT EXISTS `clients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `client_ref` VARCHAR(30) NOT NULL UNIQUE,
    `company_name` VARCHAR(150) NOT NULL,
    `primary_contact` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `industry` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `website` VARCHAR(200) NULL,
    `lead_source` VARCHAR(100) NULL,
    `status` ENUM('Prospect', 'Active Client', 'On Hold', 'Archived') DEFAULT 'Active Client',
    `contract_value` DECIMAL(12,2) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Projects & Tasks
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_ref` VARCHAR(30) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `client_id` INT NULL,
    `client_name` VARCHAR(150) NOT NULL,
    `service_category` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `target_city` VARCHAR(100) NOT NULL,
    `target_areas` TEXT NOT NULL,
    `target_units` INT NOT NULL DEFAULT 100,
    `completed_units` INT NOT NULL DEFAULT 0,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `payment_model` VARCHAR(50) NOT NULL,
    `budget` DECIMAL(12,2) NULL,
    `status` ENUM('Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_ref` VARCHAR(30) NOT NULL UNIQUE,
    `project_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `assigned_freelancer_id` INT NULL,
    `city` VARCHAR(100) NOT NULL,
    `target_area` VARCHAR(150) NOT NULL,
    `deadline` DATE NOT NULL,
    `payout_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected', 'Cancelled') DEFAULT 'Assigned',
    `review_comment` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_freelancer_id`) REFERENCES `freelancers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MSME Government & Agency Requests
CREATE TABLE IF NOT EXISTS `msme_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_ref` VARCHAR(30) NOT NULL UNIQUE,
    `business_name` VARCHAR(150) NOT NULL,
    `applicant_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `stage` VARCHAR(50) NOT NULL,
    `requested_services` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('New', 'Contacted', 'Eligibility Review', 'Documents Pending', 'In Progress', 'Completed', 'Closed') DEFAULT 'New',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Franchise Leads
CREATE TABLE IF NOT EXISTS `franchise_leads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `lead_ref` VARCHAR(30) NOT NULL UNIQUE,
    `applicant_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `preferred_territory` VARCHAR(150) NOT NULL,
    `business_experience` TEXT NOT NULL,
    `investment_capacity` VARCHAR(100) NULL,
    `preferred_model` VARCHAR(100) NOT NULL,
    `status` ENUM('New', 'Qualified', 'Site Assessment', 'Proposal Sent', 'Approved Partner', 'Declined') DEFAULT 'New',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `acting_user` VARCHAR(100) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `record_type` VARCHAR(50) NOT NULL,
    `record_id` VARCHAR(50) NOT NULL,
    `details` TEXT NOT NULL,
    `ip_address` VARCHAR(50) DEFAULT '127.0.0.1',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_time (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CMS Site Settings & Content
CREATE TABLE IF NOT EXISTS `site_settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hero_banners` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_num` INT DEFAULT 0,
    `eyebrow` VARCHAR(150) NOT NULL,
    `heading` VARCHAR(150) NOT NULL,
    `heading_highlight` VARCHAR(150) NULL,
    `description` TEXT NOT NULL,
    `cta_text` VARCHAR(50) NOT NULL,
    `cta_link` VARCHAR(150) NOT NULL,
    `secondary_cta_text` VARCHAR(50) NULL,
    `secondary_cta_link` VARCHAR(150) NULL,
    `image_url` TEXT NULL,
    `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Rate Limiting for Login & API Abuse Protection
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (`ip_address`, `attempt_time`),
    INDEX idx_email_time (`email`, `attempt_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. API Idempotency Keys (Deduplication across concurrent / repeated requests)
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `idempotency_key` VARCHAR(64) NOT NULL UNIQUE,
    `endpoint` VARCHAR(100) NOT NULL,
    `request_payload_hash` VARCHAR(64) NOT NULL,
    `response_json` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idem_key (`idempotency_key`),
    INDEX idx_idem_time (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial System Roles Seed
INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Super Admin', 'Full access to all platform records, settings, and team users'),
(2, 'Administrator', 'Operations, project allocation, freelancer verification, and client management'),
(3, 'Enquiry Manager', 'Inbound enquiry triage, client qualification, and sales tracking'),
(4, 'Freelancer Coordinator', 'Manage freelancer onboarding and verifications'),
(5, 'Project Manager', 'Manage field projects and tasks');

SET FOREIGN_KEY_CHECKS = 1;
