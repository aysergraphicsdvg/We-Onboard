-- We Onboard Non-Destructive Migration 004: Academy & Certification Module
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Courses Table
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

-- 2. Course Modules Table
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

-- 3. Course Lessons Table
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

-- 4. Course Assessments Table
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

-- 5. Assessment Questions Table (Correct answers kept server-side only)
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

-- 6. Course Enrollments Table
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

-- 7. Lesson Completions Table
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

-- 8. Assessment Attempts Table
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

-- 9. Freelancer Certificates Table
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

-- 10. Seed Core Courses and Content (if not present)
INSERT IGNORE INTO `courses` 
(`id`, `course_code`, `title`, `slug`, `description`, `learning_objectives`, `category`, `language`, `estimated_minutes`, `status`, `passing_score`, `max_assessment_attempts`, `is_mandatory`) 
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
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `sort_order`) VALUES
(1, 1, 'Module 1: Professional Representation & Code of Conduct', 'Dress code, badge display, ethical communications, and anti-bribery standards.', 1),
(2, 1, 'Module 2: Field Safety & Emergency Response', 'Personal protection, weather hazards, handling difficult situations, and SOS escalation.', 2);

-- Lessons for Course 1
INSERT IGNORE INTO `course_lessons` (`id`, `module_id`, `course_id`, `title`, `content_type`, `content`, `duration_minutes`, `sort_order`) VALUES
(1, 1, 1, '1.1 Brand Identity & Field Demeanor', 'text', 
 'Welcome to the We Onboard Field Operations Team.\n\n### 1. Mandatory Identity Display\n- Every field executive must display their official We Onboard photo ID card prominently on their chest at all times during operational visits.\n- Wear clean, professional attire appropriate for retail visits.\n\n### 2. Zero-Fee Principle\n- You must NEVER request, accept, or hint at any cash, tip, or informal fee from any merchant, applicant, or client.\n- We Onboard services are 100% cashless. Any solicitation of cash results in immediate permanent termination and legal reporting.\n\n### 3. Professional Communication\n- Greet store owners respectfully in their preferred local language.\n- Clearly introduce yourself: "Hello, I am [Your Name] from We Onboard, representing [Client Brand]."\n- State the exact purpose of your visit clearly before requesting any document or space inspection.', 10, 1),

(2, 1, 1, '1.2 Customer Data Confidentiality & Fraud Prevention', 'text', 
 '### Protecting Sensitive Information\nDuring onboarding, you will handle sensitive personal identification information (Aadhaar, PAN, Bank Passbooks, GST certificates).\n\n### Strict Rules:\n1. Never take personal screenshots or photograph documents on personal messaging apps (WhatsApp, Telegram).\n2. All photo evidence must be captured directly through the authorized We Onboard mobile client.\n3. Do not store merchant contact numbers in your personal contact list.\n4. Any falsification of location, fake OTP collection, or tampering with signatures is treated as criminal fraud under Indian IT Act and IPC sections.', 12, 2),

(3, 2, 1, '2.1 Personal Safety in Dense & Remote Markets', 'text', 
 '### Field Safety Guidelines\nYour safety is our highest priority.\n\n### Rules for Safe Navigation:\n- Plan your daily route in advance through approved arterial roads and marketplaces.\n- Do not enter isolated warehouses or private basements alone. Request the merchant to meet in the front public area of the commercial establishment.\n- Keep your smartphone battery above 30% at all times. Carry a portable power bank during long-distance field runs.\n- In the event of severe weather, flash floods, or local strikes, stop work immediately, take shelter, and inform your assigned Team Leader via the portal.', 13, 1);

-- Assessment for Course 1
INSERT IGNORE INTO `course_assessments` (`id`, `course_id`, `title`, `description`, `passing_score`, `time_limit_minutes`, `max_attempts`) VALUES
(1, 1, 'Field Ethics & Safety Certification Exam', 'Comprehensive 5-question test evaluating your understanding of We Onboard conduct, zero-fee compliance, and field safety protocols. 80% passing score required for certificate issuance.', 80, 15, 3);

-- Assessment Questions for Course 1 (Correct answers stored server-side)
INSERT IGNORE INTO `assessment_questions` (`id`, `assessment_id`, `question_text`, `question_type`, `options_json`, `correct_answers_json`, `explanation`, `sort_order`, `points`) VALUES
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
