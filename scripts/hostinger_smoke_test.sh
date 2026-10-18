#!/usr/bin/env bash
# ==============================================================================
# WE ONBOARD — Hostinger SSH & Shell Smoke Test Suite
# ==============================================================================
# Usage:
#   chmod +x scripts/hostinger_smoke_test.sh
#   ./scripts/hostinger_smoke_test.sh
#   API_BASE=https://api.weonboard.in/v1 ./scripts/hostinger_smoke_test.sh
# ==============================================================================

set -u

API_BASE="${API_BASE:-https://api.weonboard.in/v1}"
ORIGIN_APPROVED="https://weonboard.in"
ORIGIN_UNAPPROVED="https://malicious-test-origin.org"

echo "=========================================================="
echo "WE ONBOARD — HOSTINGER LIVE SMOKE TEST SUITE"
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

    if [[ "$actual_code" =~ $expected_code ]]; then
        echo -e "\e[32m[PASS]\e[0m ${name} (HTTP ${actual_code}) — ${notes}"
        ((PASSED++))
    else
        echo -e "\e[31m[FAIL]\e[0m ${name} (Expected: ${expected_code}, Got: ${actual_code}) — ${notes}"
        ((FAILED++))
    fi
}

# 1. Health Probe
echo "1. Probing GET ${API_BASE}/health.php..."
HEALTH_STATUS=$(curl -s -o /tmp/health_body.json -w "%{http_code}" "${API_BASE}/health.php")
run_check "Health Probe" "(200|503)" "$HEALTH_STATUS" "$(cat /tmp/health_body.json 2>/dev/null | cut -c 1-80)"

# 2. CORS Preflight - Approved Origin
echo "2. Testing CORS preflight from ${ORIGIN_APPROVED}..."
CORS_RES=$(curl -s -i -X OPTIONS "${API_BASE}/health.php" \
  -H "Origin: ${ORIGIN_APPROVED}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, X-Idempotency-Key")
CORS_CODE=$(echo "$CORS_RES" | grep -i "^HTTP" | awk '{print $2}')
CORS_ALLOW_ORIGIN=$(echo "$CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\r' | awk '{print $2}')

if [[ "$CORS_ALLOW_ORIGIN" == "$ORIGIN_APPROVED" ]]; then
    run_check "CORS Approved Origin" "(200|204)" "$CORS_CODE" "Access-Control-Allow-Origin: ${CORS_ALLOW_ORIGIN}"
else
    run_check "CORS Approved Origin" "204" "$CORS_CODE" "Origin mismatch or missing header"
fi

# 3. CORS Preflight - Unapproved Origin Rejection
echo "3. Testing CORS preflight from unapproved origin..."
BAD_CORS_RES=$(curl -s -i -X OPTIONS "${API_BASE}/health.php" \
  -H "Origin: ${ORIGIN_UNAPPROVED}" \
  -H "Access-Control-Request-Method: GET")
BAD_ALLOW_ORIGIN=$(echo "$BAD_CORS_RES" | grep -i "^access-control-allow-origin:" | tr -d '\r' | awk '{print $2}')

if [[ -z "$BAD_ALLOW_ORIGIN" || "$BAD_ALLOW_ORIGIN" == "null" ]]; then
    echo -e "\e[32m[PASS]\e[0m CORS Unapproved Origin correctly rejected (no allow-origin returned)"
    ((PASSED++))
else
    echo -e "\e[31m[FAIL]\e[0m SECURITY ISSUE: Unapproved origin permitted: ${BAD_ALLOW_ORIGIN}"
    ((FAILED++))
fi

# 4. Unauthenticated Rejection
echo "4. Probing protected endpoint without session..."
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/auth/me.php")
run_check "Unauthenticated Access Rejection" "401" "$AUTH_CODE" "Expected HTTP 401 Unauthorized"

# 5. Bad Credentials Rejection
echo "5. Testing invalid credentials at ${API_BASE}/auth/login.php..."
LOGIN_CODE=$(curl -s -o /tmp/login_res.json -w "%{http_code}" -X POST "${API_BASE}/auth/login.php" \
  -H "Content-Type: application/json" \
  -H "Origin: ${ORIGIN_APPROVED}" \
  -d '{"email":"synthetic-bad-user@weonboard.in","password":"WrongPassword123!"}')
run_check "Invalid Credentials Rejection" "401" "$LOGIN_CODE" "Generic error returned"

# 6. Direct Configuration File Download Block
echo "6. Testing Apache protection on config.php..."
ROOT_URL="${API_BASE%/v1}"
CONFIG_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${ROOT_URL}/config/config.php")
run_check "Protected File Blocking (/config/config.php)" "(403|404)" "$CONFIG_CODE" "PHP source not leaked"

# 7. Summary
echo ""
echo "=========================================================="
echo "TEST RESULTS: ${PASSED} Passed | ${FAILED} Failed"
echo "=========================================================="
if [ $FAILED -gt 0 ]; then
    echo "Review failures and inspect logs under Hostinger hPanel -> Access/Error Logs."
    exit 1
else
    echo "All automated Hostinger API baseline checks passed."
    exit 0
fi
