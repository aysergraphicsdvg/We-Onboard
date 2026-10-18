# We Onboard Platform Backend

The platform blueprint and expanded MySQL schema are being developed on the draft branch `feature/backend-foundation`. The live website is not changed by this branch.

## Read first
- [Platform blueprint](PLATFORM_BLUEPRINT.md): modules, roles, business rules, API groups, phase sequence, deployment and acceptance gates.
- [Database schema](database/schema.sql): baseline relational model for the product domains in the October 2026 specification.
- [.env example](.env.example): placeholders only; never add real credentials.

## Current implementation status
Implemented as a starter only:
- PHP JSON API entry point with health endpoint and public enquiry/freelancer registration endpoints.
- PDO-based database access and basic validation.
- Hostinger Apache rewrite and basic security headers.
- Expanded schema baseline covering identity, KYC metadata, roles/permissions, teams/ranks, academy, projects/tasks, evidence/QC, ledger/allocations/reserves/payouts, invoices, CRM, notifications, support, webhooks, settings and audit.

Not yet implemented or production-ready:
- OTP delivery/verification, secure authentication/session lifecycle, full role/permission middleware, rate limiting and anti-abuse controls.
- Full admin/client/freelancer screens and end-to-end frontend integration with the API.
- Private evidence object storage, real KYC provider integration, full offline synchronization and automated QC/fraud rules.
- Transactional ledger posting service, rank engine, payout provider, dual approval and reconciliation.
- Production monitoring, backup/restore proof, privacy/retention workflow and security review.

## Hostinger deployment notes
- API subdomain: `https://api.weonboard.in`.
- Document root confirmed by the operator: `public_html/api/`.
- SSL is active for both the API subdomain and main domain.
- A dedicated MySQL database has been created; do not import the schema until the database version is checked and this schema is reviewed/tested on staging.
- Do not overwrite files in the main website document root.
- Store credentials outside the public web root where possible. Never commit passwords, OTPs, tokens, private keys or real customer data.
- Configure the exact website origin for CORS. Do not use wildcard origins for authenticated requests.
- Verify PHP version/extensions (including PDO MySQL and mbstring) and MySQL/MariaDB version before deployment.

## Schema import safety
1. Confirm the new database is dedicated to We Onboard and contains no needed data.
2. Verify the database engine/version in Hostinger.
3. Test the schema on a disposable staging database first and inspect import output.
4. Take a backup before any production schema change.
5. Do not import into the database of the existing website.

## Financial integrity rules
- Wallet balances must be derived from a balanced, append-only ledger, not manually edited balance fields.
- Posted entries are corrected by reversal entries, not edited/deleted.
- Apply 70/20/10 to the freelancer pool; missing leader/manager shares go to Growth Pool.
- Preserve the leader/manager chain snapshot for historical allocations.
- Use idempotency keys for every financial posting and payout request.
- Live payouts remain disabled until a licensed provider and compliance flow are selected and tested.

## Development principle
Build the product specification domain-by-domain, with migrations, authorization tests and acceptance criteria. A table existing in the schema is not proof that the feature is implemented.
