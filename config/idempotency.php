<?php
/**
 * We Onboard Concurrency-Safe Idempotency Manager
 * 
 * Provides atomic reservation, payload hash validation,
 * transaction coordination, and conflict resolution across concurrent requests.
 */

class Idempotency {
    const STATUS_RESERVED    = 'RESERVED';
    const STATUS_HIT         = 'HIT';
    const STATUS_CONFLICT    = 'CONFLICT';
    const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    const STATUS_NONE        = 'NONE';
    const STATUS_INVALID     = 'INVALID';

    const PENDING_SENTINEL   = '__IDEMPOTENCY_IN_PROGRESS__';

    /**
     * Validates key format (8-64 alphanumeric, dash, underscore)
     */
    public static function isValidKey(string $key): bool {
        return (bool) preg_match('/^[A-Za-z0-9_\-]{8,64}$/', $key);
    }

    /**
     * Atomically reserves an idempotency key or returns cached/conflict state.
     *
     * @param PDO $db
     * @param string $key
     * @param string $endpoint
     * @param string $payloadHash
     * @return array [
     *   'status' => 'RESERVED' | 'HIT' | 'CONFLICT' | 'IN_PROGRESS' | 'NONE' | 'INVALID',
     *   'response_json' => string | null,
     *   'error' => string | null
     * ]
     */
    public static function reserve(PDO $db, string $key, string $endpoint, string $payloadHash): array {
        if (empty($key)) {
            return ['status' => self::STATUS_NONE, 'response_json' => null, 'error' => null];
        }

        if (!self::isValidKey($key)) {
            return [
                'status' => self::STATUS_INVALID,
                'response_json' => null,
                'error' => 'Invalid idempotency key format. Must be 8-64 alphanumeric characters, underscores, or hyphens.'
            ];
        }

        // Fast-path: Check if key already exists
        $stmt = $db->prepare("SELECT endpoint, request_payload_hash, response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
        $stmt->execute([$key]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            return self::resolveExisting($db, $existing, $key, $endpoint, $payloadHash);
        }

        // Atomically attempt reservation via unique INSERT
        try {
            $insert = $db->prepare("INSERT INTO idempotency_keys (idempotency_key, endpoint, request_payload_hash, response_json) VALUES (?, ?, ?, ?)");
            $insert->execute([$key, $endpoint, $payloadHash, self::PENDING_SENTINEL]);
            return ['status' => self::STATUS_RESERVED, 'response_json' => null, 'error' => null];
        } catch (PDOException $e) {
            // Duplicate key race: another concurrent request inserted just ahead of us
            if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate entry') !== false) {
                $stmt = $db->prepare("SELECT endpoint, request_payload_hash, response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
                $stmt->execute([$key]);
                $raceWinner = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($raceWinner) {
                    return self::resolveExisting($db, $raceWinner, $key, $endpoint, $payloadHash);
                }
            }
            throw $e;
        }
    }

    /**
     * Resolves an existing key: checks endpoint/payload match and completion status.
     */
    private static function resolveExisting(PDO $db, array $record, string $key, string $endpoint, string $payloadHash): array {
        // 1. Conflict Check: Different endpoint OR different payload hash
        if ($record['endpoint'] !== $endpoint || !hash_equals($record['request_payload_hash'], $payloadHash)) {
            return [
                'status' => self::STATUS_CONFLICT,
                'response_json' => null,
                'error' => 'Idempotency conflict: The provided idempotency key has already been used with a different endpoint or request payload.'
            ];
        }

        // 2. Completed: Original request already finished successfully
        if ($record['response_json'] !== self::PENDING_SENTINEL) {
            return [
                'status' => self::STATUS_HIT,
                'response_json' => $record['response_json'],
                'error' => null
            ];
        }

        // 3. In-flight: Wait up to 1.5 seconds (15 * 100ms) for the in-progress request to complete
        for ($i = 0; $i < 15; $i++) {
            usleep(100000); // 100ms
            $check = $db->prepare("SELECT response_json FROM idempotency_keys WHERE idempotency_key = ? LIMIT 1");
            $check->execute([$key]);
            $updated = $check->fetchColumn();
            if ($updated && $updated !== self::PENDING_SENTINEL) {
                return [
                    'status' => self::STATUS_HIT,
                    'response_json' => $updated,
                    'error' => null
                ];
            }
        }

        return [
            'status' => self::STATUS_IN_PROGRESS,
            'response_json' => null,
            'error' => 'A request with this idempotency key is currently being processed. Please retry shortly.'
        ];
    }

    /**
     * Stores the final successful response for the reserved idempotency key.
     */
    public static function commit(PDO $db, string $key, string $responseJson): void {
        if (empty($key)) return;
        $stmt = $db->prepare("UPDATE idempotency_keys SET response_json = ? WHERE idempotency_key = ?");
        $stmt->execute([$responseJson, $key]);
    }

    /**
     * Releases reservation if the request failed or rolled back.
     */
    public static function release(PDO $db, string $key): void {
        if (empty($key)) return;
        try {
            $stmt = $db->prepare("DELETE FROM idempotency_keys WHERE idempotency_key = ? AND response_json = ?");
            $stmt->execute([$key, self::PENDING_SENTINEL]);
        } catch (Exception $e) {
            error_log("[Idempotency Release Error] " . $e->getMessage());
        }
    }
}
