-- We Onboard Reversible Migration 001
-- Safe update script for existing installations without data loss

-- Check and add header_logo_url / footer_logo_url in site_settings
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('headerLogoUrl', ''), ('footerLogoUrl', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Ensure audit_logs index
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (created_at);
