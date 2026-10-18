# WE ONBOARD — PHASE 2 IMPLEMENTATION REPORT
**Database Integration & Authentication Hardening**
**Platform Version:** 1.0 (October 2026)  
**Lead Software Architect & Implementation Agent:** Google AI Studio Build  
**Repository Source:** https://github.com/aysergraphicsdvg/We-Onboard  
**Hosting Environment:** Hostinger Business Shared Hosting  
**Backend API Domain:** https://api.weonboard.in  
**Subdomain Document Root:** `public_html/api/`  
**Authoritative Store:** MySQL / MariaDB (InnoDB, UTF8mb4)  

---

## 1. Executive Summary

Phase 2 builds directly upon the Phase 1 architectural baseline. While Phase 1 established the initial schema, API client, and Hostinger package generator, a rigorous code-level inspection of the existing implementation revealed specific architectural gaps, path resolution discrepancies, and opportunities for authentication hardening.

This Phase 2 implementation report details:
1. The code-level gap audit between the codebase claims and runtime behavior.
2. Resolution of the API routing and subdomain document root structure.
3. Database integration verification across all 16 InnoDB tables.
4. Hardened authentication, rate-limiting, and session management.
5. Strict CORS and pre-flight handling.
6. The updated Hostinger deployment package and verification procedure.

---

## 2. Code-Level Inspection & Gap Report

| Area / File | Code Issue Identified in Audit | Phase 2 Remediation |
|---|---|---|
| **Path Resolution in Nested Endpoints** (`api/v1/freelancers/register.php`, `api/v1/auth/login.php`, `me.php`) | Depth-3 endpoints used `dirname(__DIR__, 2) . '/config/config.php'`, which incorrectly resolved to `api/config/config.php` rather than root `config/config.php`. | Implemented multi-candidate path resolver (`$rootCandidates = [dirname(__DIR__, 2), dirname(__DIR__, 3), dirname(__DIR__, 1)]`) that dynamically and safely locates the configuration file regardless of folder nesting or document root configuration. |
| **Database Exception Handling** (`config/database.php`) | `Database::getConnection()` called `die("A temporary database error occurred...")` as plain text with HTTP 200 on connection failure, causing JSON parsers in the frontend to crash with syntax errors. | Refactored `Database::getConnection()` to re-throw exceptions, enabling API endpoints to catch database errors and return standardized JSON `{ success: false, error: ... }` with HTTP 500 status. |
| **API Routing Alignment** (`public_html/api/` vs `https://api.weonboard.in`) | When the document root of `api.weonboard.in` is configured as `public_html/api/`, files in `v1/*.php` are accessed as `/v1/*`. Requests targeting `/api/v1/*` would produce 404s without rewrite rules. | Configured `api/.htaccess` with `RewriteEngine On`, `RewriteBase /`, and `RewriteRule ^api/(.*)$ $1 [L,QSA]`. Both `/v1/*` and `/api/v1/*` resolve seamlessly. |
| **Frontend Base URL Normalization** (`src/services/api/index.ts`, `.env.example`) | `.env.example` listed `https://api.weonboard.in/api/v1` which could cause `/api/api/` path confusion; `normalizeApiUrl` defaulted to `/v1` on non-weonboard domains. | Updated `.env.example` to canonical `https://api.weonboard.in/v1`. Updated `normalizeApiUrl` to always default to `https://api.weonboard.in/v1` for both GitHub Pages and preview environments, while maintaining the try/catch preview sandbox fallback. |
| **CORS Origins** (`config/cors.php`) | CORS whitelist only checked local dev and main domain, lacking explicit support for GitHub Pages deployments (`https://aysergraphicsdvg.github.io`). | Added `https://aysergraphicsdvg.github.io` and regex matching for `*.github.io` alongside existing Google Cloud Run preview regex, ensuring no cross-origin blockage. |
| **Duplicate Prevention** (`api/v1/enquiry.php`, `register.php`, `msme_request.php`) | Inbound submissions lacked throttling; rapid clicks could insert duplicate records before the user saw feedback. | Added database-level throttling checks (2-minute window for enquiries, 5-minute window for MSME requests, and strict UNIQUE duplicate detection with HTTP 409 Conflict for freelancers). |
| **Persistent Session Hydration** (`src/App.tsx`) | `api.getCurrentAdmin()` was declared in `ApiService` but never invoked on initial React mount, requiring manual login even if an active PHP session cookie existed. | Added `api.getCurrentAdmin()` invocation on app mount in `src/App.tsx`, restoring active authenticated sessions seamlessly across page reloads. |

---

## 3. Critical API Routing Verification

### Subdomain Document Root Structure
Hostinger Business Shared Hosting configures subdomains under custom directory mappings in hPanel:
- Main Domain: `weonboard.in` &rarr; `public_html/`
- API Subdomain: `api.weonboard.in` &rarr; `public_html/api/`

### URL Mapping
Under this configuration:
- A physical file placed at `public_html/api/v1/health.php` is reached on the subdomain as:
  **`https://api.weonboard.in/v1/health.php`**
- To prevent 404 errors if a client sends a request to `https://api.weonboard.in/api/v1/health.php`, the following rule in `public_html/api/.htaccess` strips the redundant prefix:
  ```apache
  RewriteEngine On
  RewriteBase /
  RewriteRule ^api/(.*)$ $1 [L,QSA]
  ```
- Additionally, extensionless routing allows endpoints to be called without `.php`:
  ```apache
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME}.php -f
  RewriteRule ^(.*)$ $1.php [L,QSA]
  ```

---

## 4. Database Integration Verification

The master schema in `database/schema.sql` defines 16 normalized tables:

1. **`roles`**: RBAC definitions (`Super Admin`, `Administrator`, `Enquiry Manager`, `Freelancer Coordinator`, `Project Manager`).
2. **`permissions`**: Granular capability slugs partitioned by module.
3. **`role_permissions`**: Composite primary key join table.
4. **`admin_users`**: User identities, BCRYPT password hashes, active flags, and `last_login` timestamps.
5. **`enquiries`**: Inbound client, business, and enterprise service enquiries with tracking status and assigned rep.
6. **`enquiry_notes`**: Internal team follow-up notes linked to enquiries with cascade deletion.
7. **`freelancers`**: Gig worker registration profiles, Aadhaar-name compliance, 18+ adult confirmation, smartphone verification, and UNIQUE constraints on `phone` and `email`.
8. **`clients`**: Corporate account records and contract values.
9. **`projects`**: Operational campaigns with target units, city hubs, and payment models.
10. **`tasks`**: Discrete gig tasks assigned to registered freelancers with deadline and payout tracking.
11. **`msme_requests`**: Government & Nodal Agency Desk requests.
12. **`franchise_leads`**: Territorial partnership applications.
13. **`audit_logs`**: Immutable security and activity event log recording acting user, action, record ID, and client IP.
14. **`site_settings`**: Key-value store for corporate contact info, header logo URL, and footer logo URL.
15. **`hero_banners`**: Active carousel slides and call-to-action configurations.
16. **`login_attempts`**: Rate limiting storage capturing IP, email, and timestamp for brute-force mitigation.

### Transaction Management
Every multi-step operation (such as registering a freelancer or submitting an enquiry with an associated audit entry) wraps operations in a database transaction:
```php
$db->beginTransaction();
$stmt->execute([...]);
$auditStmt->execute([...]);
$db->commit();
```
If any query fails, `$db->rollBack()` is invoked in the `catch` block.

---

## 5. Authentication Hardening

The following authentication hardening measures are active in `api/v1/auth/login.php` and `admin/login.php`:

1. **Rate Limiting (Brute Force Defense):**
   - The system checks `login_attempts` for the combination of IP address and email within the last 15 minutes.
   - If 5 or more failed attempts exist, the request is rejected with **HTTP 429 Too Many Requests**:
     ```json
     {
       "success": false,
       "error": "Too many failed login attempts. Account access is temporarily locked for 15 minutes."
     }
     ```
2. **Password Hashing:**
   - Passwords are verified exclusively using PHP's native `password_verify($password, $user['password_hash'])`.
   - New accounts created via `install.php` or `scripts/create_super_admin.php` use `PASSWORD_BCRYPT` with cost factor 12.
3. **Session Fixation Prevention:**
   - Immediately upon successful verification, `session_regenerate_id(true)` is called before storing session attributes.
4. **Cookie Security Parameters:**
   - `session.cookie_httponly = 1` (prevents JavaScript access to session cookie).
   - `session.cookie_samesite = 'Lax'`.
   - `session.cookie_secure = 1` when HTTPS is active.
5. **Session Invalidation:**
   - `api/v1/auth/logout.php` empties `$_SESSION`, destroys the cookie with an expired timestamp, and calls `session_destroy()`.

---

## 6. Testing & Health Check Verification

### Health Probe Contract
- **Endpoint:** `GET https://api.weonboard.in/v1/health.php`
- **Headers:** `Accept: application/json`
- **Successful Response (HTTP 200):**
  ```json
  {
    "status": "healthy",
    "service": "weonboard-api",
    "version": "1.0.0",
    "database": "available",
    "timestamp": "2026-10-18T00:00:00+00:00"
  }
  ```
- **Degraded Response (HTTP 503):**
  ```json
  {
    "status": "degraded",
    "service": "weonboard-api",
    "version": "1.0.0",
    "database": "unavailable",
    "timestamp": "2026-10-18T00:00:00+00:00"
  }
  ```

### Live Frontend Behavior
- When connected to the live Hostinger backend, forms submit over HTTPS and persist authoritatively in MySQL.
- If the backend is temporarily unreachable, the frontend transparently logs to the local sandbox cache and displays an honest notice:
  *"Preview Sandbox Mode: Saved to browser cache. Network connection to https://api.weonboard.in is required for live server storage."*
- Founder attribution is prominently displayed: *"Founded by Muhammd Ali Shoaib and Umme Morsi"*.
