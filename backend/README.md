# We Onboard API — Foundation

This directory is the PHP + MySQL backend foundation intended for a PHP-compatible host such as Hostinger. It is separate from the Vite frontend and is not deployed by GitHub Pages.

## Current scope

- JSON API entry point with health check.
- PDO connection using environment variables.
- Initial MySQL schema for users, enquiries, freelancer profiles and audit events.
- Enquiry and freelancer registration endpoints with server-side validation.
- No real KYC document upload, OTP delivery, wallet balances or payouts yet.

## Hostinger setup

1. Create a MySQL database and a dedicated database user in hPanel.
2. Import `database/schema.sql` using phpMyAdmin.
3. Copy `backend/.env.example` to a private configuration file outside `public_html` if your hosting layout permits. Never commit real credentials.
4. Configure the PHP entry point to read those values from server environment variables or a private config file.
5. Point an API subdomain or directory to `backend/public` and enable HTTPS.
6. Set `WO_ALLOWED_ORIGIN` to the exact frontend origin. Do not use wildcard CORS with credentials.
7. Test `GET /api/health`, then test registration with dummy data only.

The initial API uses environment variables directly. If the shared host does not expose environment variables to PHP, use a configuration file outside the public web root and adapt the bootstrap before deployment.

## Local development

Requires PHP 8.2+ with PDO MySQL. Serve `public` as the web root, configure the environment variables, and route requests to `index.php`. A production rewrite rule is hosting-specific and must be tested on the actual Hostinger account.

## Security gates before real use

- Add OTP/password authentication, session/token rotation, CSRF protection where cookie auth is used, rate limiting and role-based authorization.
- Add email/phone verification and abuse controls.
- Add privacy/consent records, retention and deletion workflows.
- Keep identity documents in private object storage; never store full Aadhaar numbers.
- Add migrations, automated tests, backups, monitoring and an incident response procedure.
- Never use browser localStorage as the source of truth for users, leads, projects or money.
- Do not enable live payments or payouts until a licensed provider is selected, integrated and tested in its sandbox.
