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
    `onboarding_status` ENUM('Registered', 'Profile Incomplete', 'KYC Pending', 'Under Review', 'Action Required', 'Approved', 'Rejected') DEFAULT 'KYC Pending',
    `language_preference` VARCHAR(10) DEFAULT 'en',
    `profile_completed_percent` INT DEFAULT 60,
    `verification_notes` TEXT NULL,
    `password_hash` VARCHAR(255) NULL,
    `current_rank` ENUM('Trainee', 'Team Member', 'Team Leader', 'Manager', 'City/Regional Head') DEFAULT 'Trainee',
    `team_id` INT NULL,
    `quality_score` DECIMAL(5,2) NULL,
    `qs_sample_size` INT DEFAULT 0,
    `qs_status` ENUM('Insufficient Data', 'Active', 'Under Observation', 'Suspended') DEFAULT 'Insufficient Data',
    `qs_last_calculated_at` DATETIME NULL,
    `fraud_flag` TINYINT(1) DEFAULT 0,
    `fraud_reason` TEXT NULL,
    `fraud_flagged_by` INT NULL,
    `fraud_flagged_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fl_status (`status`),
    INDEX idx_fl_onboarding (`onboarding_status`),
    INDEX idx_fl_city (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5a. Freelancer KYC Documents
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

-- 5b. Freelancer Notifications
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
    `required_training_course_id` INT NULL,
    `required_kyc_level` VARCHAR(50) DEFAULT 'Approved',
    `description` TEXT NOT NULL,
    `evidence_schema_json` TEXT NULL,
    `requires_location` TINYINT(1) DEFAULT 0,
    `target_city` VARCHAR(100) NOT NULL,
    `target_areas` TEXT NOT NULL,
    `target_units` INT NOT NULL DEFAULT 100,
    `completed_units` INT NOT NULL DEFAULT 0,
    `max_tasks_per_freelancer` INT DEFAULT 5,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `payment_model` VARCHAR(50) NOT NULL,
    `payout_rate` DECIMAL(10,2) DEFAULT 0.00,
    `budget` DECIMAL(12,2) NULL,
    `status` ENUM('Draft', 'Approved', 'Ready to Launch', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`required_training_course_id`) REFERENCES `courses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `task_ref` VARCHAR(30) NOT NULL UNIQUE,
    `project_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `instructions` LONGTEXT NULL,
    `evidence_requirements_json` TEXT NULL,
    `requires_location` TINYINT(1) DEFAULT 0,
    `assigned_freelancer_id` INT NULL,
    `city` VARCHAR(100) NOT NULL,
    `target_area` VARCHAR(150) NOT NULL,
    `deadline` DATE NOT NULL,
    `payout_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Available', 'Assigned', 'Accepted', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rework Required', 'Rejected', 'Cancelled') DEFAULT 'Available',
    `accepted_at` DATETIME NULL,
    `submitted_at` DATETIME NULL,
    `reviewed_by` INT NULL,
    `reviewed_by_name` VARCHAR(150) NULL,
    `reviewed_at` DATETIME NULL,
    `rework_count` INT DEFAULT 0,
    `review_comment` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_freelancer_id`) REFERENCES `freelancers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- 14. Operational Academy & Certification Tables (Phase 4)
CREATE TABLE IF NOT EXISTS `courses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_code` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `learning_objectives` TEXT NULL,
    `category` VARCHAR(100) DEFAULT 'Field Operations',
    `language` VARCHAR(20) DEFAULT 'en',
    `estimated_minutes` INT DEFAULT 45,
    `thumbnail_url` VARCHAR(255) NULL,
    `status` ENUM('Draft', 'Published', 'Archived') DEFAULT 'Published',
    `passing_score` TINYINT UNSIGNED DEFAULT 80,
    `max_assessment_attempts` TINYINT UNSIGNED DEFAULT 3,
    `is_mandatory` TINYINT(1) DEFAULT 0,
    `created_by` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_course_code` (`course_code`),
    UNIQUE KEY `unique_slug` (`slug`),
    INDEX `idx_course_status` (`status`),
    INDEX `idx_course_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_modules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_module_course` (`course_id`),
    CONSTRAINT `fk_module_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_lessons` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `module_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content_type` ENUM('text', 'video_ref', 'interactive') DEFAULT 'text',
    `content` LONGTEXT NOT NULL,
    `media_url` VARCHAR(500) NULL,
    `duration_minutes` INT DEFAULT 10,
    `sort_order` INT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lesson_module` (`module_id`),
    INDEX `idx_lesson_course` (`course_id`),
    CONSTRAINT `fk_lesson_module` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lesson_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_assessments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `passing_score` TINYINT UNSIGNED DEFAULT 80,
    `time_limit_minutes` INT DEFAULT 20,
    `max_attempts` TINYINT UNSIGNED DEFAULT 3,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_course_assessment` (`course_id`),
    CONSTRAINT `fk_assessment_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessment_questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `assessment_id` INT NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_type` ENUM('single_choice', 'multi_choice', 'true_false') DEFAULT 'single_choice',
    `options_json` LONGTEXT NOT NULL,
    `correct_answers_json` LONGTEXT NOT NULL,
    `explanation` TEXT NULL,
    `sort_order` INT DEFAULT 1,
    `points` TINYINT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_question_assessment` (`assessment_id`),
    CONSTRAINT `fk_question_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `course_assessments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_enrollments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `freelancer_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `status` ENUM('Enrolled', 'In Progress', 'Completed', 'Dropped') DEFAULT 'Enrolled',
    `progress_percent` TINYINT UNSIGNED DEFAULT 0,
    `last_lesson_id` INT NULL,
    `enrolled_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL,
    UNIQUE KEY `unique_enrollment` (`freelancer_id`, `course_id`),
    INDEX `idx_enrollment_freelancer` (`freelancer_id`),
    INDEX `idx_enrollment_course` (`course_id`),
    CONSTRAINT `fk_enrollment_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_enrollment_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_completions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `freelancer_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `lesson_id` INT NOT NULL,
    `completed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_lesson_completion` (`freelancer_id`, `lesson_id`),
    INDEX `idx_lc_freelancer_course` (`freelancer_id`, `course_id`),
    CONSTRAINT `fk_lc_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lc_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `course_lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessment_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `assessment_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL,
    `attempt_number` TINYINT UNSIGNED NOT NULL,
    `answers_json` LONGTEXT NOT NULL,
    `score_percent` TINYINT UNSIGNED NOT NULL,
    `passed` TINYINT(1) NOT NULL,
    `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_aa_freelancer_assessment` (`freelancer_id`, `assessment_id`),
    CONSTRAINT `fk_aa_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `course_assessments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_aa_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `freelancer_certificates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `certificate_ref` VARCHAR(64) NOT NULL,
    `freelancer_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `issue_date` DATE NOT NULL,
    `score_percent` TINYINT UNSIGNED NOT NULL,
    `verification_code` VARCHAR(32) NOT NULL,
    `metadata_json` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_certificate_ref` (`certificate_ref`),
    UNIQUE KEY `unique_verification_code` (`verification_code`),
    UNIQUE KEY `unique_freelancer_course_cert` (`freelancer_id`, `course_id`),
    INDEX `idx_cert_freelancer` (`freelancer_id`),
    CONSTRAINT `fk_cert_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `freelancers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cert_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Teams & Hierarchy (Phase 6)
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

-- =====================================================
-- PHASE 7: FINANCIAL SUBSYSTEM & DOUBLE-ENTRY LEDGER
-- =====================================================

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

INSERT IGNORE INTO `ledger_accounts` (`account_code`, `account_name`, `account_type`, `description`) VALUES
('1001', 'Cash & Bank Clearing', 'Asset', 'Platform disbursement bank account and payment gateway settlement escrow'),
('2001', 'Freelancer Payable (Available)', 'Liability', 'Withdrawable available balance owed to field freelancers for verified completed tasks'),
('2002', 'Team Leader Payable', 'Liability', 'Performance overrides owed to qualified Team Leaders (20% share)'),
('2003', 'Manager Payable', 'Liability', 'Corridor supervision overrides owed to qualified Area Managers (10% share)'),
('2004', 'Reserve Liability (15-day Hold)', 'Liability', '10% quality assurance reserve retained for 15 days before release to available balance'),
('2005', 'Payout In-Transit Clearing', 'Liability', 'Temporary clearing holding funds from requested payouts until provider confirmation'),
('3001', 'Growth Pool (Platform Retained)', 'Equity', 'Retained unallocated supervisor shares when Team Leaders or Managers are disqualified or vacant'),
('5001', 'Project Direct Execution Cost', 'Expense', 'Platform field delivery expense recognized upon task Quality Control verification');

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


