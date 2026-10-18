#!/usr/bin/env bash
# ==============================================================================
# WE ONBOARD — Hostinger SSH & Shell Smoke Test Suite (Phase 2.3 Hardened)
# ==============================================================================
# Usage:
#   chmod +x scripts/hostinger_smoke_test.sh
#   ./scripts/hostinger_smoke_test.sh
#   API_BASE=https://api.weonboard.in/v1 ./scripts/hostinger_smoke_test.sh
# ==============================================================================

set -u

API_BASE="${API_BASE:-https://api.weonboard.in/v1}"
ORIGIN_APPROVED="https://weonboard.in"
ORIGIN_UNAPPROVED="https://unauthorized-attacker-domain.org"

echo "=========================================================="
echo "WE ONBOARD — HOSTINGER LIVE SMOKE TEST SUITE (PHASE 2.3)"
echo "Target Base URL: ${API_BASE}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="
echo ""

PASSED=0
FAILED=0

run_check() {
    local name="$1"
    local expected_code="$2"
    local actual_code="$3"
    local notes="$4"

    if [[ "$actual_code" == "000" ]]; then
        echo -e "\e[31m[FAIL]\e[0m ${name} (Network Error / Unreachable: HTTP 000) — ${notes}"
        ((FAILED++))
        return
    fi

    if [[ "$actual_code" =~ ^($expected_code)$ ]]; then
        echo -e "\e[32m[PASS]\e[0m ${name} (HTTP ${actual_code}) — ${notes}"
        ((PASSED++))
    else
        echo -e "\e[31m[FAIL]\e[0m ${name} (Expected: ${expected_code}, Got: ${actual_code}) — ${notes}"
        ((FAILED++))
    fi
}

# 1. Health Probe — HTTP 200 required; 503 is reported as a deployment failure!
echo "1. Probing GET ${API_BASE}/health.php..."
HEALTH_BODY_FILE="/tmp/weonboard_health_body.json"
HEALTH_STATUS=$(curl -s -m 10 -o "$HEALTH_BODY_FILE" -w "%{http_code}" "${API_BASE}/health.php" || echo "000")

if [[ "$HEALTH_STATUS" == "200" ]]; then
    DB_STATUS=$(grep -o '"database":"[^"]*"' "$HEALTH_BODY_FILE" 2>/dev/null | cut -d'"' -f4)
    if [[ "$DB_STATUS" == "available" ]]; then
        run_check "Health & Database Readiness" "200" "$HEALTH_STATUS" "Database operational (status: healthy)"
    else
        echo -e "\e[31m[FAIL]\e[0m Health Probe returned HTTP 200 but database is '${DB_STATUS}'"
        ((FAILED++))
    fi
elif [[ "$HEALTH_STATUS" == "503" ]]; then
    echo -e "\e[31m[FAIL]\e[0m DEPLOYMENT BLOCKER: Database is offline/degraded (HTTP 503)"
    ((FAILED++))
else
    run_check "Health Probe" "200" "$HEALTH_STATUS" "Unexpected response"
fi

# 2. CORS Preflight - Approved Origin
echo "2. Testing CORS preflight from ${ORIGIN_APPROVED}..."
CORS_RES=$(curl -s -m 10 -i -X OPTIONS "${API_BASE}/health.php" \
  -H "Origin: ${ORIGIN_APPROVED}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, X-Idempotency-Key" 2>/dev/null || echo "")

CORS_CODE=$(echo "$CORS_RES" | grep -i "^HTTP" | awk '{print $2}' | tail -n 1)
CORS_ALLOW_ORIGIN=$(echo "$CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\r' | awk '{print $2}')

if [[ -z "$CORS_CODE" ]]; then CORS_CODE="000"; fi

if [[ "$CORS_ALLOW_ORIGIN" == "$ORIGIN_APPROVED" ]]; then
    run_check "CORS Approved Origin Preflight" "200|204" "$CORS_CODE" "Access-Control-Allow-Origin: ${CORS_ALLOW_ORIGIN}"
else
    run_check "CORS Approved Origin Preflight" "204" "$CORS_CODE" "Origin header missing or rejected"
fi

# 3. CORS Preflight - Unapproved Origin Rejection
echo "3. Testing CORS preflight from unapproved origin..."
BAD_CORS_RES=$(curl -s -m 10 -i -X OPTIONS "${API_BASE}/health.php" \
  -H "Origin: ${ORIGIN_UNAPPROVED}" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")

BAD_CORS_CODE=$(echo "$BAD_CORS_RES" | grep -i "^HTTP" | awk '{print $2}' | tail -n 1)
BAD_ALLOW_ORIGIN=$(echo "$BAD_CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\r' | awk '{print $2}')

if [[ -z "$BAD_CORS_CODE" ]]; then
    echo -e "\e[31m[FAIL]\e[0m CORS Unapproved Origin: Network connection failed (unverified)"
    ((FAILED++))
elif [[ -z "$BAD_ALLOW_ORIGIN" || "$BAD_ALLOW_ORIGIN" == "null" ]]; then
    run_check "CORS Unapproved Origin Rejection" "403|204" "$BAD_CORS_CODE" "Access-Control-Allow-Origin correctly omitted"
else
    echo -e "\e[31m[FAIL]\e[0m SECURITY ISSUE: Unapproved origin permitted: ${BAD_ALLOW_ORIGIN}"
    ((FAILED++))
fi

# 4. Unauthenticated Rejection
echo "4. Probing protected endpoint without session..."
AUTH_CODE=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "${API_BASE}/auth/me.php" || echo "000")
run_check "Unauthenticated Access Rejection (/auth/me.php)" "401" "$AUTH_CODE" "Expected HTTP 401 Unauthorized"

# 5. Bad Credentials Rejection
echo "5. Testing invalid credentials at ${API_BASE}/auth/login.php..."
LOGIN_CODE=$(curl -s -m 10 -o /tmp/weonboard_login_res.json -w "%{http_code}" -X POST "${API_BASE}/auth/login.php" \
  -H "Content-Type: application/json" \
  -H "Origin: ${ORIGIN_APPROVED}" \
  -d '{"email":"synthetic-bad-user-check@weonboard.in","password":"WrongPassword123!"}' || echo "000")
run_check "Invalid Credentials Rejection" "401" "$LOGIN_CODE" "Generic error returned"

# 6. Direct Configuration File Download Block
echo "6. Testing Apache protection on config.php..."
ROOT_URL="${API_BASE%/v1}"
CONFIG_CODE=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "${ROOT_URL}/config/config.php" || echo "000")
run_check "Protected File Blocking (/config/config.php)" "403|404" "$CONFIG_CODE" "PHP source not leaked"

# 7. Summary & Exit Code
echo ""
echo "=========================================================="
echo "TEST RESULTS: ${PASSED} Passed | ${FAILED} Failed"
echo "=========================================================="
if [ "$FAILED" -gt 0 ]; then
    echo "STATUS: NOT READY FOR PRODUCTION"
    echo "Review failures and inspect logs under Hostinger hPanel -> Access/Error Logs."
    exit 1
else
    echo "STATUS: ALL SMOKE TESTS PASSED"
    exit 0
fi
