-- We Onboard Non-Destructive Migration 002: Idempotency & Duplicate Prevention
-- Safe update script for existing Hostinger databases without data loss

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

-- 2. Ensure index on enquiries.converted_client_id
CREATE INDEX IF NOT EXISTS idx_converted_client ON enquiries (converted_client_id);
