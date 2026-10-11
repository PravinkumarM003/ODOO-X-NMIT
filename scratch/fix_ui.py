import os
import re

FRONTEND_DIR = r"c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src"

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # 1. Fix the messy appended strings from the previous script
    # Previously it was: content.replace("border border-[var(--border)] rounded-lg", "border border-[var(--border)] rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md")
    
    # We will replace that whole blob with a clean "premium-card" class
    messy_blob_1 = "border border-[var(--border)] rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
    content = content.replace(messy_blob_1, "premium-card")

    # Sometimes it might have been inserted into things that already had bg-[var(--surface)]
    # e.g., bg-[var(--surface)] premium-card
    content = content.replace("bg-[var(--surface)] premium-card", "premium-card")

    # 2. Fix the "View Detail ->" button wrapping
    content = content.replace(
        'className="px-2.5 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded transition-colors"',
        'className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 whitespace-nowrap inline-flex items-center gap-1.5"'
    )

    # 3. Fix other generic interactive buttons (mostly button and Link tags with bg-[var(--primary)])
    # We can't regex all of them perfectly but we can add interactive animations to primary buttons.
    # We will use CSS to do this instead of regex, it's safer.
    
    if content != original_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk(FRONTEND_DIR):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            fix_file(os.path.join(root, file))
