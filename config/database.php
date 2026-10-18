<?php
require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Fail closed: Require explicit server-side database configuration
            if (empty(DB_NAME) || empty(DB_USER) || DB_PASS === '') {
                error_log("[SECURITY/CONFIG ERROR] Database credentials are not configured on this server. DB_NAME, DB_USER, and DB_PASS must be provided via environment variables or server config.");
                throw new RuntimeException("Database configuration is missing or incomplete. Server administrator must configure credentials.");
            }

            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Log detailed diagnostic information privately to the server error log
                error_log("[Database Connection Error] Host: " . DB_HOST . ", DB: " . DB_NAME . ", User: " . DB_USER . " - " . $e->getMessage());
                // Never rethrow raw PDOException containing credentials to callers
                throw new RuntimeException("Database connection failure. Please verify server connectivity.");
            }
        }
        return self::$instance;
    }
}
