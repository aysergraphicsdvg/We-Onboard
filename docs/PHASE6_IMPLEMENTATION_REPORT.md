# WE ONBOARD — PHASE 6 IMPLEMENTATION REPORT
## Quality Control Hardening, Freelancer Performance, Team Hierarchy & Rank Engine

### 1. Executive Summary
Phase 6 of We Onboard establishes the operational governance infrastructure required for large-scale field associate coordination across metropolitan corridors. It strengthens Quality Control (QC) decision integrity, implements a verified, non-fabricated Quality Score (QS) engine, enforces a single-team reporting hierarchy with circular reporting prevention, and activates an administrative rank promotion board grounded in verifiable performance data.

All Phase 1–5 features (Enquiry CRM, MSME Support Desk, Freelancer KYC, Operational Academy with timed assessments and verifiable certificates, Project & Task dispatch) remain fully preserved with zero regressions.

---

### 2. QC Approval Integrity & Security Hardening

#### 2.1 Double-Approval Prevention & Concurrency Protection
- **Row-Level Locking**: `api/v1/admin/qc/review.php` enforces database transactions with `SELECT ... FOR UPDATE` on both `tasks` and `projects` tables.
- **Atomic State Transitions**: If an administrator or reviewer attempts to approve a task that is already marked `Approved`, the endpoint detects the existing state and prevents double-incrementing project completion counters or calculating duplicate payouts.
- **Safe Client Retries**: If network timeouts cause a client to replay an approval request with the same decision, the system returns a safe idempotent `HTTP 200` response without altering audit records or corrupting counters.
- **Mandatory Review Reasons**: Decisions marking work as `Rework Required` or `Rejected` require mandatory, non-empty review comments detailing specific deficiencies or re-submission instructions (`HTTP 400` on missing comment).
- **Audit Preservation**: Complete review history across multiple rework cycles is preserved in the newly introduced `task_review_history` table, tracking `reviewer_id`, `reviewer_name`, `decision`, `review_comment`, and `reviewed_at`.

#### 2.2 Task Dispatch & Capacity Constraints
- **Project Lifecycle Enforcement**: Tasks cannot be claimed if the parent project is `Paused`, `Draft`, `Closed`, or `Completed`.
- **Expiration Enforcement**: Project `end_date` is checked server-side; tasks under expired projects are closed for claims.
- **Target Quota Ceiling**: The server enforces `completed_units < target_units`.
- **Concurrent Active Limit**: Freelancers reaching their maximum active task limit (`max_tasks_per_freelancer`, default 5) are barred from claiming further tasks until current work is reviewed.
- **Multi-Tenant Ownership Isolation**: On evidence upload, submission, and review endpoints, task assignment is verified against the authenticated freelancer session (`assigned_freelancer_id === session_id`), blocking cross-tenant tampering with `HTTP 403 Forbidden`.

#### 2.3 Evidence Privacy
- **Private File Streamer**: Field evidence files are stored in `storage/evidence/` outside the public web root and guarded by Apache `.htaccess` (`Deny from all`).
- **Authorization on Download**: `api/v1/tasks/evidence_file.php` enforces strict server-side authorization: only the assigned freelancer or an authenticated administrator can retrieve the file stream.
- **Directory Traversal Mitigation**: File paths are validated using PHP `realpath()` containment checks (`strpos(realTarget, allowedDir) === 0`) to eliminate `../` directory traversal vectors.

---

### 3. Freelancer Performance & Quality Score (QS) Engine

#### 3.1 Configurable Formula & Component Weights
The Quality Score evaluates real on-ground task performance on a 0–100 scale using configurable parameters stored in the database (`quality_score_config` table):

| Factor | Weight | Evaluation Criteria |
| :--- | :--- | :--- |
| **QC Approval Rate** | **40%** | Approved tasks divided by total reviewed tasks (Approved + Rework Required + Rejected). |
| **First-Time-Right Rate** | **25%** | Approved tasks completed with zero rework cycles divided by total approved tasks. |
| **Timeliness Rate** | **20%** | Tasks submitted on or before the assigned deadline divided by total submitted tasks. |
| **Evidence & GPS Completeness** | **15%** | Submitted tasks with required photos and valid GPS coordinates divided by total tasks. |
| **Confirmed Disciplinary Penalty** | **-50 pts** | Subtracted from the subtotal when an administrative policy violation flag is active. |

#### 3.2 Treatment of New Freelancers & Sample Size
- **Minimum Sample Size**: Set to 3 reviewed tasks (`min_sample_size`).
- **No Fabricated Scores**: A freelancer with fewer than 3 reviewed tasks is assigned status `Insufficient Data` with `quality_score = null`.
- **Zero Inherent Bias**: New associates are not assigned an arbitrary 0 score (which would incorrectly penalize them) nor a fabricated 100. Their status clearly states `Insufficient Data (X/3 reviewed tasks)`.
- **Calculation Timestamps**: The exact timestamp of recalculation is stored in `qs_last_calculated_at`.

#### 3.3 Disciplinary & Fraud Policy Management
- Unverified allegations are protected from automatically penalizing associates.
- Disciplinary flags (`fraud_flag`) require explicit administrative confirmation via `api/v1/admin/performance/scores.php` with mandatory substantiated reason, admin ID, and timestamp recorded in audit logs.
- Disciplinary flags can be resolved with documented administrative justification.

---

### 4. Field Team Hierarchy & Rank Engine

#### 4.1 5-Tier Business Hierarchy
1. **Trainee**: Default starting rank upon registration. KYC verification pending or newly approved with 0 completed field tasks.
2. **Team Member**: Valid KYC approval and at least 1 QC-approved field task.
3. **Team Leader**: Leads an active field team with at least 10 active members, Quality Score $\ge 85.0$, and zero fraud flag.
4. **Manager**: Oversees at least 3 qualifying teams (each having $\ge 10$ active members), Quality Score $\ge 85.0$, and zero fraud flag.
5. **City/Regional Head**: Oversees metropolitan operations cluster with $\ge 5$ qualifying teams and Quality Score $\ge 90.0$.

#### 4.2 Active Member Definition (4 Mandatory Rules)
A team member qualifies as an **Active Member** only when ALL 4 verified criteria are satisfied:
1. **KYC Approved**: Freelancer account status is `Active` or onboarding status is `Approved`.
2. **Quality Score Threshold**: Verified Quality Score of at least **70.0 points** (`active_member_min_qs`).
3. **Zero Policy Flag**: No active disciplinary or fraud flag (`fraud_flag = 0`).
4. **Recent Field Activity**: At least 1 QC-approved task completed within the preceding **30 days**.

#### 4.3 Structural Constraints & Anti-Corruption Rules
- **Unique Team Membership**: A database `UNIQUE` constraint on `team_members.freelancer_id` and server-side checks strictly prohibit duplicate membership across multiple teams.
- **Circular Reporting Prevention**: An Area Manager cannot be added as a subordinate team member to a team they manage. A Team Leader cannot simultaneously act as their own oversight Manager.
- **Eligibility vs. Promotion Distinction**: Eligibility calculation evaluates live verified records. Meeting criteria qualifies a candidate for review, but promotions are **never automatic**. They require explicit administrative review and recorded justification in the `rank_promotions` table.

---

### 5. Database Schema & Migration 006
Migration `006_phase6_qc_performance_hierarchy_ranks.sql` is non-destructive and idempotent:
- **Altered `freelancers`**: Added `current_rank`, `team_id`, `quality_score`, `qs_sample_size`, `qs_status`, `qs_last_calculated_at`, `fraud_flag`, `fraud_reason`, `fraud_flagged_by`, `fraud_flagged_at`.
- **Table `teams`**: Defines field corridor units with `leader_id`, `manager_id`, `city`, `operating_area`, and status.
- **Table `team_members`**: Tracks roster membership with `UNIQUE (freelancer_id)`.
- **Table `rank_promotions`**: Audits nomination and approval transitions with status (`Eligible`, `Nominated`, `Approved`, `Rejected`), snapshots, reviewer identity, and reasons.
- **Table `task_review_history`**: Preserves full audit log of all QC rework and approval cycles.
- **Table `quality_score_config`**: Stores configurable weights, thresholds, and minimum sample sizes.

---

### 6. Hostinger Deployment Package Synchronization
The one-click Hostinger deployment generator (`src/services/hostingerPackage.ts`) has been updated to include:
- `database/schema.sql` (fully up-to-date with Phase 1–6 tables and views)
- `database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql`
- `config/quality_score.php`
- `api/v1/admin/qc/review.php` (Phase 6 transaction & row-locking hardened)
- `api/v1/admin/performance/scores.php`
- `api/v1/admin/performance/recalculate.php`
- `api/v1/admin/ranks/eligibility.php`
- `api/v1/admin/ranks/promote.php`
- `api/v1/admin/teams/list.php`
- `api/v1/admin/teams/manage.php`
- `api/v1/freelancers/performance.php`

---

### 7. Automated Test Suite Results
The test suite `scripts/phase6_qc_performance_hierarchy_test.ts` executes 33 verification checks across all Phase 6 domains:

```
================================================================
PHASE 6 TEST SUITE COMPLETED: 33/33 PASSED (0 FAILED)
================================================================
✓ Suite 1: QC Approval Integrity & Double-Approval Prevention (5/5 PASS)
✓ Suite 2: Task Dispatch Hardening & Capacity Constraints (5/5 PASS)
✓ Suite 3: Evidence Privacy & Storage Protection (3/3 PASS)
✓ Suite 4: Quality Score Engine & Configurable Formula (5/5 PASS)
✓ Suite 5: Team Hierarchy & Active Member Governance (3/3 PASS)
✓ Suite 6: Rank Engine & Promotion Board (5/5 PASS)
✓ Suite 7: Hostinger Deployment Package Integrity (3/3 PASS)
✓ Suite 8: Non-Regression of Phase 1 to Phase 5 Features (4/4 PASS)
```
