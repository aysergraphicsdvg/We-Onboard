import os

with open('src/services/hostingerPackage.ts', 'r') as f:
    hp = f.read()

# Make backup
with open('src/services/hostingerPackage.ts.bak', 'w') as f:
    f.write(hp)

def escape_template(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# 1. Update schema.sql
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

# 2. Add migration 005 after migration 004
with open('database/migrations/005_phase5_projects_tasks_evidence_qc.sql', 'r') as f:
    mig005_sql = f.read()

mig004_marker = "path: 'database/migrations/004_phase4_academy_and_certification.sql',"
mig004_pos = hp.find(mig004_marker)
mig004_end = hp.find('`\n    },', mig004_pos) + len('`\n    },')

mig005_entry = """
    {
      path: 'database/migrations/005_phase5_projects_tasks_evidence_qc.sql',
      description: 'Phase 5 non-destructive migration for projects, tasks, evidence submissions, and QC',
      content: `""" + escape_template(mig005_sql) + """`
    },"""

hp = hp[:mig004_end] + mig005_entry + hp[mig004_end:]

# 3. Add Phase 5 PHP endpoints after admin/academy/enrollments.php
phase5_files = [
    ('api/v1/admin/projects/list.php', 'Admin Projects listing API with search, filters, and capacity stats'),
    ('api/v1/admin/projects/manage.php', 'Admin Projects management API (create, edit, publish, pause, close)'),
    ('api/v1/admin/tasks/list.php', 'Admin Tasks listing API with project, freelancer, and status filters'),
    ('api/v1/admin/tasks/manage.php', 'Admin Tasks dispatch and management API (create, assign, cancel)'),
    ('api/v1/admin/qc/queue.php', 'Admin Quality Control review queue API with evidence attachments'),
    ('api/v1/admin/qc/review.php', 'Admin Quality Control review decision API (Approve, Rework Required, Reject)'),
    ('api/v1/tasks/hub.php', 'Freelancer Task Hub API with assigned, submitted, completed, and available pools'),
    ('api/v1/tasks/detail.php', 'Freelancer Task Detail API with instructions, requirements, and submissions'),
    ('api/v1/tasks/accept.php', 'Freelancer Task Acceptance API with KYC, certification, and capacity enforcement'),
    ('api/v1/tasks/decline.php', 'Freelancer Task Decline API with reason and pool release'),
    ('api/v1/tasks/submit.php', 'Freelancer Field Evidence Submission API with structured data, photos, and GPS validation'),
    ('api/v1/tasks/evidence_file.php', 'Private Task Evidence Streamer with authorized session access control'),
    ('storage/evidence/.htaccess', 'Private storage Apache protection blocking direct HTTP web access'),
    ('storage/evidence/index.html', 'Directory browsing prevention placeholder')
]

enroll_marker = "path: 'api/v1/admin/academy/enrollments.php',"
enroll_pos = hp.find(enroll_marker)
enroll_end = hp.find('`\n    },', enroll_pos) + len('`\n    },')

p5_entries = ''
for path, desc in phase5_files:
    with open(path, 'r') as pf:
        cnt = pf.read()
    p5_entries += """
    {
      path: """ + repr(path) + """,
      description: """ + repr(desc) + """,
      content: `""" + escape_template(cnt) + """`
    },"""

hp = hp[:enroll_end] + p5_entries + hp[enroll_end:]

with open('src/services/hostingerPackage.ts', 'w') as f:
    f.write(hp)

print('Updated hostingerPackage.ts successfully. New size:', len(hp))
