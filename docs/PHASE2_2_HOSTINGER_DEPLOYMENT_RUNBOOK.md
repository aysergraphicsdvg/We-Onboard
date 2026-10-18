# WE ONBOARD — PHASE 2.2: HOSTINGER DEPLOYMENT RUNBOOK & VERIFICATION GUIDE
**Platform Version:** 1.0 (Production Candidate)  
**Lead Software Architect & Security Auditor:** Google AI Studio Build  
**Repository Source:** https://github.com/aysergraphicsdvg/We-Onboard  
**Target Environment:** Hostinger Business Shared Hosting  
**Main Domain:** `https://weonboard.in` (Document Root: `public_html/`)  
**API Subdomain:** `https://api.weonboard.in` (Document Root: `public_html/api/`)  
**Canonical API Base URL:** `https://api.weonboard.in/v1`  
**Database Engine:** MySQL 5.7+ / MariaDB 10.4+ (InnoDB, `utf8mb4_unicode_ci`)  

---

## 1. Executive Summary & Live Baseline Evidence

During the Phase 2.2 inspection, live HTTP probes were executed directly against the production domains:

1. **`https://api.weonboard.in`:**  
   - SSL handshake: **Valid & Active** (Let's Encrypt / Hostinger SSL over HTTP/2).  
   - Server banner: `platform: hostinger`, `panel: hpanel`, `server: hcdn`.  
   - Current state: Returns default Hostinger placeholder page (`You Are All Set to Go!`).  
   - Endpoint probe `https://api.weonboard.in/v1/health.php` returned HTTP 404 because the API code has not yet been extracted into the `public_html/api/` document root.

2. **`https://weonboard.in`:**  
   - PHP Runtime: **PHP 8.3.35** confirmed active on Hostinger.  
   - Live finding: `index.php` on the server previously threw a path error when trying to load `config/config.php` because of rigid path nesting. This was remediated in the codebase with a multi-candidate path resolver (`$rootCandidates = [__DIR__, dirname(__DIR__), dirname(__DIR__, 2)]`), ensuring that whether configuration files sit inside `public_html/` or in the domain parent directory, they resolve seamlessly.

3. **Deployment Package:**  
   - Verified that all 27 core deployment files in `src/services/hostingerPackage.ts` match disk assets.  
   - Added `X-Idempotency-Key` to CORS allowed headers.  
   - Eliminated potential applicant reference disclosure on duplicate candidate submissions.

---

## 2. Pre-Deployment Backup Steps

Before uploading files or applying schema migrations, execute a complete backup in Hostinger hPanel:

### Step 2.1: MySQL Database Snapshot
1. Log in to Hostinger hPanel &rarr; **Databases** &rarr; **phpMyAdmin**.
2. Select your We Onboard database (`u123456789_weonboard`).
3. Click the **Export** tab.
4. Select **Quick &mdash; display only the minimal options** and format **SQL**.
5. Click **Export** and save the file locally as `backup_weonboard_pre_phase2_<DATE>.sql`.

### Step 2.2: Existing Filesystem Snapshot
1. In hPanel, go to **Files** &rarr; **Backups** (or **File Manager**).
2. Select **Generate new backup** &rarr; **Files backup**.
3. Download the archive of `public_html/` before proceeding with any deployment.

---

## 3. Server Configuration Checklist

Verify each of the following server settings in Hostinger hPanel:

| Check | Expected Configuration | How to Verify in hPanel |
|---|---|---|
| **Subdomain Document Root** | `api.weonboard.in` &rarr; `public_html/api/` | **Domains** &rarr; **Subdomains** &rarr; Check directory mapping |
| **PHP Version** | PHP 8.2 or PHP 8.3 | **Advanced** &rarr; **PHP Configuration** &rarr; Select PHP 8.2 or 8.3 |
| **PHP Extensions** | `pdo_mysql`, `mbstring`, `json`, `openssl`, `curl` | Enabled by default on Hostinger Business Shared Hosting |
| **SSL Status** | Force HTTPS active on both domains | **Security** &rarr; **SSL** &rarr; Confirm status is "Active" |
| **Apache mod_rewrite** | Enabled | Active by default (reads `.htaccess` in `public_html/` and `public_html/api/`) |
| **File Permissions** | Folders: `755`, PHP Files: `644` | Set via File Manager or SSH (`chmod -R 755 public_html`) |

---

## 4. Schema & Migration Verification

### 4.1 Master Schema vs. Incremental Migrations
The master schema (`database/schema.sql`) declares **17 normalized tables**:

```
1. roles                 7. freelancers            13. audit_logs
2. permissions           8. clients                14. site_settings
3. role_permissions      9. projects               15. hero_banners
4. admin_users          10. tasks                  16. login_attempts
5. enquiries            11. msme_requests          17. idempotency_keys
6. enquiry_notes        12. franchise_leads
```

### 4.2 Migration Audit & Safety Analysis
Every SQL statement in `database/schema.sql` and `database/migrations/` was audited for destructive operations:
- **`DROP TABLE`:** None present.
- **`DROP DATABASE`:** None present.
- **`TRUNCATE`:** None present.
- **`ALTER TABLE ... DROP COLUMN`:** None present.
- **Foreign Keys:** Use `ON DELETE SET NULL` or `ON DELETE CASCADE` appropriately for relational integrity.

### 4.3 Migration Status Determination
Run this diagnostic query in phpMyAdmin to determine the current database state:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
ORDER BY table_name;
```

**Evaluation Logic:**
- **Case A: 0 Tables exist**  
  Execute `database/schema.sql` in full.
- **Case B: 15 Tables exist (missing `login_attempts` and `idempotency_keys`)**  
  Execute `database/migrations/001_upgrade_v2.sql`, then execute:
  ```sql
  -- Add table 16: login_attempts
  CREATE TABLE IF NOT EXISTS `login_attempts` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `ip_address` VARCHAR(45) NOT NULL,
      `email` VARCHAR(150) NOT NULL,
      `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ip_time (`ip_address`, `attempt_time`),
      INDEX idx_email_time (`email`, `attempt_time`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```
  Then execute `database/migrations/002_idempotency_and_constraints.sql`.
- **Case C: 16 Tables exist (missing `idempotency_keys`)**  
  Execute `database/migrations/002_idempotency_and_constraints.sql`.
- **Case D: 17 Tables exist**  
  Database is completely up to date. No migration execution required.

---

## 5. Deployment Step-by-Step Procedure

### Step 5.1: Generate or Download Package
1. Open the We Onboard admin panel locally or in preview.
2. Navigate to **Hostinger Package** and click **Download Deployment ZIP** (`weonboard-hostinger-deployment.zip`).
3. Alternatively, upload files directly from the repository using Hostinger Git or File Manager.

### Step 5.2: File Placement on Hostinger
Extract files according to the following mapping:

```
public_html/
├── .htaccess                      <-- Root security, HTTPS enforcement, directory shielding
├── config/
│   ├── config.php                 <-- DB credentials, CSRF helper, session parameters
│   ├── database.php               <-- PDO singleton with exception rethrow
│   └── cors.php                   <-- Origin whitelist & preflight handler
├── database/
│   ├── schema.sql
│   └── migrations/
├── api/                           <-- Document root of api.weonboard.in
│   ├── .htaccess                  <-- Strips redundant /api/, handles clean URLs
│   └── v1/
│       ├── health.php             <-- Health probe endpoint
│       ├── enquiry.php            <-- Enquiry submission with duplicate check
│       ├── msme_request.php       <-- MSME desk proposal submission
│       ├── freelancers/
│       │   └── register.php       <-- Freelancer registration with strict unique constraint
│       └── auth/
│           ├── login.php          <-- Rate-limited admin login with password_verify
│           ├── logout.php         <-- Session destroyer & cookie expirer
│           └── me.php             <-- Active session validator
├── admin/                         <-- Admin Web Portal
│   ├── auth_check.php             <-- Server-authoritative RBAC middleware
│   ├── login.php                  <-- Web login interface
│   ├── logout.php
│   ├── dashboard.php              <-- Live metrics overview
│   └── enquiries.php              <-- Enquiry CRM & CSV export
├── install.php                    <-- One-time installer (locks after completion)
├── scripts/
│   └── create_super_admin.php     <-- CLI-only provisioner
└── index.php / assets/            <-- Frontend landing page assets
```

### Step 5.3: Set Database Credentials
Edit `config/config.php` in File Manager with the actual Hostinger database credentials:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_weonboard');
define('DB_USER', 'u123456789_admin');
define('DB_PASS', 'YOUR_ACTUAL_STRONG_DB_PASSWORD');
```
*Note: Never commit actual passwords to git or public repositories.*

### Step 5.4: Provision Super Administrator Account
Connect via Hostinger SSH terminal and execute:
```bash
php scripts/create_super_admin.php "Muhammad Ali Shoaib" "admin@weonboard.in" "YOUR_STRONG_PASSWORD"
```
Or execute `https://weonboard.in/install.php` once in the browser and verify that `config/install.lock` is created.

---

## 6. Verification Test Plan & Expected Outcomes

### Test 1: Health Probe
- **Command:**
  ```bash
  curl -i https://api.weonboard.in/v1/health.php
  ```
- **Expected Status:** HTTP 200 OK
- **Expected Payload:**
  ```json
  {
    "status": "healthy",
    "service": "weonboard-api",
    "version": "1.0.0",
    "database": "available",
    "timestamp": "..."
  }
  ```
- **Failure Criteria:** HTTP 404 (file missing or routing wrong), HTTP 503 (database connection failed &mdash; check DB credentials in `config/config.php`).

### Test 2: CORS Preflight Verification
- **Approved Origin Command:**
  ```bash
  curl -i -X OPTIONS https://api.weonboard.in/v1/health.php \
    -H "Origin: https://weonboard.in" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type, X-Idempotency-Key"
  ```
- **Expected Status:** HTTP 204 No Content
- **Expected Headers:**
  - `Access-Control-Allow-Origin: https://weonboard.in`
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Idempotency-Key`

- **Unapproved Origin Command:**
  ```bash
  curl -i -X OPTIONS https://api.weonboard.in/v1/health.php \
    -H "Origin: https://unauthorized-attacker.com" \
    -H "Access-Control-Request-Method: GET"
  ```
- **Expected Outcome:** No `Access-Control-Allow-Origin` header returned, preventing cross-origin browser requests.

### Test 3: Unauthenticated Access Rejection
- **Command:**
  ```bash
  curl -i https://api.weonboard.in/v1/auth/me.php
  ```
- **Expected Status:** HTTP 401 Unauthorized
- **Expected Payload:**
  ```json
  {
    "success": false,
    "authenticated": false
  }
  ```

### Test 4: Rate Limiting & Authentication Rejection
- **Command:**
  ```bash
  curl -i -X POST https://api.weonboard.in/v1/auth/login.php \
    -H "Content-Type: application/json" \
    -H "Origin: https://weonboard.in" \
    -d '{"email":"synthetic-nonexistent@weonboard.in","password":"BadPassword123!"}'
  ```
- **Expected Status:** HTTP 401 Unauthorized
- **Expected Payload:** Generic message `{"success":false,"error":"Invalid credentials. Please check your email and password."}`
- **Rate Limit Trigger Test:** Repeat the above curl command 5 times rapidly. On the 5th/6th attempt:
  - **Expected Status:** HTTP 429 Too Many Requests
  - **Expected Payload:** `{"success":false,"error":"Too many failed login attempts. Account access is temporarily locked for 15 minutes."}`

### Test 5: Synthetic Commercial Enquiry Submission & Idempotency
- **Command:**
  ```bash
  curl -i -X POST https://api.weonboard.in/v1/enquiry.php \
    -H "Content-Type: application/json" \
    -H "Origin: https://weonboard.in" \
    -H "X-Idempotency-Key: smoke-test-runbook-001" \
    -d '{
      "full_name": "[SYNTHETIC-TEST] Automated Smoke Runner",
      "email": "synthetic.test.automation@weonboard.in",
      "phone": "+919999900001",
      "company_name": "[SYNTHETIC-TEST] Verification Corp",
      "city": "Bengaluru",
      "service_required": "General enquiry",
      "message": "[SYNTHETIC-SMOKE-TEST] Automated runbook verification record. Safe to purge.",
      "enquiry_type": "Business"
    }'
  ```
- **Expected Status:** HTTP 200 OK
- **Expected Payload:** `{"success":true,"reference_id":"WO-ENQ-...","message":"..."}`
- **Idempotency Replay Test:** Re-execute the exact command with the same `X-Idempotency-Key`.
  - **Expected Status:** HTTP 200 OK with the exact same `reference_id` returned instantly from the cache, without inserting a duplicate database record.

### Test 6: Synthetic Freelancer Validation & Duplicate Handling
- **Command 1 (Initial Submission):**
  ```bash
  curl -i -X POST https://api.weonboard.in/v1/freelancers/register.php \
    -H "Content-Type: application/json" \
    -H "Origin: https://weonboard.in" \
    -d '{
      "full_name": "[SYNTHETIC-TEST] Associate Candidate",
      "phone": "+919999900002",
      "email": "synthetic.candidate@weonboard.in",
      "dob": "1998-05-15",
      "is_adult": 1,
      "has_smartphone": 1,
      "residential_address": "Indiranagar",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pin_code": "560038",
      "preferred_role": "Rider / Delivery Partner"
    }'
  ```
- **Expected Status:** HTTP 200 OK with `reference_id: "WO-FR-..."`.
- **Command 2 (Duplicate Attempt):** Re-run the exact command immediately.
- **Expected Status:** HTTP 409 Conflict
- **Expected Payload:** Privacy-safe generic message:
  ```json
  {
    "success": false,
    "error": "An application with this mobile number or email address has already been submitted. Our operations team reviews all applications within 24-48 hours."
  }
  ```
- **Privacy Check:** Confirm that no existing registration reference ID or private details are returned in the response.

### Test 7: Direct File Access & Shielding Protection
- **Command:**
  ```bash
  curl -i https://api.weonboard.in/config/config.php
  curl -i https://weonboard.in/config/config.php
  curl -i https://weonboard.in/database/schema.sql
  ```
- **Expected Status:** HTTP 403 Forbidden (or HTTP 404 Not Found)
- **Failure Criteria:** Any response returning HTTP 200 or displaying raw PHP database credentials / SQL schema.

---

## 7. Automated Test Script Execution

Two automated test scripts are available in the repository:

### Option A: TypeScript / Node Runner (From Local Dev or CI)
```bash
npm run test:smoke
# Or with explicit URL:
API_URL=https://api.weonboard.in/v1 npm run test:smoke
```

### Option B: Hostinger SSH Shell Script (Directly on Server)
```bash
chmod +x scripts/hostinger_smoke_test.sh
./scripts/hostinger_smoke_test.sh
```

---

## 8. Synthetic Test Data Cleanup Script

To remove all test records created during smoke testing without touching real customer or candidate data, run this SQL query in phpMyAdmin:

```sql
-- Safe synthetic test data purge
DELETE FROM enquiries 
WHERE full_name LIKE '%[SYNTHETIC-TEST]%' 
   OR email = 'synthetic.test.automation@weonboard.in';

DELETE FROM freelancers 
WHERE full_name LIKE '%[SYNTHETIC-TEST]%' 
   OR email = 'synthetic.candidate@weonboard.in';

DELETE FROM msme_requests 
WHERE applicant_name LIKE '%[SYNTHETIC-TEST]%' 
   OR email = 'synthetic.test.automation@weonboard.in';

DELETE FROM audit_logs 
WHERE details LIKE '%SYNTHETIC%' 
   OR acting_user LIKE '%Smoke Runner%';

DELETE FROM idempotency_keys 
WHERE idempotency_key LIKE 'smoke-test-%';
```

---

## 9. Rollback Plan

If unexpected failures occur during live deployment:

### Step 9.1: Restore Filesystem
1. In Hostinger File Manager, rename the failing `public_html/` to `public_html_failed_<TIMESTAMP>`.
2. Restore the pre-deployment backup archive created in Section 2.2 to `public_html/`.

### Step 9.2: Restore Database
1. Open phpMyAdmin and select the We Onboard database.
2. If necessary, import `backup_weonboard_pre_phase2_<DATE>.sql`.
3. Verify that all original business records are intact:
   ```sql
   SELECT COUNT(*) FROM enquiries;
   SELECT COUNT(*) FROM freelancers;
   ```

---

## 10. Final Evidence Checklist

Before declaring Phase 2.2 complete and authorizing Phase 3 work, ensure every item below has a recorded outcome:

- [ ] Pre-deployment database SQL backup downloaded locally.
- [ ] Pre-deployment `public_html` archive saved.
- [ ] Database credentials entered in `config/config.php`.
- [ ] All 17 tables confirmed in phpMyAdmin.
- [ ] First Super Admin account provisioned via `create_super_admin.php` or `install.php`.
- [ ] `GET https://api.weonboard.in/v1/health.php` returns HTTP 200 with `database: available`.
- [ ] CORS preflight from `https://weonboard.in` returns HTTP 204 with valid allow-origin headers.
- [ ] CORS preflight from unapproved origin is rejected.
- [ ] Protected endpoints (`/auth/me.php`, `/admin/dashboard.php`) reject unauthenticated requests with HTTP 401/302.
- [ ] Invalid admin login attempts trigger HTTP 401 with generic error messages.
- [ ] Repeated failed logins (5 attempts in 15 mins) trigger HTTP 429 rate limiting.
- [ ] Synthetic enquiry submission persists to database and returns valid reference ID.
- [ ] Duplicate freelancer registration is rejected with HTTP 409 without leaking applicant data.
- [ ] Idempotent replay with cached key returns cached reference without double-inserting.
- [ ] Direct HTTP requests to `/config/config.php` return HTTP 403 Forbidden.
- [ ] Synthetic test records purged using the Section 8 cleanup script.
