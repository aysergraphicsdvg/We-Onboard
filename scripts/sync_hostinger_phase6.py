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

# 2. Add migration 006 after migration 005
with open('database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql', 'r') as f:
    mig006_sql = f.read()

mig005_marker = "path: 'database/migrations/005_phase5_projects_tasks_evidence_qc.sql',"
mig005_pos = hp.find(mig005_marker)
mig005_end = hp.find('`\n    },', mig005_pos) + len('`\n    },')

mig006_entry = """
    {
      path: 'database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql',
      description: 'Phase 6 non-destructive migration for QC hardening, freelancer performance, team hierarchy, and rank engine',
      content: `""" + escape_template(mig006_sql) + """`
    },"""

if "path: 'database/migrations/006_phase6_qc_performance_hierarchy_ranks.sql'" not in hp:
    hp = hp[:mig005_end] + mig006_entry + hp[mig005_end:]
    print("Added migration 006")
else:
    print("Migration 006 already present")

# 3. Add config/quality_score.php after config/cors.php if not present
if "path: 'config/quality_score.php'" not in hp:
    with open('config/quality_score.php', 'r') as f:
        qs_cfg = f.read()
    cors_marker = "path: 'config/cors.php',"
    cors_pos = hp.find(cors_marker)
    cors_end = hp.find('`\n    },', cors_pos) + len('`\n    },')
    qs_entry = """
    {
      path: 'config/quality_score.php',
      description: 'Configurable Quality Score calculation engine, sample size rules, and rank promotion threshold validator',
      content: `""" + escape_template(qs_cfg) + """`
    },"""
    hp = hp[:cors_end] + qs_entry + hp[cors_end:]
    print("Added config/quality_score.php")

# 4. Update api/v1/admin/qc/review.php with the Phase 6 hardened version
with open('api/v1/admin/qc/review.php', 'r') as f:
    qc_rev = f.read()

rev_marker = "path: 'api/v1/admin/qc/review.php',"
rev_pos = hp.find(rev_marker)
if rev_pos != -1:
    c_pos = hp.find('content: `', rev_pos)
    e_pos = hp.find('`\n    },', c_pos)
    hp = hp[:c_pos + len('content: `')] + escape_template(qc_rev) + hp[e_pos:]
    print("Updated api/v1/admin/qc/review.php")

# 5. Add Phase 6 PHP endpoints
phase6_files = [
    ('api/v1/admin/performance/scores.php', 'Admin Quality Score directory with component breakdowns, sample size status, and fraud flag management'),
    ('api/v1/admin/performance/recalculate.php', 'Admin Quality Score recalculator API (single freelancer or system-wide bulk calculation)'),
    ('api/v1/admin/ranks/eligibility.php', 'Admin Rank Promotion eligibility board evaluating active members, qualifying teams, and verified Quality Scores'),
    ('api/v1/admin/ranks/promote.php', 'Admin Rank Promotion decision API (Nominate, Approve, Reject with audit justifications)'),
    ('api/v1/admin/teams/list.php', 'Admin Teams directory API with leader, manager, total count, and 4-rule active member metrics'),
    ('api/v1/admin/teams/manage.php', 'Admin Teams management API with duplicate membership prevention and circular reporting checks'),
    ('api/v1/freelancers/performance.php', 'Freelancer Personal Performance API returning verified Quality Score, rank progress checklist, and reviewer history')
]

# Find marker to insert after api/v1/admin/qc/review.php
qc_rev_pos = hp.find(rev_marker)
qc_rev_end = hp.find('`\n    },', qc_rev_pos) + len('`\n    },')

p6_entries = ''
for path, desc in phase6_files:
    if f"path: '{path}'" not in hp:
        with open(path, 'r') as pf:
            cnt = pf.read()
        p6_entries += """
    {
      path: """ + repr(path) + """,
      description: """ + repr(desc) + """,
      content: `""" + escape_template(cnt) + """`
    },"""
        print(f"Adding {path}")

if p6_entries:
    hp = hp[:qc_rev_end] + p6_entries + hp[qc_rev_end:]

with open('src/services/hostingerPackage.ts', 'w') as f:
    f.write(hp)

print("Finished syncing hostingerPackage.ts. Size:", len(hp))
