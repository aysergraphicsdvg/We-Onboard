-- We Onboard Non-Destructive Migration 002: Idempotency & Duplicate Prevention
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.x+
-- Safe for repeated execution without data loss

-- 1. Create idempotency_keys table for concurrent & repeated submission protection
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

-- 2. Safely create idx_converted_client on enquiries if column exists and index is absent
-- Compatible with both MySQL 8.0+ and MariaDB
SET @exist := (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'enquiries' 
      AND index_name = 'idx_converted_client'
);
SET @col_exist := (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'enquiries' 
      AND column_name = 'converted_client_id'
);
SET @sqlstmt := IF(@exist = 0 AND @col_exist > 0, 
    'CREATE INDEX `idx_converted_client` ON `enquiries` (`converted_client_id`)', 
    'SELECT "Index idx_converted_client already exists or converted_client_id column not present" AS status'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
