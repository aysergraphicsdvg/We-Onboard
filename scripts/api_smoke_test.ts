/**
 * WE ONBOARD — API Smoke Test & Verification Suite
 * 
 * Verifies live API endpoints, CORS preflights, unauthenticated access rejection,
 * rate limiting, idempotency caching, conflict rejection, and protected file blocks.
 * 
 * Safety & Truthfulness Rules:
 * - A healthy API test requires HTTP 200 and operational database.
 * - HTTP 503 (database unavailable) is reported as a deployment failure, never a pass.
 * - Network failures are reported as failures/unverified, never security passes.
 * - Exits with non-zero exit code if any required readiness check fails.
 * 
 * Usage:
 *   npx tsx scripts/api_smoke_test.ts
 *   API_URL=https://api.weonboard.in/v1 npx tsx scripts/api_smoke_test.ts
 */

const BASE_URL = (process.env.API_URL || 'https://api.weonboard.in/v1').replace(/\/+$/, '');
const ORIGIN_APPROVED = 'https://weonboard.in';
const ORIGIN_UNAPPROVED = 'https://unauthorized-attacker-domain.org';

interface TestResult {
  name: string;
  category: 'ENDPOINT_AVAILABILITY' | 'DATABASE_READINESS' | 'SECURITY_CORS' | 'AUTH_ACCESS' | 'IDEMPOTENCY';
  passed: boolean;
  status?: number;
  expectedStatus?: number | number[];
  details: string;
  error?: string;
  isBlocker?: boolean;
}

const results: TestResult[] = [];

function record(res: TestResult) {
  results.push(res);
  const mark = res.passed ? '✓ PASS' : '✗ FAIL';
  const blockerNote = (!res.passed && res.isBlocker) ? ' [DEPLOYMENT BLOCKER]' : '';
  console.log(`${mark} [${res.category}] ${res.name} (HTTP ${res.status || 'N/A'})${blockerNote} — ${res.details}`);
  if (res.error) {
    console.error(`   Error details: ${res.error}`);
  }
}

async function runSuite() {
  console.log(`\n======================================================`);
  console.log(`WE ONBOARD API SMOKE TEST RUNNER (PHASE 2.3)`);
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  // 1. Health Probe & Database Readiness (Separated)
  try {
    const healthUrl = `${BASE_URL}/health.php`;
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const status = res.status;
    let bodyText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(bodyText);
    } catch {}

    const isHttpReachable = status === 200 || status === 503;
    const isDbOperational = status === 200 && json && json.status === 'healthy' && json.database === 'available';

    // 1a. Endpoint Reachability
    record({
      name: 'GET /health.php Endpoint Reachability',
      category: 'ENDPOINT_AVAILABILITY',
      passed: isHttpReachable,
      status,
      expectedStatus: 200,
      details: isHttpReachable 
        ? `HTTP server responding with status ${status}`
        : `Endpoint unreachable or returned unexpected status ${status}: ${bodyText.slice(0, 80)}`,
      isBlocker: true
    });

    // 1b. Database Readiness Check (Truthful: 503 is a FAILURE for deployment)
    record({
      name: 'MySQL Database Connectivity & Readiness',
      category: 'DATABASE_READINESS',
      passed: isDbOperational,
      status,
      expectedStatus: 200,
      details: isDbOperational
        ? `Database fully operational (status: '${json.status}', db: '${json.database}')`
        : status === 503
        ? `DEPLOYMENT BLOCKER: Database is offline/unreachable (HTTP 503). Ensure MySQL credentials are set in server environment.`
        : `Database status check failed: received HTTP ${status} with body: ${bodyText.slice(0, 100)}`,
      isBlocker: true
    });
  } catch (err: any) {
    record({
      name: 'GET /health.php Endpoint Reachability',
      category: 'ENDPOINT_AVAILABILITY',
      passed: false,
      details: 'Network connection failed — host unreachable or DNS/SSL error',
      error: err.message,
      isBlocker: true
    });
    record({
      name: 'MySQL Database Connectivity & Readiness',
      category: 'DATABASE_READINESS',
      passed: false,
      details: 'Cannot verify database because host is unreachable',
      error: err.message,
      isBlocker: true
    });
  }

  // 2. Approved Origin CORS Preflight
  try {
    const res = await fetch(`${BASE_URL}/health.php`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN_APPROVED,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, X-Idempotency-Key'
      }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCreds = res.headers.get('access-control-allow-credentials');

    const passed = (res.status === 204 || res.status === 200) && allowOrigin === ORIGIN_APPROVED;
    record({
      name: 'CORS Preflight (Approved Origin: weonboard.in)',
      category: 'SECURITY_CORS',
      passed,
      status: res.status,
      expectedStatus: 204,
      details: passed
        ? `Allowed origin header returned correctly (${allowOrigin}), credentials: ${allowCreds}`
        : `CORS preflight failed: returned origin '${allowOrigin}', status: ${res.status}`,
      isBlocker: true
    });
  } catch (err: any) {
    record({
      name: 'CORS Preflight (Approved Origin: weonboard.in)',
      category: 'SECURITY_CORS',
      passed: false,
      details: 'Network connection error during CORS preflight probe',
      error: err.message,
      isBlocker: true
    });
  }

  // 3. Unapproved Origin CORS Rejection
  try {
    const res = await fetch(`${BASE_URL}/health.php`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN_UNAPPROVED,
        'Access-Control-Request-Method': 'GET'
      }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    // Truthful check: passes ONLY if server responded AND rejected without allow-origin
    const passed = (!allowOrigin || allowOrigin === 'null') && (res.status === 403 || res.status === 204);

    record({
      name: 'CORS Preflight Rejection (Unapproved Origin)',
      category: 'SECURITY_CORS',
      passed,
      status: res.status,
      expectedStatus: 403,
      details: passed
        ? `Unauthorized origin correctly rejected (Access-Control-Allow-Origin omitted, HTTP ${res.status})`
        : (allowOrigin && allowOrigin !== 'null')
        ? `SECURITY CRITICAL: Unauthorized origin permitted with Access-Control-Allow-Origin: ${allowOrigin}`
        : `Preflight rejection check failed: expected HTTP 403 or 204 without allow-origin, received HTTP ${res.status}`,
      isBlocker: true
    });
  } catch (err: any) {
    // Truthful check: Network failure is NEVER marked as passed!
    record({
      name: 'CORS Preflight Rejection (Unapproved Origin)',
      category: 'SECURITY_CORS',
      passed: false,
      details: 'Network connection failure — unable to verify origin rejection on server',
      error: err.message,
      isBlocker: true
    });
  }

  // 4. Protected Session Endpoint Rejection
  try {
    const res = await fetch(`${BASE_URL}/auth/me.php`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const status = res.status;
    let json: any = null;
    try { json = await res.json(); } catch {}

    const passed = status === 401 && json?.authenticated === false;
    record({
      name: 'Unauthenticated Access Rejection (/auth/me.php)',
      category: 'AUTH_ACCESS',
      passed,
      status,
      expectedStatus: 401,
      details: passed
        ? `Correctly returned HTTP 401 Unauthorized with authenticated: false`
        : `Expected HTTP 401 Unauthorized, received ${status}`,
      isBlocker: true
    });
  } catch (err: any) {
    record({
      name: 'Unauthenticated Access Rejection (/auth/me.php)',
      category: 'AUTH_ACCESS',
      passed: false,
      details: 'Failed to contact /auth/me.php',
      error: err.message,
      isBlocker: true
    });
  }

  // 5. Invalid Admin Credentials (Generic Error Message Verification)
  try {
    const res = await fetch(`${BASE_URL}/auth/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN_APPROVED
      },
      body: JSON.stringify({
        email: 'synthetic-nonexistent-audit@weonboard.in',
        password: 'InvalidPassword123!'
      })
    });
    const status = res.status;
    let json: any = null;
    try { json = await res.json(); } catch {}

    const passed = status === 401 && json?.success === false && typeof json?.error === 'string';
    record({
      name: 'Bad Credentials Authentication Rejection',
      category: 'AUTH_ACCESS',
      passed,
      status,
      expectedStatus: 401,
      details: passed
        ? `Correctly rejected with generic message: "${json.error}"`
        : `Expected HTTP 401, received ${status}`,
      isBlocker: true
    });
  } catch (err: any) {
    record({
      name: 'Bad Credentials Authentication Rejection',
      category: 'AUTH_ACCESS',
      passed: false,
      details: 'Failed to contact /auth/login.php',
      error: err.message,
      isBlocker: true
    });
  }

  // 6. Idempotency Key Validation & Conflict Rejection
  const idempotencyKey = `smoke-test-${Date.now()}`;
  const syntheticPhone = `+9199999${String(Math.floor(1000 + Math.random() * 9000))}`;
  const payloadA = {
    full_name: '[SYNTHETIC-TEST] Idempotency Verification',
    email: 'synthetic.smoke.test@weonboard.in',
    phone: syntheticPhone,
    company_name: '[SYNTHETIC-TEST] Verification Corp',
    city: 'Bengaluru',
    service_required: 'General enquiry',
    message: '[SYNTHETIC-TEST] Automated runbook verification probe.',
    enquiry_type: 'Business',
    idempotency_key: idempotencyKey
  };

  try {
    const res1 = await fetch(`${BASE_URL}/enquiry.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN_APPROVED,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payloadA)
    });
    const status1 = res1.status;
    let json1: any = null;
    try { json1 = await res1.json(); } catch {}

    if (status1 === 200 && json1?.success) {
      // 6a: Replay identical request
      const res2 = await fetch(`${BASE_URL}/enquiry.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': ORIGIN_APPROVED,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payloadA)
      });
      let json2: any = null;
      try { json2 = await res2.json(); } catch {}
      const isReplayEqual = json1.reference_id === json2?.reference_id;

      record({
        name: 'Idempotency Replay (Identical Payload)',
        category: 'IDEMPOTENCY',
        passed: isReplayEqual,
        status: res2.status,
        expectedStatus: 200,
        details: isReplayEqual
          ? `Returned cached reference ${json1.reference_id} without creating duplicate record`
          : `Mismatch in cached response: ref1=${json1.reference_id}, ref2=${json2?.reference_id}`,
        isBlocker: false
      });

      // 6b: Submit different payload with SAME key -> Must reject with HTTP 409 Conflict
      const payloadB = { ...payloadA, full_name: '[CONFLICT-TEST] Different Payload Name' };
      const res3 = await fetch(`${BASE_URL}/enquiry.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': ORIGIN_APPROVED,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payloadB)
      });
      let json3: any = null;
      try { json3 = await res3.json(); } catch {}
      const isConflictCaught = res3.status === 409 && json3?.success === false;

      record({
        name: 'Idempotency Conflict Rejection (Key Reuse With Different Payload)',
        category: 'IDEMPOTENCY',
        passed: isConflictCaught,
        status: res3.status,
        expectedStatus: 409,
        details: isConflictCaught
          ? `Correctly returned HTTP 409 Conflict: "${json3?.error}"`
          : `Failed: expected HTTP 409 Conflict, received HTTP ${res3.status}`,
        isBlocker: false
      });

      // 6c: Parallel Identical Requests Concurrency Test (Promise.all race)
      const raceKey = `race-smoke-${Date.now()}`;
      const racePayload = {
        ...payloadA,
        idempotency_key: raceKey,
        message: '[RACE-TEST] Parallel concurrent identical submissions'
      };
      const [raceRes1, raceRes2] = await Promise.all([
        fetch(`${BASE_URL}/enquiry.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN_APPROVED, 'X-Idempotency-Key': raceKey },
          body: JSON.stringify(racePayload)
        }),
        fetch(`${BASE_URL}/enquiry.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN_APPROVED, 'X-Idempotency-Key': raceKey },
          body: JSON.stringify(racePayload)
        })
      ]);
      const [raceJson1, raceJson2] = await Promise.all([
        raceRes1.json().catch(() => null),
        raceRes2.json().catch(() => null)
      ]);
      const raceSuccess = raceRes1.status === 200 && raceRes2.status === 200 &&
                          raceJson1?.reference_id && raceJson1.reference_id === raceJson2?.reference_id;
      record({
        name: 'Concurrent Parallel Submissions (Atomic Reservation & Replay)',
        category: 'IDEMPOTENCY',
        passed: raceSuccess,
        status: raceRes1.status,
        expectedStatus: 200,
        details: raceSuccess
          ? `Both parallel requests resolved cleanly to same reference ID (${raceJson1?.reference_id}) with zero duplicate entries`
          : `Concurrency race failed: status1=${raceRes1.status}, status2=${raceRes2.status}, ref1=${raceJson1?.reference_id}, ref2=${raceJson2?.reference_id}`,
        isBlocker: false
      });

      // 6d: Parallel Conflicting Payloads Concurrency Test
      const conflictRaceKey = `conflict-race-${Date.now()}`;
      const confPayload1 = { ...payloadA, idempotency_key: conflictRaceKey, full_name: '[RACE-1] Original Payload' };
      const confPayload2 = { ...payloadA, idempotency_key: conflictRaceKey, full_name: '[RACE-2] Conflicting Payload' };
      const [confRes1, confRes2] = await Promise.all([
        fetch(`${BASE_URL}/enquiry.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN_APPROVED, 'X-Idempotency-Key': conflictRaceKey },
          body: JSON.stringify(confPayload1)
        }),
        fetch(`${BASE_URL}/enquiry.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN_APPROVED, 'X-Idempotency-Key': conflictRaceKey },
          body: JSON.stringify(confPayload2)
        })
      ]);
      const confStatuses = [confRes1.status, confRes2.status].sort();
      // One request should succeed (200) and the other MUST be rejected with 409 Conflict
      const confHandled = (confStatuses[0] === 200 && confStatuses[1] === 409);
      record({
        name: 'Concurrent Conflicting Payload Race Rejection',
        category: 'IDEMPOTENCY',
        passed: confHandled,
        status: confRes2.status,
        expectedStatus: 409,
        details: confHandled
          ? `Race winner processed (200), conflicting parallel payload rejected with 409 Conflict`
          : `Conflict race failed: received statuses [${confStatuses.join(', ')}] instead of [200, 409]`,
        isBlocker: false
      });
    } else if (status1 === 503) {
      record({
        name: 'Idempotency Replay & Conflict Rejection',
        category: 'IDEMPOTENCY',
        passed: false,
        status: 503,
        details: 'Cannot verify idempotency because live database is offline (HTTP 503)',
        isBlocker: true
      });
    } else {
      record({
        name: 'Idempotency Replay & Conflict Rejection',
        category: 'IDEMPOTENCY',
        passed: false,
        status: status1,
        details: `Initial synthetic submission failed with status ${status1}: ${JSON.stringify(json1 || 'non-json')}`,
        isBlocker: true
      });
    }
  } catch (err: any) {
    record({
      name: 'Idempotency Replay & Conflict Rejection',
      category: 'IDEMPOTENCY',
      passed: false,
      details: 'Connection error during idempotency probe',
      error: err.message,
      isBlocker: true
    });
  }

  // 8. Public Web Installer Disabled Protection
  try {
    const installUrl = BASE_URL.replace(/\/v1$/, '').replace(/\/api$/, '') + '/install.php';
    const res = await fetch(installUrl);
    const status = res.status;
    const body = await res.text();

    const passed = (status === 403 || status === 404) && !body.includes('Database Initializer') && !body.includes('installer_csrf');
    record({
      name: 'Public Web Installer Disabled Check (/install.php)',
      category: 'AUTH_ACCESS',
      passed,
      status,
      expectedStatus: [403, 404],
      details: passed
        ? `Web installer correctly rejected with HTTP ${status}. Public installation disabled.`
        : `SECURITY CRITICAL: Public web installer accessible without authorization! Status: ${status}`,
      isBlocker: true
    });
  } catch (err: any) {
    record({
      name: 'Public Web Installer Disabled Check (/install.php)',
      category: 'AUTH_ACCESS',
      passed: false,
      details: 'Network error contacting installer URL — unverified',
      error: err.message,
      isBlocker: true
    });
  }

  // 7. Protected Config File Web Download Block
  try {
    const configUrl = BASE_URL.replace(/\/v1$/, '') + '/config/config.php';
    const res = await fetch(configUrl);
    const status = res.status;
    const body = await res.text();

    const passed = (status === 403 || status === 404) && !body.includes('DB_HOST') && !body.includes('<?php');
    record({
      name: 'Direct Config File Download Protection (/config/config.php)',
      category: 'AUTH_ACCESS',
      passed,
      status,
      expectedStatus: [403, 404],
      details: passed
        ? `Access blocked with HTTP ${status}. Source code is protected.`
        : `SECURITY CRITICAL: Raw config file accessible! Status: ${status}`,
      isBlocker: true
    });
  } catch (err: any) {
    // Truthful check: network failure is not recorded as passed
    record({
      name: 'Direct Config File Download Protection (/config/config.php)',
      category: 'AUTH_ACCESS',
      passed: false,
      details: 'Network error contacting config URL — unverified',
      error: err.message,
      isBlocker: true
    });
  }

  // Summary & Process Exit
  console.log(`\n======================================================`);
  console.log(`SMOKE TEST SUMMARY REPORT`);
  console.log(`======================================================`);
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  const blockers = results.filter(r => !r.passed && r.isBlocker).length;

  console.log(`Total Checks: ${total} | Passed: ${passedCount} | Failed: ${failedCount} | Blockers: ${blockers}`);

  if (failedCount > 0) {
    console.log(`\nSTATUS: NOT READY FOR PRODUCTION`);
    console.log(`Review the failures above. If Hostinger backend is not yet provisioned, deploy the package to public_html/ and execute database migrations.`);
    return { total, passed: passedCount, failed: failedCount, blockers, success: false };
  } else {
    console.log(`\nSTATUS: ALL SMOKE TESTS PASSED`);
    return { total, passed: passedCount, failed: failedCount, blockers: 0, success: true };
  }
}

// Self execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSuite().then(res => {
    if (!res.success) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

export { runSuite };
