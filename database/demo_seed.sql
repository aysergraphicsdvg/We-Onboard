-- =========================================================================
-- WE ONBOARD — SAFE DEMONSTRATION DATASET (MySQL / MariaDB Compatible)
-- =========================================================================
-- Safe, repeatable, idempotent and non-destructive:
-- Uses SET FOREIGN_KEY_CHECKS = 0/1 and ON DUPLICATE KEY UPDATE.
-- All demonstration records are clearly prefixed with DEMO- or tagged with [DEMO].
-- Does not contain real PII, production secrets, or live payment credentials.
-- Matches double-entry ledger ground truth and the 70/20/10 split model.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------------------
-- 1. DEMO CLIENTS
-- -------------------------------------------------------------------------
INSERT INTO clients (
    id, client_ref, company_name, primary_contact, phone, email,
    industry, city, website, lead_source, status, contract_value, created_at
) VALUES
(
    901, 'CLI-DEMO-01', 'RetailHub Karnataka [DEMO]', 'Anand Kumar [DEMO Client]',
    '+91 80 4123 9901', 'contact@retailhub-demo.in', 'Retail & FMCG',
    'Bengaluru', 'https://retailhub-demo.in', 'Inbound Referral', 'Active Client', 60000.00, '2026-10-01 09:00:00'
),
(
    902, 'CLI-DEMO-02', 'FoodSafety Audit Corp [DEMO]', 'Dr. Meenakshi Sundaram [DEMO Client]',
    '+91 80 2555 8812', 'audits@foodsafety-demo.in', 'Food & Hospitality',
    'Bengaluru', 'https://foodsafety-demo.in', 'Direct Corporate', 'Active Client', 45000.00, '2026-10-03 10:00:00'
),
(
    903, 'CLI-DEMO-03', 'RetailPulse Analytics [DEMO]', 'Vikram Malhotra [DEMO Client]',
    '+91 80 6711 4455', 'surveys@retailpulse-demo.in', 'Market Intelligence',
    'Bengaluru', 'https://retailpulse-demo.in', 'Partner Network', 'Active Client', 40000.00, '2026-10-08 11:00:00'
)
ON DUPLICATE KEY UPDATE
company_name = VALUES(company_name),
primary_contact = VALUES(primary_contact),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 2. DEMO PROJECTS (Three Distinct Workflows)
-- -------------------------------------------------------------------------
-- Budget Resolution for Project 1:
-- 40 target units @ ₹1,200 per activation rate = ₹48,000 direct field disbursement pool.
-- Total approved contract budget cap = ₹60,000 (includes ₹12,000 merchant QR standee
-- collateral, merchant onboarding kits and supervisor logistics buffer).
-- -------------------------------------------------------------------------
INSERT INTO projects (
    id, project_ref, name, client_id, client_name, service_category,
    required_kyc_level, description, requires_location, target_city,
    target_areas, target_units, completed_units, max_tasks_per_freelancer,
    start_date, end_date, payment_model, payout_rate, budget, status, created_at
) VALUES
(
    901,
    'DEMO-PRJ-01',
    '[DEMO] Retail Merchant Onboarding & POS Setup',
    901,
    'RetailHub Karnataka [DEMO]',
    'Merchant and restaurant onboarding',
    'Approved',
    '[DEMO] Onboarding local grocery, FMCG and general merchant retail shops with storefront validation, owner KYC, and digital POS app deployment across Indiranagar and Koramangala corridors. Total Approved Contract Budget Cap: ₹60,000 (comprising 40 target units @ ₹1,200 per activation rate = ₹48,000 direct field disbursement pool + ₹12,000 merchant QR standee collateral, merchant onboarding kits and supervisor logistics buffer).',
    1,
    'Bengaluru',
    '["Indiranagar", "Koramangala", "Domlur"]',
    40,
    24,
    5,
    '2026-10-01',
    '2026-11-15',
    'Per Activation',
    1200.00,
    60000.00,
    'Active',
    '2026-10-01 10:00:00'
),
(
    902,
    'DEMO-PRJ-02',
    '[DEMO] Restaurant & MSME Hygiene & License Field Audit',
    902,
    'FoodSafety Audit Corp [DEMO]',
    'Field audits and surveys',
    'Approved',
    '[DEMO] In-person hygiene checklist and FSSAI display compliance audit for cloud kitchens, dine-in restaurants, and bakeries with mandatory geo-tagged photographic evidence across HSR Layout and BTM Layout corridors. Total Project Budget: ₹45,000 (30 target units @ ₹1,500 audit payout rate).',
    1,
    'Bengaluru',
    '["HSR Layout", "BTM Layout", "Jayanagar"]',
    30,
    16,
    4,
    '2026-10-05',
    '2026-11-20',
    'Per Audit',
    1500.00,
    45000.00,
    'Active',
    '2026-10-05 10:00:00'
),
(
    903,
    'DEMO-PRJ-03',
    '[DEMO] Market Survey & Retail Mystery Shopping',
    903,
    'RetailPulse Analytics [DEMO]',
    'Field audits and surveys',
    'Approved',
    '[DEMO] Customer service experience, pricing accuracy, and checkout speed mystery shopping across malls and electronics retail chains in Whitefield and Marathahalli. Total Project Budget: ₹40,000 (50 target units @ ₹800 audit payout rate).',
    1,
    'Bengaluru',
    '["Whitefield", "Marathahalli", "ITPL"]',
    50,
    20,
    6,
    '2026-10-10',
    '2026-11-25',
    'Per Audit',
    800.00,
    40000.00,
    'Active',
    '2026-10-10 10:00:00'
)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
target_units = VALUES(target_units),
completed_units = VALUES(completed_units),
budget = VALUES(budget),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 3. DEMO FREELANCERS / ASSOCIATES
-- -------------------------------------------------------------------------
INSERT INTO freelancers (
    id, registration_ref, full_name, email, phone, dob, gender,
    residential_address, city, state, pin_code, is_adult, has_smartphone,
    languages, preferred_areas, preferred_work_type, education,
    previous_experience_years, sales_field_experience, skills,
    preferred_role, status, onboarding_status, registered_at,
    current_rank, quality_score, rating, completed_tasks_count,
    total_earnings, pending_payout, bank_account_masked
) VALUES
(
    901,
    'DEMO-TM-01',
    'Pooja Hegde [DEMO Team Member]',
    'pooja.member@weonboard-demo.in',
    '+91 98888 11223',
    '1999-04-12',
    'Female',
    '100ft Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["Kannada", "English", "Hindi"]',
    '["Indiranagar", "Koramangala"]',
    'Full-time',
    'Bachelor of Science',
    2,
    1,
    '["Merchant Onboarding", "POS Activation", "Field Verification"]',
    'Team Member',
    'Active',
    'Approved',
    '2026-10-02 10:00:00',
    'Team Member',
    88.50,
    4.8,
    18,
    1400.00,
    0.00,
    'HDFC Bank - •••• 9841'
),
(
    902,
    'DEMO-TM-02',
    'Imran Khan [DEMO Team Member]',
    'imran.member@weonboard-demo.in',
    '+91 97777 22334',
    '2001-08-19',
    'Male',
    'BTM 2nd Stage, Near Water Tank',
    'Bengaluru',
    'Karnataka',
    '560076',
    1,
    1,
    '["Kannada", "Hindi", "English", "Urdu"]',
    '["BTM Layout", "HSR Layout"]',
    'Flexible',
    'Pre-University / 12th',
    1,
    1,
    '["Field Audits", "Surveys", "Food Safety Inspection"]',
    'Team Member',
    'Active',
    'Approved',
    '2026-10-04 11:30:00',
    'Team Member',
    78.00,
    4.2,
    12,
    1050.00,
    0.00,
    'SBI - •••• 4512'
),
(
    903,
    'DEMO-TL-01',
    'Rajesh Gowda [DEMO Team Leader]',
    'rajesh.leader@weonboard-demo.in',
    '+91 96666 33445',
    '1996-11-25',
    'Male',
    'CMH Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["Kannada", "English", "Telugu"]',
    '["Indiranagar", "Domlur", "HAL"]',
    'Full-time',
    'Bachelor of Commerce',
    4,
    1,
    '["Team Leadership", "QC Auditing", "Merchant Onboarding"]',
    'Team Leader',
    'Active',
    'Approved',
    '2026-09-28 09:15:00',
    'Team Leader',
    91.00,
    4.9,
    45,
    540.00,
    0.00,
    'ICICI Bank - •••• 7721'
),
(
    904,
    'DEMO-MGR-01',
    'Sanjay Verma [DEMO Manager]',
    'sanjay.manager@weonboard-demo.in',
    '+91 95555 44556',
    '1992-06-14',
    'Male',
    'Indiranagar Defence Colony',
    'Bengaluru',
    'Karnataka',
    '560038',
    1,
    1,
    '["English", "Hindi", "Kannada"]',
    '["Bengaluru East", "Bengaluru South"]',
    'Full-time',
    'Master of Business Administration',
    8,
    1,
    '["Regional Operations", "Corridor Dispatch", "QC Governance", "Escalation Management"]',
    'Project Manager',
    'Active',
    'Approved',
    '2026-09-15 08:30:00',
    'Manager',
    94.50,
    5.0,
    120,
    270.00,
    0.00,
    'Axis Bank - •••• 1109'
)
ON DUPLICATE KEY UPDATE
full_name = VALUES(full_name),
status = VALUES(status),
onboarding_status = VALUES(onboarding_status),
current_rank = VALUES(current_rank),
quality_score = VALUES(quality_score);

-- -------------------------------------------------------------------------
-- 4. DEMO TEAMS & HIERARCHY
-- -------------------------------------------------------------------------
INSERT INTO teams (
    id, team_code, name, leader_id, manager_id, city, operating_area, status, created_at
) VALUES
(
    901,
    'TEAM-DEMO-01',
    'Team Alpha (Koramangala & Indiranagar Corridor)',
    903,
    904,
    'Bengaluru',
    'Bengaluru Central-East Corridors (Indiranagar, Koramangala, Domlur)',
    'Active',
    '2026-10-01 10:00:00'
)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
leader_id = VALUES(leader_id),
manager_id = VALUES(manager_id),
status = VALUES(status);

INSERT INTO team_members (
    id, team_id, freelancer_id, role_in_team, joined_at, is_active
) VALUES
(901, 901, 901, 'Associate', '2026-10-02 10:30:00', 1),
(902, 901, 902, 'Associate', '2026-10-04 12:00:00', 1)
ON DUPLICATE KEY UPDATE
role_in_team = VALUES(role_in_team),
is_active = VALUES(is_active);

-- -------------------------------------------------------------------------
-- 5. DEMO TASKS (Across Projects 1, 2, 3 with different workflow states)
-- -------------------------------------------------------------------------
INSERT INTO tasks (
    id, task_ref, project_id, title, description, instructions,
    city, target_area, deadline, payout_amount, status,
    assigned_freelancer_id, accepted_at, submitted_at,
    reviewed_by_name, reviewed_at, rework_count, review_comment, created_at
) VALUES
-- Project 1 Tasks (Retail Merchant Onboarding)
(
    901,
    'DEMO-TSK-101',
    901,
    '[DEMO] Onboard Sri Balaji Provisions — 100ft Road Indiranagar',
    '[DEMO] Visit Sri Balaji Provisions, collect owner KYC, snap storefront signboard photo, and activate digital merchant catalog.',
    'Confirm owner Aadhaar, photo of front signboard with GPS stamp, QR code standee setup.',
    'Bengaluru',
    'Indiranagar',
    '2026-10-25',
    1200.00,
    'Approved',
    901,
    '2026-10-18 10:15:00',
    '2026-10-18 13:45:00',
    'Muhammad Ali Shoaib (QC Head)',
    '2026-10-18 14:30:00',
    0,
    '[DEMO] Approved by QC. Clean signage and verified coordinates.',
    '2026-10-15 09:00:00'
),
(
    902,
    'DEMO-TSK-102',
    901,
    '[DEMO] Onboard New Krishna Supermarket — Koramangala 4th Block',
    '[DEMO] Verify proprietor documents, take storefront banner photograph, and verify digital payment terminal setup.',
    'Full shop frontage photo, owner signature on digital form, test order execution.',
    'Bengaluru',
    'Koramangala',
    '2026-10-26',
    1200.00,
    'Submitted',
    901,
    '2026-10-19 11:00:00',
    '2026-10-19 15:30:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 09:00:00'
),
(
    903,
    'DEMO-TSK-103',
    901,
    '[DEMO] Onboard Royal Mart — Domlur Layout',
    '[DEMO] Execute merchant registration, app installation and QR code standee handover.',
    'Hand over merchant onboarding kit and record confirmation OTP.',
    'Bengaluru',
    'Domlur',
    '2026-10-28',
    1200.00,
    'Accepted',
    901,
    '2026-10-20 09:30:00',
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 10:00:00'
),
(
    904,
    'DEMO-TSK-104',
    901,
    '[DEMO] Onboard Annapurna General Store — Indiranagar 12th Main',
    '[DEMO] Eligible for certified associates. Claim task to execute on-ground merchant onboarding.',
    'Open to qualified corridor associates with active KYC.',
    'Bengaluru',
    'Indiranagar',
    '2026-10-30',
    1200.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 10:00:00'
),
-- Project 2 Tasks (Restaurant & MSME Audit)
(
    905,
    'DEMO-TSK-201',
    902,
    '[DEMO] Hygiene Audit — Spice Garden Biryani, HSR Sector 2',
    '[DEMO] Verify kitchen hygiene standards, food refrigeration logs, and active FSSAI registration certificate.',
    '10-point checklist: refrigeration gauge photo, storage cleanliness, FSSAI certificate.',
    'Bengaluru',
    'HSR Layout',
    '2026-10-24',
    1500.00,
    'Rework Required',
    902,
    '2026-10-19 12:00:00',
    '2026-10-19 16:00:00',
    'Gousiya Fathima (QC Operations)',
    '2026-10-19 16:45:00',
    1,
    '[DEMO] Rework Required: The refrigeration thermometer photo is blurry and illegible. Please revisit the site and upload a crisp, high-resolution photo of the temperature display gauge.',
    '2026-10-16 11:00:00'
),
(
    906,
    'DEMO-TSK-202',
    902,
    '[DEMO] FSSAI License Check — Cafe Aroma, BTM 2nd Stage',
    '[DEMO] Verify visible display of FSSAI 14-digit license number and inspect pantry hygiene checklist.',
    'Clear photo of FSSAI framed license and pantry storage.',
    'Bengaluru',
    'BTM Layout',
    '2026-10-27',
    1500.00,
    'Submitted',
    901,
    '2026-10-20 10:00:00',
    '2026-10-20 13:15:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-16 11:00:00'
),
(
    907,
    'DEMO-TSK-203',
    902,
    '[DEMO] Kitchen Cleanliness Audit — Udupi Upahar, HSR Sector 1',
    '[DEMO] Verify vegetarian kitchen sanitation and food storage standards.',
    'Check deep freezer temperature, dishwashing area, and pest traps.',
    'Bengaluru',
    'HSR Layout',
    '2026-10-22',
    1500.00,
    'Approved',
    902,
    '2026-10-17 09:00:00',
    '2026-10-17 11:00:00',
    'Muhammad Ali Shoaib (QC Head)',
    '2026-10-17 11:20:00',
    0,
    '[DEMO] Approved by QC. Clean kitchen and verified FSSAI documentation.',
    '2026-10-16 11:00:00'
),
(
    908,
    'DEMO-TSK-204',
    902,
    '[DEMO] Storage & Pest Control Audit — Bakers Delight, Jayanagar',
    '[DEMO] Physical audit of bakery dry storage and pest management certificate.',
    'Inspect flour storage bins, pest inspection certificate, and staff aprons.',
    'Bengaluru',
    'Jayanagar',
    '2026-10-29',
    1500.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-17 10:00:00'
),
-- Project 3 Tasks (Market Survey & Mystery Shopping)
(
    909,
    'DEMO-TSK-301',
    903,
    '[DEMO] Mystery Shopping — Phoenix Marketcity Apparel',
    '[DEMO] Act as shopper, evaluate staff response time, fitting room cleanliness, and checkout speed.',
    'Record entry time, staff greeting duration, buy low-value accessory, upload receipt.',
    'Bengaluru',
    'Whitefield',
    '2026-10-23',
    800.00,
    'Approved',
    901,
    '2026-10-16 14:00:00',
    '2026-10-16 16:30:00',
    'Sanjay Verma [DEMO Manager]',
    '2026-10-16 17:00:00',
    0,
    '[DEMO] Approved. Questionnaire answers match receipt timing proof.',
    '2026-10-14 14:00:00'
),
(
    910,
    'DEMO-TSK-302',
    903,
    '[DEMO] Checkout Speed Survey — Nexus Shantiniketan Electronics',
    '[DEMO] Monitor electronic billing counter queues and measure billing time across 5 customers.',
    'Measure wait time and items scanned per customer across 5 billing transactions.',
    'Bengaluru',
    'Whitefield',
    '2026-10-26',
    800.00,
    'In Progress',
    902,
    '2026-10-20 14:00:00',
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
),
(
    911,
    'DEMO-TSK-303',
    903,
    '[DEMO] Customer Greeting Audit — Forum Value Mall Whitefield',
    '[DEMO] Mystery audit of customer greeting and product assistance in cosmetics department.',
    'Observe customer engagement protocol upon entrance.',
    'Bengaluru',
    'Whitefield',
    '2026-10-25',
    800.00,
    'Submitted',
    902,
    '2026-10-20 11:30:00',
    '2026-10-20 14:45:00',
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
),
(
    912,
    'DEMO-TSK-304',
    903,
    '[DEMO] Pricing Accuracy Check — Brigade Road Retailer',
    '[DEMO] Verify shelf display price against POS billing scan for 10 consumer items.',
    'Compare shelf tag pricing with scanned register prices for discrepancies.',
    'Bengaluru',
    'Whitefield',
    '2026-10-31',
    800.00,
    'Available',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    '2026-10-15 12:00:00'
)
ON DUPLICATE KEY UPDATE
title = VALUES(title),
description = VALUES(description),
status = VALUES(status),
assigned_freelancer_id = VALUES(assigned_freelancer_id),
payout_amount = VALUES(payout_amount),
review_comment = VALUES(review_comment);

-- -------------------------------------------------------------------------
-- 6. DEMO DOUBLE-ENTRY LEDGER JOURNALS (100% Balanced Debits == Credits)
-- -------------------------------------------------------------------------
-- JRN-DEMO-20261018-01: DEMO-TSK-101 approved (Gross ₹1,200)
-- JRN-DEMO-20261016-02: DEMO-TSK-301 approved (Gross ₹800, TL share to Growth Pool)
-- JRN-DEMO-20261017-03: DEMO-TSK-203 approved (Gross ₹1,500)
-- -------------------------------------------------------------------------
INSERT INTO ledger_journals (
    id, journal_ref, reference_id, transaction_type,
    total_debit, total_credit, posted_by, is_reversed, posted_at
) VALUES
(
    9101,
    'JRN-DEMO-20261018-01',
    'DEMO-TSK-101',
    'EARNING_RECOGNITION',
    1200.00,
    1200.00,
    'Muhammad Ali Shoaib (QC Head)',
    0,
    '2026-10-18 14:30:00'
),
(
    9102,
    'JRN-DEMO-20261016-02',
    'DEMO-TSK-301',
    'EARNING_RECOGNITION',
    800.00,
    800.00,
    'Sanjay Verma [DEMO Manager]',
    0,
    '2026-10-16 17:00:00'
),
(
    9103,
    'JRN-DEMO-20261017-03',
    'DEMO-TSK-203',
    'EARNING_RECOGNITION',
    1500.00,
    1500.00,
    'Muhammad Ali Shoaib (QC Head)',
    0,
    '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
total_debit = VALUES(total_debit),
total_credit = VALUES(total_credit),
posted_by = VALUES(posted_by);

-- -------------------------------------------------------------------------
-- 7. DOUBLE-ENTRY LEDGER LINES (Double-Entry Chart of Accounts)
-- Account 5001 = Field Project Task Execution Cost (Expense - DEBIT)
-- Account 2001 = Freelancer Payable (Liability - CREDIT 63%)
-- Account 2004 = Reserve Liability 15-day Hold (Liability - CREDIT 7%)
-- Account 2002 = Team Leader Payable (Liability - CREDIT 20%)
-- Account 2003 = Manager Payable (Liability - CREDIT 10%)
-- Account 3001 = Growth Pool Platform Retained (Equity - CREDIT)
-- -------------------------------------------------------------------------
INSERT INTO ledger_entries (
    id, journal_id, account_code, entry_type, amount, entity_type, entity_id, line_narration, created_at
) VALUES
-- Journal 9101 lines (₹1,200)
(910101, 9101, '5001', 'DEBIT',  1200.00, 'Platform',   'PROJECT_DEMO-PRJ-01', 'Direct project execution cost for DEMO-TSK-101', '2026-10-18 14:30:00'),
(910102, 9101, '2001', 'CREDIT',  756.00, 'Freelancer', 'DEMO-TM-01',          'Net available earnings (63% share) for Pooja Hegde', '2026-10-18 14:30:00'),
(910103, 9101, '2004', 'CREDIT',   84.00, 'Freelancer', 'DEMO-TM-01',          '10% quality assurance reserve held for 15 days', '2026-10-18 14:30:00'),
(910104, 9101, '2002', 'CREDIT',  240.00, 'TeamLeader', 'DEMO-TL-01',          '20% Team Leader override for Rajesh Gowda', '2026-10-18 14:30:00'),
(910105, 9101, '2003', 'CREDIT',  120.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-18 14:30:00'),

-- Journal 9102 lines (₹800 - Team Leader unassigned -> Growth Pool)
(910201, 9102, '5001', 'DEBIT',   800.00, 'Platform',   'PROJECT_DEMO-PRJ-03', 'Direct project execution cost for DEMO-TSK-301', '2026-10-16 17:00:00'),
(910202, 9102, '2001', 'CREDIT',  504.00, 'Freelancer', 'DEMO-TM-01',          'Net available earnings (63% share) for Pooja Hegde', '2026-10-16 17:00:00'),
(910203, 9102, '2004', 'CREDIT',   56.00, 'Freelancer', 'DEMO-TM-01',          '10% quality assurance reserve held for 15 days', '2026-10-16 17:00:00'),
(910204, 9102, '3001', 'CREDIT',  160.00, 'Platform',   'PLATFORM_GROWTH_POOL','Unassigned Team Leader 20% routed to Growth Pool', '2026-10-16 17:00:00'),
(910205, 9102, '2003', 'CREDIT',   80.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-16 17:00:00'),

-- Journal 9103 lines (₹1,500)
(910301, 9103, '5001', 'DEBIT',  1500.00, 'Platform',   'PROJECT_DEMO-PRJ-02', 'Direct project execution cost for DEMO-TSK-203', '2026-10-17 11:20:00'),
(910302, 9103, '2001', 'CREDIT',  945.00, 'Freelancer', 'DEMO-TM-02',          'Net available earnings (63% share) for Imran Khan', '2026-10-17 11:20:00'),
(910303, 9103, '2004', 'CREDIT',  105.00, 'Freelancer', 'DEMO-TM-02',          '10% quality assurance reserve held for 15 days', '2026-10-17 11:20:00'),
(910304, 9103, '2002', 'CREDIT',  300.00, 'TeamLeader', 'DEMO-TL-01',          '20% Team Leader override for Rajesh Gowda', '2026-10-17 11:20:00'),
(910305, 9103, '2003', 'CREDIT',  150.00, 'Manager',    'DEMO-MGR-01',         '10% Area Manager oversight for Sanjay Verma', '2026-10-17 11:20:00')
ON DUPLICATE KEY UPDATE
amount = VALUES(amount),
entry_type = VALUES(entry_type);

-- -------------------------------------------------------------------------
-- 8. DEMO EARNING ENTITLEMENTS
-- -------------------------------------------------------------------------
INSERT INTO earning_entitlements (
    id, entitlement_ref, task_id, project_id, freelancer_id,
    gross_rate, freelancer_share_gross, freelancer_reserve_amount, freelancer_share_net,
    team_leader_id, team_leader_share, team_leader_routed_to_growth,
    manager_id, manager_share, manager_routed_to_growth,
    growth_pool_share, journal_id, status, created_at
) VALUES
(
    901, 'ENT-DEMO-101', 901, 901, 901,
    1200.00, 840.00, 84.00, 756.00,
    903, 240.00, 0,
    904, 120.00, 0,
    0.00, 9101, 'Recognized', '2026-10-18 14:30:00'
),
(
    902, 'ENT-DEMO-301', 909, 903, 901,
    800.00, 560.00, 56.00, 504.00,
    NULL, 0.00, 1,
    904, 80.00, 0,
    160.00, 9102, 'Recognized', '2026-10-16 17:00:00'
),
(
    903, 'ENT-DEMO-203', 907, 902, 902,
    1500.00, 1050.00, 105.00, 945.00,
    903, 300.00, 0,
    904, 150.00, 0,
    0.00, 9103, 'Recognized', '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
freelancer_share_net = VALUES(freelancer_share_net),
freelancer_reserve_amount = VALUES(freelancer_reserve_amount),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 9. DEMO 15-DAY QUALITY ASSURANCE RESERVES
-- -------------------------------------------------------------------------
INSERT INTO reserve_records (
    id, reserve_ref, freelancer_id, task_id, earning_entitlement_id,
    amount, reserve_pct, hold_days, release_due_at, status, notes, created_at
) VALUES
(
    901, 'RES-DEMO-101', 901, 901, 901,
    84.00, 10.00, 15, '2026-11-02 14:30:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-101', '2026-10-18 14:30:00'
),
(
    902, 'RES-DEMO-301', 901, 909, 902,
    56.00, 10.00, 15, '2026-10-31 17:00:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-301', '2026-10-16 17:00:00'
),
(
    903, 'RES-DEMO-203', 902, 907, 903,
    105.00, 10.00, 15, '2026-11-01 11:20:00', 'Held',
    '[DEMO] 10% quality assurance reserve for DEMO-TSK-203', '2026-10-17 11:20:00'
)
ON DUPLICATE KEY UPDATE
amount = VALUES(amount),
status = VALUES(status);

-- -------------------------------------------------------------------------
-- 10. DEMO FREELANCER WALLETS (Reconciled Exactly to Ledger Entries)
-- Pooja Hegde (901): Available ₹1,260.00 (₹756 + ₹504), Reserve ₹140.00 (₹84 + ₹56)
-- Imran Khan (902): Available ₹945.00, Reserve ₹105.00
-- Rajesh Gowda (903): Available ₹540.00 (₹240 + ₹300 overrides), Reserve ₹0.00
-- Sanjay Verma (904): Available ₹270.00 (₹120 + ₹150 overrides), Reserve ₹0.00
-- -------------------------------------------------------------------------
INSERT INTO wallets (
    id, freelancer_id, available_balance, reserved_balance, pending_earnings,
    total_earned, payouts_in_progress, paid_payouts, currency, is_kyc_approved
) VALUES
(901, 901, 1260.00, 140.00, 840.00, 1400.00, 0.00, 0.00, 'INR', 1),
(902, 902,  945.00, 105.00, 560.00, 1050.00, 0.00, 0.00, 'INR', 1),
(903, 903,  540.00,   0.00, 240.00,  540.00, 0.00, 0.00, 'INR', 1),
(904, 904,  270.00,   0.00, 120.00,  270.00, 0.00, 0.00, 'INR', 1)
ON DUPLICATE KEY UPDATE
available_balance = VALUES(available_balance),
reserved_balance = VALUES(reserved_balance),
pending_earnings = VALUES(pending_earnings),
total_earned = VALUES(total_earned);

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- END OF SAFE DEMONSTRATION DATASET
-- =========================================================================
