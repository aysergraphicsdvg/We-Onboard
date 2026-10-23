import os
import re

with open('src/services/hostingerPackage.ts', 'r') as f:
    hp = f.read()

def escape_template(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# Update any file in hostingerPackage if it exists on disk
pattern = re.compile(r"\{\s*path:\s*'([^']+)',\s*description:\s*'([^']*)',\s*content:\s*`([\s\S]*?)`\s*\},")

files_updated = 0

def replacer(match):
    global files_updated
    rel_path = match.group(1)
    desc = match.group(2)
    if os.path.exists(rel_path):
        with open(rel_path, 'r') as f:
            disk_content = f.read()
        files_updated += 1
        return "{\n      path: '" + rel_path + "',\n      description: '" + desc + "',\n      content: `" + escape_template(disk_content) + "`\n    },"
    return match.group(0)

new_hp = pattern.sub(replacer, hp)

with open('src/services/hostingerPackage.ts', 'w') as f:
    f.write(new_hp)

print(f"Successfully refreshed {files_updated} package files in hostingerPackage.ts. Size: {len(new_hp)} bytes.")
