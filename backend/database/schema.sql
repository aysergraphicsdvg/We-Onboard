-- We Onboard platform schema v1
-- Target: MySQL 8.0+ / compatible MariaDB with InnoDB, JSON, utf8mb4.
-- IMPORTANT: Import only into a NEW, dedicated database after review. This is a baseline schema,
-- not a production certification. Run migrations on staging before production.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 full_name VARCHAR(160) NOT NULL,
 email VARCHAR(254) NULL UNIQUE,
 phone_e164 VARCHAR(20) NULL UNIQUE,
 preferred_language ENUM('en','hi','kn','te','ta','ur') NOT NULL DEFAULT 'en',
 status ENUM('pending','active','suspended','closed') NOT NULL DEFAULT 'pending',
 email_verified_at DATETIME NULL,
 phone_verified_at DATETIME NULL,
 last_login_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_users_status_created(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 role_key VARCHAR(60) NOT NULL UNIQUE,
 display_name VARCHAR(100) NOT NULL,
 role_scope ENUM('platform','freelancer','client') NOT NULL,
 is_system TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 permission_key VARCHAR(100) NOT NULL UNIQUE,
 description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
 role_id BIGINT UNSIGNED NOT NULL,
 permission_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY(role_id,permission_id),
 FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
 FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
 user_id BIGINT UNSIGNED NOT NULL,
 role_id BIGINT UNSIGNED NOT NULL,
 granted_by BIGINT UNSIGNED NULL,
 granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,role_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE RESTRICT,
 FOREIGN KEY(granted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE,
 device_id VARCHAR(160) NULL,
 ip_hash CHAR(64) NULL,
 user_agent VARCHAR(500) NULL,
 expires_at DATETIME NOT NULL,
 revoked_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 KEY idx_sessions_user_expiry(user_id,expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consent_records (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NULL,
 subject_type VARCHAR(40) NOT NULL,
 subject_public_id CHAR(26) NULL,
 purpose_key VARCHAR(80) NOT NULL,
 notice_version VARCHAR(40) NOT NULL,
 status ENUM('granted','withdrawn','denied') NOT NULL,
 language_code ENUM('en','hi','kn','te','ta','ur') NOT NULL DEFAULT 'en',
 captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 withdrawn_at DATETIME NULL,
 metadata JSON NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_consent_subject(subject_type,subject_public_id,purpose_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS freelancer_profiles (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL UNIQUE,
 city VARCHAR(120) NOT NULL,
 state VARCHAR(120) NULL,
 skills JSON NULL,
 role_interest ENUM('trainee','team_member','team_leader','manager','city_regional_head') NOT NULL DEFAULT 'trainee',
 current_rank ENUM('trainee','team_member','team_leader','manager','city_regional_head') NOT NULL DEFAULT 'trainee',
 onboarding_status ENUM('submitted','contacted','kyc_pending','training_pending','approved','rejected','suspended') NOT NULL DEFAULT 'submitted',
 quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
 active_member_cached TINYINT(1) NOT NULL DEFAULT 0,
 joined_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 KEY idx_freelancer_city_status(city,onboarding_status),
 KEY idx_freelancer_rank_city(current_rank,city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kyc_cases (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NOT NULL,
 case_status ENUM('not_started','submitted','in_review','needs_action','verified','rejected','expired') NOT NULL DEFAULT 'not_started',
 pan_status ENUM('not_checked','pending','passed','failed','manual_review') NOT NULL DEFAULT 'not_checked',
 bank_status ENUM('not_checked','pending','passed','failed','manual_review') NOT NULL DEFAULT 'not_checked',
 selfie_status ENUM('not_checked','pending','passed','failed','manual_review') NOT NULL DEFAULT 'not_checked',
 identity_status ENUM('not_checked','pending','passed','failed','manual_review') NOT NULL DEFAULT 'not_checked',
 reviewer_user_id BIGINT UNSIGNED NULL,
 review_reason VARCHAR(500) NULL,
 submitted_at DATETIME NULL,
 reviewed_at DATETIME NULL,
 expires_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_kyc_queue(case_status,submitted_at),
 KEY idx_kyc_user(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kyc_artifacts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 kyc_case_id BIGINT UNSIGNED NOT NULL,
 artifact_type ENUM('pan_result','bank_proof','selfie_liveness','identity_proof','address_proof','agreement','other') NOT NULL,
 provider_key VARCHAR(80) NULL,
 provider_reference VARCHAR(160) NULL,
 private_storage_key VARCHAR(500) NULL,
 masked_value VARCHAR(160) NULL,
 verification_status ENUM('pending','passed','failed','manual_review') NOT NULL DEFAULT 'pending',
 checksum_sha256 CHAR(64) NULL,
 expires_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(kyc_case_id) REFERENCES kyc_cases(id) ON DELETE RESTRICT,
 KEY idx_kyc_artifact_case(kyc_case_id,artifact_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 legal_name VARCHAR(200) NOT NULL,
 display_name VARCHAR(200) NULL,
 gstin VARCHAR(20) NULL,
 industry VARCHAR(120) NULL,
 city VARCHAR(120) NULL,
 state VARCHAR(120) NULL,
 status ENUM('prospect','active','on_hold','closed') NOT NULL DEFAULT 'prospect',
 billing_address JSON NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_clients_status(status),
 KEY idx_clients_city(city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS client_members (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 client_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 client_role ENUM('client_admin','project_owner','viewer','finance') NOT NULL,
 status ENUM('invited','active','disabled') NOT NULL DEFAULT 'invited',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_client_member(client_id,user_id),
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 team_name VARCHAR(140) NOT NULL,
 city VARCHAR(120) NOT NULL,
 leader_user_id BIGINT UNSIGNED NULL,
 manager_user_id BIGINT UNSIGNED NULL,
 status ENUM('forming','active','at_risk','inactive','closed') NOT NULL DEFAULT 'forming',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(leader_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_teams_city_status(city,status),
 KEY idx_teams_leader(leader_user_id),
 KEY idx_teams_manager(manager_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_memberships (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 team_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 membership_role ENUM('member','leader','manager') NOT NULL DEFAULT 'member',
 status ENUM('invited','active','paused','transferred','removed') NOT NULL DEFAULT 'invited',
 effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 effective_to DATETIME NULL,
 created_by BIGINT UNSIGNED NULL,
 FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_membership_team_status(team_id,status),
 KEY idx_membership_user_status(user_id,status),
 KEY idx_membership_dates(effective_from,effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rank_history (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 from_rank VARCHAR(40) NULL,
 to_rank VARCHAR(40) NOT NULL,
 reason_code VARCHAR(80) NOT NULL,
 reason_text VARCHAR(500) NULL,
 active_member_count INT UNSIGNED NULL,
 quality_score DECIMAL(5,2) NULL,
 changed_by BIGINT UNSIGNED NULL,
 effective_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_rank_user_time(user_id,effective_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referrals (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 referrer_user_id BIGINT UNSIGNED NOT NULL,
 referred_user_id BIGINT UNSIGNED NOT NULL,
 referral_code VARCHAR(80) NOT NULL,
 status ENUM('created','registered','activated','rejected','expired') NOT NULL DEFAULT 'created',
 activated_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_referral_referred(referred_user_id),
 FOREIGN KEY(referrer_user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(referred_user_id) REFERENCES users(id) ON DELETE RESTRICT,
 KEY idx_referral_referrer(referrer_user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 title VARCHAR(200) NOT NULL,
 description TEXT NULL,
 language_code ENUM('en','hi','kn','te','ta','ur') NOT NULL DEFAULT 'en',
 course_type ENUM('foundation','safety','project_specific','refresher') NOT NULL DEFAULT 'foundation',
 pass_mark DECIMAL(5,2) NOT NULL DEFAULT 80,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
 created_by BIGINT UNSIGNED NULL,
 published_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_courses_status(status,course_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_lessons (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 course_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(200) NOT NULL,
 content_type ENUM('text','video','document','link') NOT NULL DEFAULT 'text',
 content_reference VARCHAR(500) NULL,
 sort_order INT UNSIGNED NOT NULL DEFAULT 0,
 is_required TINYINT(1) NOT NULL DEFAULT 1,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
 KEY idx_lesson_order(course_id,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_enrollments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 course_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 status ENUM('enrolled','in_progress','passed','failed','withdrawn') NOT NULL DEFAULT 'enrolled',
 progress_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
 best_score DECIMAL(5,2) NULL,
 enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 completed_at DATETIME NULL,
 UNIQUE KEY uq_course_enrollment(course_id,user_id),
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 KEY idx_enrollment_user_status(user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 enrollment_id BIGINT UNSIGNED NOT NULL,
 score DECIMAL(5,2) NOT NULL,
 passed TINYINT(1) NOT NULL DEFAULT 0,
 answers JSON NOT NULL,
 attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(enrollment_id) REFERENCES course_enrollments(id) ON DELETE RESTRICT,
 KEY idx_quiz_enrollment_time(enrollment_id,attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 enrollment_id BIGINT UNSIGNED NOT NULL,
 certificate_code VARCHAR(100) NOT NULL UNIQUE,
 issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revoked_at DATETIME NULL,
 FOREIGN KEY(enrollment_id) REFERENCES course_enrollments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_types (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 type_key VARCHAR(80) NOT NULL UNIQUE,
 title VARCHAR(180) NOT NULL,
 description TEXT NULL,
 configuration JSON NULL,
 status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_cards (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 version_no INT UNSIGNED NOT NULL,
 project_type_id BIGINT UNSIGNED NOT NULL,
 task_type VARCHAR(100) NOT NULL,
 client_price DECIMAL(12,2) NOT NULL,
 freelancer_pool_amount DECIMAL(12,2) NOT NULL,
 pool_pct DECIMAL(5,2) NOT NULL,
 member_pct DECIMAL(5,2) NOT NULL DEFAULT 70,
 leader_pct DECIMAL(5,2) NOT NULL DEFAULT 20,
 manager_pct DECIMAL(5,2) NOT NULL DEFAULT 10,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 effective_from DATETIME NOT NULL,
 effective_to DATETIME NULL,
 status ENUM('draft','active','retired') NOT NULL DEFAULT 'draft',
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_rate_card_version(project_type_id,task_type,version_no),
 FOREIGN KEY(project_type_id) REFERENCES project_types(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_rate_card_effective(status,effective_from,effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 client_id BIGINT UNSIGNED NOT NULL,
 project_type_id BIGINT UNSIGNED NOT NULL,
 manager_user_id BIGINT UNSIGNED NULL,
 title VARCHAR(220) NOT NULL,
 description TEXT NULL,
 city VARCHAR(120) NOT NULL,
 status ENUM('draft','requested','approved','staffing','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
 target_units INT UNSIGNED NULL,
 starts_at DATETIME NULL,
 ends_at DATETIME NULL,
 budget_amount DECIMAL(14,2) NULL,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 created_by BIGINT UNSIGNED NULL,
 approved_by BIGINT UNSIGNED NULL,
 approved_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
 FOREIGN KEY(project_type_id) REFERENCES project_types(id) ON DELETE RESTRICT,
 FOREIGN KEY(manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_projects_client_status(client_id,status),
 KEY idx_projects_city_status(city,status),
 KEY idx_projects_dates(starts_at,ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_rate_cards (
 project_id BIGINT UNSIGNED NOT NULL,
 rate_card_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY(project_id,rate_card_id),
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
 FOREIGN KEY(rate_card_id) REFERENCES rate_cards(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_members (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 assigned_by BIGINT UNSIGNED NULL,
 status ENUM('invited','applied','approved','active','paused','completed','removed') NOT NULL DEFAULT 'applied',
 joined_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_project_member(project_id,user_id),
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_project_members_user(user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_form_templates (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 project_type_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(180) NOT NULL,
 version_no INT UNSIGNED NOT NULL DEFAULT 1,
 schema_json JSON NOT NULL,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_form_version(project_type_id,name,version_no),
 FOREIGN KEY(project_type_id) REFERENCES project_types(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 project_id BIGINT UNSIGNED NOT NULL,
 assigned_user_id BIGINT UNSIGNED NULL,
 assigned_by BIGINT UNSIGNED NULL,
 rate_card_id BIGINT UNSIGNED NOT NULL,
 form_template_id BIGINT UNSIGNED NULL,
 chain_leader_user_id BIGINT UNSIGNED NULL,
 chain_manager_user_id BIGINT UNSIGNED NULL,
 task_type VARCHAR(100) NOT NULL,
 title VARCHAR(220) NOT NULL,
 status ENUM('open','assigned','in_progress','submitted','rework','qc_pending','approved','rejected','cancelled') NOT NULL DEFAULT 'open',
 due_at DATETIME NULL,
 approved_submission_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
 FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(rate_card_id) REFERENCES rate_cards(id) ON DELETE RESTRICT,
 FOREIGN KEY(form_template_id) REFERENCES task_form_templates(id) ON DELETE SET NULL,
 FOREIGN KEY(chain_leader_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(chain_manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_tasks_assignee_status(assigned_user_id,status),
 KEY idx_tasks_project_status(project_id,status),
 KEY idx_tasks_due(status,due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_submissions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 task_id BIGINT UNSIGNED NOT NULL,
 submitted_by BIGINT UNSIGNED NOT NULL,
 form_data JSON NOT NULL,
 captured_at DATETIME NULL,
 device_received_at DATETIME NULL,
 server_received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 device_id VARCHAR(160) NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 location_accuracy_m DECIMAL(8,2) NULL,
 offline_submission TINYINT(1) NOT NULL DEFAULT 0,
 submission_hash CHAR(64) NULL,
 status ENUM('submitted','qc_pending','approved','rework','rejected','superseded') NOT NULL DEFAULT 'submitted',
 FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
 FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
 KEY idx_submission_task_time(task_id,server_received_at),
 KEY idx_submission_status(status,server_received_at),
 KEY idx_submission_hash(submission_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evidence_files (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 submission_id BIGINT UNSIGNED NOT NULL,
 evidence_type ENUM('photo','document','video','signature','other') NOT NULL DEFAULT 'photo',
 private_storage_key VARCHAR(500) NOT NULL,
 mime_type VARCHAR(120) NOT NULL,
 size_bytes BIGINT UNSIGNED NOT NULL,
 checksum_sha256 CHAR(64) NOT NULL,
 captured_at DATETIME NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 metadata JSON NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE RESTRICT,
 KEY idx_evidence_submission(submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qc_reviews (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 submission_id BIGINT UNSIGNED NOT NULL,
 reviewer_user_id BIGINT UNSIGNED NULL,
 review_type ENUM('automated','human','client') NOT NULL DEFAULT 'human',
 result ENUM('pending','approved','rework','rejected','flagged') NOT NULL DEFAULT 'pending',
 score DECIMAL(5,2) NULL,
 reason_code VARCHAR(80) NULL,
 reason_text VARCHAR(500) NULL,
 reviewed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE RESTRICT,
 FOREIGN KEY(reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_qc_queue(result,created_at),
 KEY idx_qc_submission(submission_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fraud_flags (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NULL,
 task_id BIGINT UNSIGNED NULL,
 submission_id BIGINT UNSIGNED NULL,
 rule_key VARCHAR(100) NOT NULL,
 severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
 status ENUM('open','under_review','confirmed','dismissed') NOT NULL DEFAULT 'open',
 evidence JSON NULL,
 reviewed_by BIGINT UNSIGNED NULL,
 resolution_note VARCHAR(500) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 resolved_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL,
 FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE SET NULL,
 FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_fraud_status_severity(status,severity,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_score_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 task_id BIGINT UNSIGNED NULL,
 source_key VARCHAR(80) NOT NULL,
 score_delta DECIMAL(7,2) NOT NULL,
 score_after DECIMAL(5,2) NOT NULL,
 reason VARCHAR(500) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL,
 KEY idx_quality_user_time(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_accounts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 account_code VARCHAR(80) NOT NULL UNIQUE,
 account_name VARCHAR(180) NOT NULL,
 account_type ENUM('asset','liability','equity','revenue','expense','clearing') NOT NULL,
 owner_user_id BIGINT UNSIGNED NULL,
 client_id BIGINT UNSIGNED NULL,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 is_system TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
 KEY idx_ledger_owner(owner_user_id),
 KEY idx_ledger_client(client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_journals (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 source_type VARCHAR(80) NOT NULL,
 source_public_id CHAR(26) NOT NULL,
 idempotency_key VARCHAR(160) NOT NULL UNIQUE,
 description VARCHAR(500) NULL,
 status ENUM('draft','posted','reversed') NOT NULL DEFAULT 'draft',
 posted_at DATETIME NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_journal_source(source_type,source_public_id),
 KEY idx_journal_status_time(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_lines (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 journal_id BIGINT UNSIGNED NOT NULL,
 account_id BIGINT UNSIGNED NOT NULL,
 debit DECIMAL(14,2) NOT NULL DEFAULT 0,
 credit DECIMAL(14,2) NOT NULL DEFAULT 0,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 task_id BIGINT UNSIGNED NULL,
 reversal_of_line_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(journal_id) REFERENCES ledger_journals(id) ON DELETE RESTRICT,
 FOREIGN KEY(account_id) REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
 FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL,
 FOREIGN KEY(reversal_of_line_id) REFERENCES ledger_lines(id) ON DELETE RESTRICT,
 KEY idx_ledger_lines_account(account_id,created_at),
 KEY idx_ledger_lines_task(task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS earning_allocations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 task_id BIGINT UNSIGNED NOT NULL,
 submission_id BIGINT UNSIGNED NOT NULL,
 beneficiary_user_id BIGINT UNSIGNED NULL,
 beneficiary_type ENUM('member','leader','manager','growth_pool') NOT NULL,
 rate_card_id BIGINT UNSIGNED NOT NULL,
 pool_amount DECIMAL(12,2) NOT NULL,
 allocation_pct DECIMAL(5,2) NOT NULL,
 gross_amount DECIMAL(12,2) NOT NULL,
 status ENUM('pending_qc','approved','held','reversed','paid') NOT NULL DEFAULT 'pending_qc',
 approved_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
 FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE RESTRICT,
 FOREIGN KEY(beneficiary_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(rate_card_id) REFERENCES rate_cards(id) ON DELETE RESTRICT,
 KEY idx_alloc_beneficiary_status(beneficiary_user_id,status),
 KEY idx_alloc_task(task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserve_holds (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 allocation_id BIGINT UNSIGNED NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 status ENUM('held','released','forfeited') NOT NULL DEFAULT 'held',
 held_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 release_at DATETIME NOT NULL,
 released_at DATETIME NULL,
 reason VARCHAR(300) NULL,
 FOREIGN KEY(allocation_id) REFERENCES earning_allocations(id) ON DELETE RESTRICT,
 KEY idx_reserve_release(status,release_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payout_batches (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 cycle ENUM('daily','weekly','monthly','manual') NOT NULL,
 status ENUM('draft','review','approved','processing','completed','failed','cancelled') NOT NULL DEFAULT 'draft',
 total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 total_tds DECIMAL(14,2) NOT NULL DEFAULT 0,
 created_by BIGINT UNSIGNED NULL,
 approved_by BIGINT UNSIGNED NULL,
 approved_at DATETIME NULL,
 processed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_payout_batch_status(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payouts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 batch_id BIGINT UNSIGNED NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 amount DECIMAL(14,2) NOT NULL,
 tds_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 provider_key VARCHAR(80) NULL,
 provider_reference VARCHAR(180) NULL,
 utr VARCHAR(100) NULL,
 idempotency_key VARCHAR(160) NOT NULL UNIQUE,
 status ENUM('queued','approved','processing','paid','failed','reversed','cancelled') NOT NULL DEFAULT 'queued',
 failure_reason VARCHAR(500) NULL,
 requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 paid_at DATETIME NULL,
 FOREIGN KEY(batch_id) REFERENCES payout_batches(id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 KEY idx_payout_user_status(user_id,status,requested_at),
 KEY idx_payout_status(status,requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 invoice_number VARCHAR(80) NOT NULL UNIQUE,
 client_id BIGINT UNSIGNED NOT NULL,
 project_id BIGINT UNSIGNED NULL,
 status ENUM('draft','issued','part_paid','paid','overdue','void') NOT NULL DEFAULT 'draft',
 subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
 tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 issued_at DATETIME NULL,
 due_at DATETIME NULL,
 paid_at DATETIME NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_invoice_client_status(client_id,status),
 KEY idx_invoice_due(status,due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_lines (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 invoice_id BIGINT UNSIGNED NOT NULL,
 description VARCHAR(300) NOT NULL,
 quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
 unit_price DECIMAL(14,2) NOT NULL,
 tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
 line_total DECIMAL(14,2) NOT NULL,
 project_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enquiries (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 full_name VARCHAR(160) NOT NULL,
 company_name VARCHAR(200) NULL,
 email VARCHAR(254) NULL,
 phone VARCHAR(30) NOT NULL,
 city VARCHAR(120) NOT NULL,
 enquiry_type VARCHAR(80) NOT NULL,
 service_required VARCHAR(160) NOT NULL,
 message TEXT NULL,
 source VARCHAR(120) NULL,
 utm_source VARCHAR(160) NULL,
 utm_medium VARCHAR(160) NULL,
 utm_campaign VARCHAR(160) NULL,
 consent_given TINYINT(1) NOT NULL DEFAULT 0,
 consent_text_version VARCHAR(40) NULL,
 status ENUM('new','assigned','contacted','qualified','proposal','converted','closed','spam') NOT NULL DEFAULT 'new',
 assigned_to BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_enquiries_status_created(status,created_at),
 KEY idx_enquiries_city(city),
 KEY idx_enquiries_assignee(assigned_to,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_activities (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 enquiry_id BIGINT UNSIGNED NULL,
 client_id BIGINT UNSIGNED NULL,
 assigned_user_id BIGINT UNSIGNED NULL,
 activity_type ENUM('call','email','whatsapp','meeting','note','follow_up','status_change') NOT NULL,
 subject VARCHAR(200) NOT NULL,
 details TEXT NULL,
 due_at DATETIME NULL,
 completed_at DATETIME NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL,
 FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_crm_due(assigned_user_id,due_at,completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NULL,
 audience_type VARCHAR(40) NULL,
 channel ENUM('in_app','push','whatsapp','sms','email') NOT NULL,
 template_key VARCHAR(100) NOT NULL,
 payload JSON NULL,
 status ENUM('queued','sent','delivered','failed','cancelled') NOT NULL DEFAULT 'queued',
 provider_reference VARCHAR(180) NULL,
 failure_reason VARCHAR(500) NULL,
 scheduled_at DATETIME NULL,
 sent_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_notification_queue(status,scheduled_at),
 KEY idx_notification_user(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 raised_by BIGINT UNSIGNED NOT NULL,
 client_id BIGINT UNSIGNED NULL,
 project_id BIGINT UNSIGNED NULL,
 category VARCHAR(80) NOT NULL,
 priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
 status ENUM('open','assigned','in_progress','waiting_user','escalated','resolved','closed') NOT NULL DEFAULT 'open',
 assigned_to BIGINT UNSIGNED NULL,
 subject VARCHAR(220) NOT NULL,
 description TEXT NOT NULL,
 sla_due_at DATETIME NULL,
 resolved_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(raised_by) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
 FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_ticket_queue(status,priority,sla_due_at),
 KEY idx_ticket_raiser(raised_by,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ticket_id BIGINT UNSIGNED NOT NULL,
 author_user_id BIGINT UNSIGNED NULL,
 message TEXT NOT NULL,
 internal_note TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE RESTRICT,
 FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_ticket_messages(ticket_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 public_id CHAR(26) NOT NULL UNIQUE,
 client_id BIGINT UNSIGNED NOT NULL,
 endpoint_url VARCHAR(1000) NOT NULL,
 secret_reference VARCHAR(200) NOT NULL,
 subscribed_events JSON NOT NULL,
 status ENUM('active','paused','disabled') NOT NULL DEFAULT 'active',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
 KEY idx_webhook_client_status(client_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 endpoint_id BIGINT UNSIGNED NOT NULL,
 event_key VARCHAR(100) NOT NULL,
 event_public_id CHAR(26) NOT NULL,
 payload JSON NOT NULL,
 attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
 response_code SMALLINT UNSIGNED NULL,
 status ENUM('queued','delivered','retrying','failed') NOT NULL DEFAULT 'queued',
 next_attempt_at DATETIME NULL,
 delivered_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE RESTRICT,
 UNIQUE KEY uq_webhook_event(endpoint_id,event_public_id),
 KEY idx_webhook_delivery_queue(status,next_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 event_id CHAR(26) NOT NULL UNIQUE,
 actor_user_id BIGINT UNSIGNED NULL,
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(80) NOT NULL,
 entity_public_id CHAR(26) NULL,
 reason VARCHAR(500) NULL,
 details JSON NULL,
 request_id VARCHAR(80) NULL,
 ip_hash CHAR(64) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
 KEY idx_audit_entity(entity_type,entity_public_id),
 KEY idx_audit_actor_time(actor_user_id,created_at),
 KEY idx_audit_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 setting_key VARCHAR(120) NOT NULL UNIQUE,
 setting_value JSON NOT NULL,
 description VARCHAR(300) NULL,
 is_sensitive TINYINT(1) NOT NULL DEFAULT 0,
 updated_by BIGINT UNSIGNED NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed baseline roles only. Permission grants and role assignments are performed through controlled migrations.
INSERT IGNORE INTO roles(role_key,display_name,role_scope) VALUES
 ('trainee','Trainee','freelancer'),
 ('team_member','Team Member','freelancer'),
 ('team_leader','Team Leader','freelancer'),
 ('manager','Manager','freelancer'),
 ('city_regional_head','City / Regional Head','freelancer'),
 ('client_admin','Client Admin','client'),
 ('project_owner','Project Owner','client'),
 ('client_viewer','Client Viewer','client'),
 ('client_finance','Client Finance','client'),
 ('ops_admin','Operations','platform'),
 ('kyc_reviewer','KYC Reviewer','platform'),
 ('qc_lead','QC Lead','platform'),
 ('finance_admin','Finance','platform'),
 ('support_admin','Support','platform'),
 ('content_academy_admin','Content & Academy','platform'),
 ('sales_crm_admin','Sales & CRM','platform'),
 ('super_admin','Super Admin','platform');

-- Integrity rules enforced in application transactions:
-- 1) A ledger journal may be posted only when total debits equal total credits.
-- 2) Posted ledger journals and audit events are append-only; corrections use reversal entries.
-- 3) 70/20/10 is applied to the freelancer pool, not client price; missing leader/manager shares go to Growth Pool.
-- 4) The chain leader/manager is snapshotted on task assignment/approval; do not recalculate old earnings using current hierarchy.
-- 5) Active freelancer = valid KYC, quality score >= 70, no confirmed/open blocking fraud flag, and >=1 QC-approved task in prior 30 days.
-- 6) Team Leader threshold: >=10 active members and quality score >=85. Manager: >=3 teams with >=10 active members each and quality score >=85.
-- 7) Configurable reserve period defaults to 15 days in application settings; never hard-code release without checks.
-- 8) Do not store passwords, OTP values, bearer tokens, full Aadhaar numbers, or public URLs for private evidence.
-- 9) Payout execution requires a licensed provider, idempotency, dual approval, reconciliation, and provider-side beneficiary validation.
