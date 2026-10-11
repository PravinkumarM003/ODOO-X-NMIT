import os
import glob

routes_dir = r'c:\Users\pravi\Videos\Desktop\ODOO X\backend\app\api\routes'
for filepath in glob.glob(os.path.join(routes_dir, '*.py')):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('"FLOOR"', '"PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"')
    
    if os.path.basename(filepath) != 'auth.py':
        if content != new_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated {filepath}')
