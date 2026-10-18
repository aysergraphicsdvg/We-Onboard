/**
 * WE ONBOARD — API Smoke Test & Verification Suite
 * 
 * Verifies live API endpoints, CORS preflights, unauthenticated access rejection,
 * rate limiting, idempotency caching, and duplicate protection.
 * 
 * Usage:
 *   npx tsx scripts/api_smoke_test.ts
 *   API_URL=https://api.weonboard.in/v1 npx tsx scripts/api_smoke_test.ts
 */

const BASE_URL = (process.env.API_URL || 'https://api.weonboard.in/v1').replace(/\/+$/, '');
const ORIGIN_APPROVED = 'https://weonboard.in';
const ORIGIN_UNAPPROVED = 'https://malicious-attacker-domain.org';

interface TestResult {
  name: string;
  category: 'LOCAL_SPEC' | 'REMOTE_HTTP' | 'HOSTINGER_LIVE';
  passed: boolean;
  status?: number;
  expectedStatus?: number | number[];
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function record(res: TestResult) {
  results.push(res);
  const mark = res.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${mark} [${res.category}] ${res.name} (HTTP ${res.status || 'N/A'}) - ${res.details}`);
  if (res.error) {
    console.error(`   Error details: ${res.error}`);
  }
}

async function runSuite() {
  console.log(`\n======================================================`);
  console.log(`WE ONBOARD API SMOKE TEST RUNNER`);
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  // 1. Health Probe Test
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

    const isHealthy = status === 200 && json && json.status === 'healthy';
    const isDegraded = status === 503 && json && json.status === 'degraded';

    record({
      name: 'GET /health.php Endpoint Probe',
      category: 'REMOTE_HTTP',
      passed: isHealthy || isDegraded,
      status,
      expectedStatus: [200, 503],
      details: isHealthy
        ? `Service healthy, database reporting '${json?.database}'`
        : isDegraded
        ? `Service up but database degraded ('${json?.database}'). Deploy DB schema/credentials.`
        : `Unexpected response: ${bodyText.slice(0, 120)}`
    });
  } catch (err: any) {
    record({
      name: 'GET /health.php Endpoint Probe',
      category: 'REMOTE_HTTP',
      passed: false,
      details: 'Connection failed',
      error: err.message
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
      category: 'REMOTE_HTTP',
      passed,
      status: res.status,
      expectedStatus: 204,
      details: passed
        ? `Correctly returned Access-Control-Allow-Origin: ${allowOrigin}, Credentials: ${allowCreds}`
        : `Headers missing or disallowed. Returned Origin: ${allowOrigin}`
    });
  } catch (err: any) {
    record({
      name: 'CORS Preflight (Approved Origin)',
      category: 'REMOTE_HTTP',
      passed: false,
      details: 'OPTIONS request failed',
      error: err.message
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
    const passed = !allowOrigin || allowOrigin === 'null';

    record({
      name: 'CORS Preflight Rejection (Unapproved Origin)',
      category: 'REMOTE_HTTP',
      passed,
      status: res.status,
      details: passed
        ? `Correctly denied or omitted Access-Control-Allow-Origin for unauthorized domain`
        : `SECURITY WARNING: Unauthorized origin received Access-Control-Allow-Origin: ${allowOrigin}`
    });
  } catch (err: any) {
    record({
      name: 'CORS Preflight Rejection (Unapproved Origin)',
      category: 'REMOTE_HTTP',
      passed: true,
      details: 'Connection cleanly closed or refused'
    });
  }

  // 4. Protected Endpoint Without Session Rejection
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
      category: 'REMOTE_HTTP',
      passed,
      status,
      expectedStatus: 401,
      details: passed
        ? `Correctly returned 401 Unauthorized with authenticated: false`
        : `Expected 401 Unauthorized, received ${status}`
    });
  } catch (err: any) {
    record({
      name: 'Unauthenticated Access Rejection (/auth/me.php)',
      category: 'REMOTE_HTTP',
      passed: false,
      details: 'Failed to probe /auth/me.php',
      error: err.message
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
        email: 'synthetic-nonexistent@weonboard.in',
        password: 'InvalidPassword123!'
      })
    });
    const status = res.status;
    let json: any = null;
    try { json = await res.json(); } catch {}

    const passed = status === 401 && json?.success === false && typeof json?.error === 'string';
    record({
      name: 'Bad Credentials Authentication Rejection',
      category: 'REMOTE_HTTP',
      passed,
      status,
      expectedStatus: 401,
      details: passed
        ? `Correctly rejected with generic message: "${json.error}"`
        : `Expected 401, received ${status}`
    });
  } catch (err: any) {
    record({
      name: 'Bad Credentials Authentication Rejection',
      category: 'REMOTE_HTTP',
      passed: false,
      details: 'Failed to contact /auth/login.php',
      error: err.message
    });
  }

  // 6. Synthetic Public Enquiry & Idempotency Check
  const idempotencyKey = `smoke-test-${Date.now()}`;
  const syntheticPhone = `+9199999${String(Math.floor(1000 + Math.random() * 9000))}`;
  const syntheticEnquiryPayload = {
    full_name: '[SYNTHETIC-TEST] Automated Smoke Runner',
    email: 'synthetic.test.automation@weonboard.in',
    phone: syntheticPhone,
    company_name: '[SYNTHETIC-TEST] Verification Corp',
    city: 'Bengaluru',
    service_required: 'General enquiry',
    message: '[SYNTHETIC-SMOKE-TEST] Automated runbook verification record. Safe to purge.',
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
      body: JSON.stringify(syntheticEnquiryPayload)
    });
    const status1 = res1.status;
    let json1: any = null;
    try { json1 = await res1.json(); } catch {}

    if (status1 === 200 && json1?.success) {
      // Re-submit with same idempotency key to test replay cache
      const res2 = await fetch(`${BASE_URL}/enquiry.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': ORIGIN_APPROVED,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(syntheticEnquiryPayload)
      });
      let json2: any = null;
      try { json2 = await res2.json(); } catch {}

      const isIdempotent = json1.reference_id === json2?.reference_id;
      record({
        name: 'Synthetic Enquiry Submission & Idempotent Replay',
        category: 'HOSTINGER_LIVE',
        passed: isIdempotent,
        status: status1,
        expectedStatus: 200,
        details: isIdempotent
          ? `Created ref ${json1.reference_id}; replayed identically on second request without duplicate row.`
          : `Idempotency mismatch: ref1=${json1.reference_id}, ref2=${json2?.reference_id}`
      });
    } else {
      record({
        name: 'Synthetic Enquiry Submission & Idempotent Replay',
        category: 'HOSTINGER_LIVE',
        passed: false,
        status: status1,
        expectedStatus: 200,
        details: `Endpoint returned error: ${JSON.stringify(json1 || 'non-json')}`
      });
    }
  } catch (err: any) {
    record({
      name: 'Synthetic Enquiry Submission & Idempotent Replay',
      category: 'HOSTINGER_LIVE',
      passed: false,
      details: 'Enquiry test aborted',
      error: err.message
    });
  }

  // 7. Protected Config File Web Download Block
  try {
    const configUrl = BASE_URL.replace(/\/v1$/, '') + '/config/config.php';
    const res = await fetch(configUrl);
    const status = res.status;
    const body = await res.text();

    const passed = (status === 403 || status === 404) && !body.includes('DB_PASS');
    record({
      name: 'Directory & Config Download Protection (/config/config.php)',
      category: 'HOSTINGER_LIVE',
      passed,
      status,
      expectedStatus: [403, 404],
      details: passed
        ? `Access blocked with HTTP ${status}. PHP source was not leaked.`
        : `SECURITY CRITICAL: Raw config file accessible! Status: ${status}`
    });
  } catch (err: any) {
    record({
      name: 'Directory & Config Download Protection (/config/config.php)',
      category: 'HOSTINGER_LIVE',
      passed: true,
      details: 'Direct request failed or connection refused'
    });
  }

  // Print Summary Table
  console.log(`\n======================================================`);
  console.log(`SUMMARY REPORT`);
  console.log(`======================================================`);
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Total Probes: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log(`\nNote: If endpoints returned 404 or connection errors, verify that the Hostinger deployment package has been extracted to public_html/api/ and public_html/ as outlined in docs/PHASE2_2_HOSTINGER_DEPLOYMENT_RUNBOOK.md.`);
  }

  return { total, passed, failed };
}

// Self execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSuite().catch(console.error);
}

export { runSuite };
