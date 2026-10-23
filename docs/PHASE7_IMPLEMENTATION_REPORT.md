# WE ONBOARD — PHASE 7 IMPLEMENTATION REPORT
## Wallet, Double-Entry Ledger, Earnings and Payout Management

**Execution Timestamp:** 2026-10-21  
**Author:** AI Engineer (Senior Systems Architect)  
**Target Environment:** Hostinger Business Shared Hosting (PHP 8.2+, MySQL/MariaDB) & Client SPA (React 19, TypeScript, Vite, Tailwind CSS)  
**Scope:** Phase 7 Financial Subsystem, Double-Entry Ledger, 70/20/10 Revenue Allocation, 10% Reserve Management, Freelancer Wallets, Statements, Atomic Payout Workflows, and Admin Financial Console.

---

## 1. Executive Summary

Phase 7 introduces an institutional-grade, audit-proof financial subsystem to the We Onboard platform. All financial movements—from QC-approved task completions to reserve retentions, matured releases, payout requests, clearing settlements, and reversal corrections—are governed strictly by a **double-entry ledger engine**. 

### Core Guarantees Delivered:
1. **Double-Entry Equilibrium:** Total debits strictly equal total credits ($\sum \text{Debits} \equiv \sum \text{Credits}$) on every posted transaction. Unbalanced entries are rejected and rolled back at the database level.
2. **Fixed-Precision Arithmetic:** All monetary values are processed using `DECIMAL(12,2)` (minor-unit safe) in SQL and 2-decimal rounded precision in TypeScript/PHP. Floating-point arithmetic is strictly eliminated.
3. **Immutable Journaling:** Posted journals are never edited or deleted. Corrective adjustments are executed solely via linked reversal and replacement journals.
4. **Autonomous 70/20/10 Split & Growth Pool Routing:** Freelancers receive 70% of gross task payouts (subject to a 10% 15-day quality reserve). Team Leaders receive 20% and Project Managers receive 10% based on verified hierarchy qualification. Unallocated or disqualified supervisor shares are automatically routed to the platform **Growth Pool (Account 3001)**.
5. **Atomic Payout Reservation:** Freelancer payout requests atomically lock available funds into in-transit clearing accounts (`Account 2005`), eliminating double-spending and race conditions.
6. **Segregation of Duties & Provider Boundary:** Payment provider secrets and webhooks are isolated server-side with HMAC-SHA256 signature enforcement, mock/simulated adapter support, and no real fund transfers.

---

## 2. Financial Architecture & Chart of Accounts

The subsystem utilizes a standard double-entry chart of accounts categorized into Assets, Liabilities, Equity, and Expenses:

| Account Code | Account Name | Type | Normal Balance | Description |
| :--- | :--- | :--- | :--- | :--- |
| **1001** | Cash & Bank Clearing | Asset | Debit | Disbursed platform funds and banking settlement clearing account. |
| **2001** | Freelancer Available Liabilities | Liability | Credit | Freely withdrawable earnings belonging to active freelancers. |
| **2002** | Team Leader Payables | Liability | Credit | Overrides earned by qualified field team leaders (20%). |
| **2003** | Manager Payables | Liability | Credit | Supervision overrides earned by project managers (10%). |
| **2004** | Reserve Liabilities (10% Quality Hold) | Liability | Credit | Quality retention held for 15 days from task approval. |
| **2005** | Payout In-Transit Clearing | Liability | Credit | Earmarked funds deducted from freelancer wallet awaiting provider settlement. |
| **3001** | Growth Pool Equity | Equity | Credit | Unallocated supervisor shares and platform expansion reserves. |
| **5001** | Direct Project Execution Cost | Expense | Debit | Platform execution expense recognized on approved tasks. |

### Accounting Treatment by Transaction Type

#### A. Task QC Approval & Earning Recognition (`EARNING_RECOGNITION`)
* **Debit:** `5001 Direct Project Execution Cost` (Gross task value, e.g., ₹1,000.00)
* **Credit:** `2001 Freelancer Available Liabilities` (63% net share: 70% gross minus 10% reserve, e.g., ₹630.00)
* **Credit:** `2004 Reserve Liabilities` (7% reserve hold: 10% of 70% gross, e.g., ₹70.00)
* **Credit:** `2002 Team Leader Payables` (20% if qualified, e.g., ₹200.00) OR `3001 Growth Pool Equity` (if unassigned/unqualified)
* **Credit:** `2003 Manager Payables` (10% if qualified, e.g., ₹100.00) OR `3001 Growth Pool Equity` (if unassigned/unqualified)

#### B. Matured Reserve Release (`RESERVE_RELEASE`)
* **Debit:** `2004 Reserve Liabilities` (Amount released)
* **Credit:** `2001 Freelancer Available Liabilities` (Amount transferred to withdrawable balance)

#### C. Payout Request Earmark (`PAYOUT_REQUESTED`)
* **Debit:** `2001 Freelancer Available Liabilities` (Withdrawable balance reduction)
* **Credit:** `2005 Payout In-Transit Clearing` (Holding liability for payout processing)

#### D. Payout Settlement (`PAYOUT_SETTLED`)
* **Debit:** `2005 Payout In-Transit Clearing` (Clearance of holding liability)
* **Credit:** `1001 Cash & Bank Clearing` (Outflow of funds confirmed by provider)

#### E. Payout Reversal / Failure Refund (`PAYOUT_REVERSED`)
* **Debit:** `2005 Payout In-Transit Clearing` (Clearance of failed payout liability)
* **Credit:** `2001 Freelancer Available Liabilities` (Restoration to freelancer withdrawable balance)

#### F. Manual Supervisor Adjustment (`MANUAL_ADJUSTMENT`)
* Balanced debit and credit correcting entries with mandatory supervisor justification and optional reversal reference.

---

## 3. Database Schema & Migration 007

The schema was non-destructively updated in `database/migrations/007_phase7_wallet_ledger_earnings_payouts.sql` and merged into master `database/schema.sql`:

1. **`ledger_accounts`**: Stores account metadata, codes, categories, normal balance, and status.
2. **`ledger_journals`**: Master journal table storing unique `journal_ref`, `transaction_type`, `narration`, `total_debit`, `total_credit`, `posted_by`, and `reversal_of_journal_id`.
3. **`ledger_entries`**: Individual debits and credits linked to journal entries, account codes, entity types (`Freelancer`, `TeamLeader`, `Manager`, `Platform`), and entity IDs.
4. **`earning_entitlements`**: Complete breakdown of approved task rate, freelancer gross/net/reserve, TL/Manager shares, Growth Pool allocations, qualification snapshots, and journal linkage.
5. **`reserve_records`**: Tracking table for 10% quality reserves, hold duration (15 days), maturity timestamp (`release_due_at`), status (`Held`, `Released`, `Forfeited`), and release journal reference.
6. **`wallets`**: Real-time projection table storing `available_balance`, `reserved_balance`, `pending_earnings`, `total_earned`, `payouts_in_progress`, and `paid_payouts`.
7. **`payout_requests`**: Payout requests with idempotency keys, payment details, status (`Requested`, `Under Review`, `Approved`, `Processing`, `Paid`, `Failed`, `Cancelled`), journal references, and provider transfer references.

---

## 4. Backend APIs & Hostinger Integration

The following PHP 8.2+ endpoints are fully compatible with Hostinger Business Shared Hosting and require zero custom extensions:

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/wallet/index.php` | `GET` | Freelancer | Provides wallet balances, ledger entries, reserve schedule, and payout history. |
| `/api/v1/wallet/statement.php` | `GET` | Freelancer | Date-range filtered itemized financial statement with JSON and CSV export formats. |
| `/api/v1/payouts/request.php` | `POST` | Freelancer | Submits withdrawal request with KYC validation, balance verification, and idempotency key. |
| `/api/v1/payouts/list.php` | `GET` | Freelancer | Lists payout history, status, and failure justifications. |
| `/api/v1/payouts/webhook.php` | `POST` | Provider | Server-side HMAC-SHA256 signature verification and idempotent settlement/failure processing. |
| `/api/v1/admin/financial/overview.php` | `GET` | Admin | High-level financial KPIs, account balances, liability breakdown, and trial balance check. |
| `/api/v1/admin/financial/journals.php` | `GET` | Admin | Journal and line inspector with transaction type filters and journal search. |
| `/api/v1/admin/financial/earnings.php` | `GET` | Admin | Inspection of 70/20/10 earning entitlements and Growth Pool allocations. |
| `/api/v1/admin/financial/reserves.php` | `GET` | Admin | Reserve schedule inspector and administrative release trigger. |
| `/api/v1/admin/financial/payouts.php` | `GET`, `POST` | Admin | Payout approval, manual settlement, and failure reversal controls. |
| `/api/v1/admin/financial/reconcile.php` | `GET` | Admin | Trial balance generator and wallet-to-ledger discrepancy detector. |
| `/api/v1/admin/financial/adjust.php` | `POST` | Admin | Balanced manual adjustment journal poster with dual-entry audit. |
| `/cron/release_reserves.php` | `CLI / GET` | System / Cron | Automated worker to release matured reserves past the 15-day hold period. |

### Hostinger Cron Job Configuration:
To run scheduled reserve releases automatically on Hostinger Business Hosting:
```bash
# Hostinger cPanel -> Cron Jobs -> Add New Cron Job (Every 15 minutes)
*/15 * * * * php /home/u123456789/public_html/cron/release_reserves.php >> /home/u123456789/cron_financial.log 2>&1
```

---

## 5. Frontend User Experience Modules

Two comprehensive, production-grade frontend modules were built and connected to the navigation:

### A. Freelancer Wallet View (`src/components/freelancer/FreelancerWalletView.tsx`)
- **Metric Cards:** Available Balance, Reserved Balance (10% quality hold), Pending Earnings (under review), and Total Lifetime Earned.
- **Request Payout Modal:** Strict client-side validation against available balance, KYC status, and ₹500 minimum threshold. Earmarks funds instantly upon submission.
- **Itemized Ledger Tab:** Transaction-by-transaction view showing journal references, debit/credit badges, timestamps, and line narrations.
- **Reserves Schedule Tab:** Progress bar tracking 15-day countdown to maturity for each task hold with release dates.
- **Payout History Tab:** Status pill tracking (`Requested`, `Approved`, `Processing`, `Paid`, `Failed`) with provider references and rejection reasons.
- **Statement Generator Tab:** Date picker and one-click downloadable CSV/JSON statement export.

### B. Admin Financial Console (`src/components/admin/FinancialConsole.tsx`)
- **Financial Overview KPIs:** Cash & Clearing, Freelancer Liabilities, Supervisor Payables, Reserves Held, Growth Pool Equity, and Direct Project Costs.
- **Global Trial Balance Card:** Real-time visual indicator verifying whether $\text{Total Debits} \equiv \text{Total Credits}$ across all accounts with ₹0.00 discrepancy.
- **Ledger Journal Inspector:** Filterable table of all double-entry journals with drill-down modal inspecting every debit and credit line.
- **Earnings & Allocations Module:** Task-by-task breakdown of the 70/20/10 split and unallocated supervisor routing to Account 3001.
- **Reserves Manager:** Administrative overview of active holds and one-click manual release trigger for matured holds.
- **Payout Approval & Settlement Desk:** Administrative approval, provider settlement, and rejection with instant wallet refund.
- **Manual Adjustment Modal:** Form allowing finance supervisors to post balanced adjustment journals with audit justifications.

---

## 6. Automated Verification & Test Results

A dedicated automated test suite (`scripts/phase7_financial_ledger_test.ts`) was executed along with all existing Phase 1–6 test suites:

### Phase 7 Test Suite Results (`scripts/phase7_financial_ledger_test.ts`):
```
================================================================
WE ONBOARD — PHASE 7 FINANCIAL SUBSYSTEM & DOUBLE-ENTRY LEDGER
================================================================

--- SUITE 1: Double-Entry Ledger Integrity ---
[✓ PASS] [1. Ledger Integrity] Balanced Double-Entry Journal Posting: Debits (₹500.00) == Credits (₹500.00)
[✓ PASS] [1. Ledger Integrity] Rejection of Unbalanced Journal: Unbalanced journal (₹500 vs ₹400) rejected & rolled back
[✓ PASS] [1. Ledger Integrity] Ledger Trial Balance Check: Trial balance verified, Discrepancy: ₹0

--- SUITE 2: Earning Recognition & 70/20/10 Allocation ---
[✓ PASS] [2. Earning Recognition] 70% Freelancer Gross with 10% Reserve: Gross ₹700 (70%), Net ₹630 (63%), Reserve ₹70 (7%)
[✓ PASS] [2. Earning Recognition] 100% Balanced Allocation & Growth Pool Routing: Allocations sum to ₹1,000.00 exactly
[✓ PASS] [2. Earning Recognition] Duplicate Earning Recognition Prevention: Repeated call returned existing entitlement

--- SUITE 3: Reserve Management & Release ---
[✓ PASS] [3. Reserve Management] Reserve Record Created and Tracked in Wallet
[✓ PASS] [3. Reserve Management] Premature Reserve Release Prevention: Scheduled release ignored unmatured 15-day hold
[✓ PASS] [3. Reserve Management] Matured Reserve Release to Available Balance: Released ₹70 from 2004 to 2001
[✓ PASS] [3. Reserve Management] Duplicate Reserve Release Prevention: Released reserve cannot be released twice

--- SUITE 4: Payout Request & Concurrency Guard ---
[✓ PASS] [4. Payout Governance] KYC Approval Required for Payout Requests: Unverified freelancer blocked
[✓ PASS] [4. Payout Governance] Minimum Payout Threshold Enforcement (₹500): Request for ₹200 blocked
[✓ PASS] [4. Payout Governance] Overspending Prevention & Balance Boundary: Exceeding balance rejected
[✓ PASS] [4. Payout Governance] Atomic Balance Earmark & Payout Journal: Available reduced, in-progress increased
[✓ PASS] [4. Payout Governance] Payout Request Idempotency Key Replay: Replaying request returned existing payout

--- SUITE 5: Payout Settle, Failure & Reversal ---
[✓ PASS] [5. Payout Lifecycle] Payout Settlement & Clearing (2005 -> 1001): Provider ref recorded, in-progress cleared
[✓ PASS] [5. Payout Lifecycle] Reversal of Settled Paid Payout Rejected: Already settled payout cannot be reversed
[✓ PASS] [5. Payout Lifecycle] Failed Payout Reversal & Wallet Refund (2005 -> 2001): Restored ₹500 to available balance

--- SUITE 6: Non-Regression of Phases 1 to 6 ---
[✓ PASS] [6. System Non-Regression] Phases 1-6 State Entities Preserved: All state datasets intact
[✓ PASS] [6. System Non-Regression] Final Global Trial Balance Balanced: ₹5570.00 == ₹5570.00, Discrepancy: ₹0

================================================================
PHASE 7 TEST SUITE SUMMARY: 20/20 PASSED (100.0%)
================================================================
```

### Regression Verification of Previous Phases:
- **Phase 6 (QC Hardening, Performance, Teams & Ranks):** 23/23 Passed.
- **Phase 5 (Projects & Task Dispatch):** 26/26 Passed.
- **Phase 4 (Academy & Certifications):** 19/19 Passed.
- **Phase 3 (Freelancer Identity & KYC):** 19/19 Local Checks Passed.
- **Phase 2.3 (Security Specification):** 13/13 Passed.
- **Vite Production Compilation:** Passed cleanly (`npm run build`).

---

## 7. Security, Reconciliation & Idempotency Controls

1. **Idempotency Keys:** Every payout request requires an idempotency key (`idempotency_key` column with unique index). Replay submissions return the existing payout object without deducting funds or posting duplicate journals.
2. **Double-Spend Protection:** Funds are moved from withdrawable liabilities (`2001`) to in-transit clearing (`2005`) immediately within the request transaction. Simultaneous requests fail with `Insufficient available balance`.
3. **Database Transactions & Locking:** In PHP, critical financial procedures use `BEGIN TRANSACTION`, `SELECT ... FOR UPDATE` row locks, and auto-rollback on failure.
4. **Server-Side Webhook Verification:** The payment webhook (`api/v1/payouts/webhook.php`) verifies payload authenticity using `hash_equals(hash_hmac('sha256', $payload, $secret), $signature)`. Unsigned or tampered payloads return HTTP 401.
5. **Segregation of Duties:** Payout requests, approvals, settlements, and reversals are distinct state transitions with recorded reviewer identities (`reviewed_by`) and audit logs. Administrators cannot delete or silently alter journals.

---

## 8. Remaining Staging & Payment Provider Integration Requirements

Before moving from simulated/manual payouts to automated disbursements with a licensed payment gateway (e.g., RazorpayX, Cashfree Payouts, or bank API):

1. **Commercial & Compliance Setup:**
   - Execute merchant onboarding agreement with licensed disbursement provider.
   - Complete corporate KYC and configure dedicated nodal/escrow disbursement account.
   - Register webhook endpoints in provider dashboard with high-entropy secret.
2. **Environment Variables Configuration:**
   - Set `PAYOUT_PROVIDER=razorpayx|cashfree` in production `.env` (never exposed to frontend).
   - Configure `PAYOUT_API_KEY`, `PAYOUT_API_SECRET`, and `PAYOUT_WEBHOOK_SECRET`.
3. **Bank Validation & Penny Drop:**
   - Integrate automated penny-drop bank account name verification prior to enabling bank transfer payouts.
   - Validate UPI VPA format and handle real-time verification before request submission.
4. **Tax Deduction at Source (TDS):**
   - Implement Section 194C / 194O TDS calculation modules when aggregate annual earnings cross statutory thresholds.
