import os

with open('src/services/hostingerPackage.ts', 'r') as f:
    hp = f.read()

def escape_template(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# 1. Update database/schema.sql in hostingerPackage.ts
with open('database/schema.sql', 'r') as f:
    schema_sql = f.read()

schema_marker = "path: 'database/schema.sql',"
schema_pos = hp.find(schema_marker)
if schema_pos == -1:
    print('Error: schema_marker not found')
    exit(1)

content_pos = hp.find('content: `', schema_pos)
end_content_pos = hp.find('`\n    },', content_pos)

new_schema_content = escape_template(schema_sql)
hp = hp[:content_pos + len('content: `')] + new_schema_content + hp[end_content_pos:]
print("Updated database/schema.sql in hostingerPackage")

# 2. Add migration 007 after migration 006
with open('database/migrations/007_phase7_wallet_ledger_earnings_payouts.sql', 'r') as f:
    mig007_sql = f.read()

mig006_marker = "path: 'database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql',"
mig006_pos = hp.find(mig006_marker)
mig006_end = hp.find('`\n    },', mig006_pos) + len('`\n    },')

mig007_entry = """
    {
      path: 'database/migrations/007_phase7_wallet_ledger_earnings_payouts.sql',
      description: 'Phase 7 non-destructive migration for double-entry ledger, earning entitlements, reserves, wallets, and payouts',
      content: `""" + escape_template(mig007_sql) + """`
    },"""

if "path: 'database/migrations/007_phase7_wallet_ledger_earnings_payouts.sql'" not in hp:
    hp = hp[:mig006_end] + mig007_entry + hp[mig006_end:]
    print("Added migration 007")
else:
    print("Migration 007 already present")

# 3. Add config/financial.php after config/quality_score.php
if "path: 'config/financial.php'" not in hp:
    with open('config/financial.php', 'r') as f:
        fin_cfg = f.read()
    qs_marker = "path: 'config/quality_score.php',"
    qs_pos = hp.find(qs_marker)
    qs_end = hp.find('`\n    },', qs_pos) + len('`\n    },')
    fin_entry = """
    {
      path: 'config/financial.php',
      description: 'Double-entry ledger engine, 70/20/10 split allocator, 10% reserve manager, and atomic payout controller',
      content: `""" + escape_template(fin_cfg) + """`
    },"""
    hp = hp[:qs_end] + fin_entry + hp[qs_end:]
    print("Added config/financial.php")

# 4. Update api/v1/admin/qc/review.php with the Phase 7 financial recognition version
with open('api/v1/admin/qc/review.php', 'r') as f:
    qc_rev = f.read()

rev_marker = "path: 'api/v1/admin/qc/review.php',"
rev_pos = hp.find(rev_marker)
if rev_pos != -1:
    c_pos = hp.find('content: `', rev_pos)
    e_pos = hp.find('`\n    },', c_pos)
    hp = hp[:c_pos + len('content: `')] + escape_template(qc_rev) + hp[e_pos:]
    print("Updated api/v1/admin/qc/review.php with Phase 7 financial integration")

# 5. Add Phase 7 PHP endpoints and Cron worker
phase7_files = [
    ('cron/release_reserves.php', 'Scheduled CLI or cron worker for automatic release of 15-day matured quality reserves'),
    ('api/v1/wallet/index.php', 'Freelancer wallet balances, 15-day reserves, recent ledger activity and payout history'),
    ('api/v1/wallet/statement.php', 'Freelancer periodic financial statement generator with date filters and downloadable CSV export'),
    ('api/v1/payouts/request.php', 'Freelancer withdrawal request endpoint with atomic available balance earmarking'),
    ('api/v1/payouts/list.php', 'Freelancer withdrawal requests history and settlement tracking'),
    ('api/v1/payouts/webhook.php', 'Payment provider webhook callback handler with server-side HMAC-SHA256 signature verification'),
    ('api/v1/admin/financial/overview.php', 'Admin financial overview, trial balance, KPI metrics, and Growth Pool accumulation'),
    ('api/v1/admin/financial/journals.php', 'Admin double-entry journal inspector with debits/credits line expansion and balance checks'),
    ('api/v1/admin/financial/earnings.php', 'Admin earning entitlements inspector with 70/20/10 split details and Growth Pool allocations'),
    ('api/v1/admin/financial/reserves.php', 'Admin quality reserves directory and batch release execution API'),
    ('api/v1/admin/financial/payouts.php', 'Admin payout request management with settlement and rejection/refund workflows'),
    ('api/v1/admin/financial/reconcile.php', 'Admin financial reconciliation and audit checking wallet projections against ledger accounts'),
    ('api/v1/admin/financial/adjust.php', 'Admin manual adjustment and linked journal reversal endpoint with segregation of duties checks')
]

# Find marker to insert after api/v1/admin/qc/review.php or existing phase 6 endpoints
insert_marker = "path: 'api/v1/freelancers/performance.php',"
ins_pos = hp.find(insert_marker)
if ins_pos != -1:
    ins_end = hp.find('`\n    },', ins_pos) + len('`\n    },')
else:
    ins_pos = hp.find(rev_marker)
    ins_end = hp.find('`\n    },', ins_pos) + len('`\n    },')

p7_entries = ''
for path, desc in phase7_files:
    if f"path: '{path}'" not in hp:
        if os.path.exists(path):
            with open(path, 'r') as pf:
                cnt = pf.read()
            p7_entries += """
    {
      path: """ + repr(path) + """,
      description: """ + repr(desc) + """,
      content: `""" + escape_template(cnt) + """`
    },"""
            print(f"Adding {path}")
        else:
            print(f"Warning: {path} not found")

if p7_entries:
    hp = hp[:ins_end] + p7_entries + hp[ins_end:]

with open('src/services/hostingerPackage.ts', 'w') as f:
    f.write(hp)

print("Finished syncing hostingerPackage.ts for Phase 7. New size:", len(hp))
