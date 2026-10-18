# We Onboard Platform Blueprint
Version: 0.2 draft
Source of truth: We Onboard Digital & App Platform Specification, Version 1.0 (October 2026)
Repository: `aysergraphicsdvg/We-Onboard`
Deployment target for initial backend: PHP + MySQL on Hostinger at `api.weonboard.in`

## Product surfaces
1. Public website and CRM lead capture.
2. Freelancer mobile-first web/PWA, with Android-first native app planned after API contracts stabilize.
3. Client portal for project requests, progress, evidence, approvals, invoices and exports.
4. Admin console for operations, KYC, QC, finance, support, academy, CRM, settings and audit.
5. Partner API and webhooks, introduced after authentication, authorization and event integrity are in place.

All surfaces use the same backend identity and authorization model. Browser localStorage is not a source of truth for business records.

## Roles and least privilege
Freelancer ranks: Trainee, Team Member, Team Leader, Manager, City/Regional Head.
Client roles: Client Admin, Project Owner, Viewer, Finance.
Platform roles: Ops, KYC Reviewer, QC Lead, Finance, Support, Content/Academy, Sales/CRM, Super Admin.
Roles are stored separately from users; role permissions must be enforced server-side on every protected route. Sensitive changes require a reason and audit event. Finance payout approval must support dual control.

## Domain modules and data ownership
- Identity/security: users, roles, permissions, user_roles, sessions, consent_records.
- Freelancer onboarding: freelancer_profiles, KYC cases and private artifact metadata, agreement and verification provider references.
- Network: teams, effective-dated memberships, rank history, referrals.
- Academy: courses, lessons, enrollments, quiz attempts, certificates.
- Projects: clients and client memberships, project types, versioned rate cards, projects, project staffing, task form templates.
- Execution: tasks, immutable submissions, evidence metadata and private storage keys, QC reviews, fraud flags, quality score events.
- Finance: ledger accounts, journals and lines, earning allocations, reserve holds, payout batches and payouts, invoices and invoice lines.
- CRM/communications: enquiries, CRM activities, notifications and delivery state.
- Service operations: tickets/messages, webhook endpoints/deliveries, system settings, audit events.

The initial MySQL schema is a baseline model for review and staged migrations. It does not mean every module's service, UI, provider integration or workflow is already implemented.

## Core rules from the specification
- Every paid task requires submission evidence and QC approval before earnings can be released.
- Freelancer pool allocation defaults to 70% member / 20% Team Leader / 10% Manager. Missing leader/manager share is allocated to the Growth Pool, not reassigned to the member.
- The allocation chain is snapshotted when work is assigned/approved so later team transfers do not rewrite historical earnings.
- Active member: valid KYC, quality score >=70, no blocking fraud flag, and at least one QC-approved task in the previous 30 days.
- Team Leader threshold: 10+ active members and quality score >=85.
- Manager threshold: at least 3 teams with at least 10 active members each and quality score >=85.
- Default reserve hold is 15 days, configurable by authorized administrators with audit history.
- Referrals are earned only after the referred freelancer becomes active and completes approved work; not for registration alone.
- Full Aadhaar is never stored. Identity artifacts stay in private storage with minimal metadata and masking.
- Ledger postings must be balanced, append-only and idempotent. Correct errors with reversal entries.
- Real payouts require a licensed provider, sandbox validation, dual approval, beneficiary validation, reconciliation and idempotency.

## Delivery sequence
### Step 0 — Blueprint and schema (current)
- Map PDF requirements to domains, permissions, statuses, data tables and acceptance tests.
- Review the expanded schema against Hostinger's actual MySQL/MariaDB version.
- Add migration/version tracking and seed data only after schema review.

### Step 1 — API security and identity
- Private configuration loading, PDO bootstrap, structured errors, request IDs, CORS allow-list.
- OTP provider adapter interface (no fake production OTP); rate limits and abuse controls.
- Session/token lifecycle, device/session revocation, role and permission middleware.
- Consent capture and audit trail.

### Step 2 — Enquiry and freelancer onboarding
- Public enquiry and join flows persist to MySQL, with source/UTM/consent and server-side validation.
- Admin queue to review, assign, contact, reject or advance leads.
- Freelancer profile, KYC state machine and manual review queue; provider adapters added only after selection.

### Step 3 — Academy and project/task workflow
- Courses, lessons, quizzes, completion records.
- Project types, versioned rate cards, client request and admin approval.
- Assignments, dynamic form schemas, evidence upload via private storage, offline-safe idempotent submissions.
- QC queue, reason codes, rework and approval events.

### Step 4 — Teams, earnings and finance controls
- Team membership history and rank eligibility calculation.
- Earning allocation and reserve rules.
- Double-entry journal service, wallet views derived from ledger, payout batches and invoices.
- Payout provider integration remains disabled until provider and compliance review are complete.

### Step 5 — Client/admin surfaces and operations
- Client project dashboards, proof gallery, reports, approvals and invoices.
- Admin modules for KYC, QC, projects, team/rank, finance, CRM, support, academy, audit and settings.
- Notification templates and provider delivery logs.

### Step 6 — Hardening and release
- Automated API and authorization tests, migrations tested on staging, backup/restore test, dependency review, monitoring and incident runbook.
- Production cutover only after security review, consent/privacy review, and end-to-end acceptance testing.

## Proposed API groups
- `GET /api/health` — public liveness only; must not expose environment or database details.
- `POST /api/enquiries`, `POST /api/freelancers` — public forms with validation, consent and abuse controls.
- `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `GET /api/me`, `POST /api/auth/logout`.
- `GET/PATCH /api/me/profile`, `POST /api/me/kyc/start`.
- `GET /api/courses`, `POST /api/courses/{id}/enrol`, `POST /api/quizzes/{id}/attempts`.
- `GET /api/projects`, `GET /api/projects/{id}`, `POST /api/projects/{id}/join`.
- `GET /api/tasks`, `POST /api/tasks/{id}/submissions`, `POST /api/uploads/sign`.
- `GET /api/admin/qc/queue`, `POST /api/admin/qc/{id}/decision`.
- `GET /api/team`, `GET /api/rank/progress`, `GET /api/wallet`, `GET /api/payouts`.
- `GET /api/client/projects/{id}/metrics`, `GET /api/client/invoices`.
- Admin APIs are namespaced and permission-protected. Exact paths and payloads must be versioned before UI integration.

## Hostinger deployment constraints
- Keep API document root at `public_html/api/`; do not overwrite the root website.
- Store database credentials in a private file outside the public document root if the hosting account permits; otherwise use the safest supported Hostinger environment/config mechanism. Never commit secrets.
- Do not expose schema, backups, logs, private uploads or configuration files through the web root.
- Validate actual PHP version/extensions and database engine before importing the schema.
- Shared hosting may not meet the PDF's eventual high-availability, worker/queue, storage and scaling targets. Treat this as an MVP deployment, and document a migration path for scale.
- Keep the API subdomain HTTPS-only and restrict CORS to the exact website origin.

## Acceptance gates before any production data
1. Schema imports successfully into a fresh staging database and foreign keys/indexes are verified.
2. No secrets or real personal data in GitHub, logs or public storage.
3. Unauthorized users cannot read or mutate protected records by changing IDs.
4. Consent, role changes, QC decisions, ledger postings and payouts create audit trails.
5. Ledger balancing and idempotency tests pass.
6. Backup restore and rollback procedure are demonstrated.
