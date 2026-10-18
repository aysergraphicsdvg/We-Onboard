-- We Onboard Safe Migration 001: Upgrade Settings & Indices
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Ensure site_settings keys exist
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('headerLogoUrl', ''), ('footerLogoUrl', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- 2. Safely create idx_audit_time on audit_logs if not already present
-- Note: MySQL 8.0 does not support 'CREATE INDEX IF NOT EXISTS'. 
-- This conditional dynamic SQL block works safely on all MySQL and MariaDB versions.
SET @exist := (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'audit_logs' 
      AND index_name = 'idx_audit_time'
);
SET @sqlstmt := IF(@exist = 0, 
    'CREATE INDEX `idx_audit_time` ON `audit_logs` (`created_at`)', 
    'SELECT "Index idx_audit_time already exists on audit_logs" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
