-- We Onboard initial schema. Review and back up any existing database before import.
-- Compatible with MySQL 8.0+ / MariaDB versions supporting InnoDB and utf8mb4.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(26) NOT NULL,
  email VARCHAR(254) NULL,
  phone_e164 VARCHAR(20) NULL,
  full_name VARCHAR(160) NOT NULL,
  user_type ENUM('freelancer','client','staff','super_admin') NOT NULL,
  status ENUM('pending','active','suspended','closed') NOT NULL DEFAULT 'pending',
  email_verified_at DATETIME NULL,
  phone_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone_e164),
  KEY idx_users_type_status (user_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enquiries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(26) NOT NULL,
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
  status ENUM('new','contacted','qualified','proposal','converted','closed') NOT NULL DEFAULT 'new',
  assigned_to BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enquiries_public_id (public_id),
  KEY idx_enquiries_status_created (status, created_at),
  KEY idx_enquiries_city (city),
  CONSTRAINT fk_enquiries_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS freelancer_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  preferred_role ENUM('team_member','team_leader','manager','city_regional_head') NOT NULL DEFAULT 'team_member',
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NULL,
  skills JSON NULL,
  preferred_language ENUM('en','hi','kn','te','ta','ur') NOT NULL DEFAULT 'en',
  onboarding_status ENUM('submitted','contacted','kyc_pending','training_pending','approved','rejected','suspended') NOT NULL DEFAULT 'submitted',
  consent_given TINYINT(1) NOT NULL DEFAULT 0,
  consent_text_version VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_freelancer_user (user_id),
  KEY idx_freelancer_city_status (city, onboarding_status),
  CONSTRAINT fk_freelancer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id CHAR(26) NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_public_id CHAR(26) NULL,
  details JSON NULL,
  request_id VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_event_id (event_id),
  KEY idx_audit_entity (entity_type, entity_public_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security note: application database users should not receive UPDATE/DELETE privileges on audit_events in production.
-- Never store passwords, OTPs, access tokens, full Aadhaar numbers or raw identity documents in these tables.
