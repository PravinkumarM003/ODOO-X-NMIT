import os
import re

files_to_update = [
    "README.md",
    "TASKS.md",
    "backend/app/api/routes/auth.py",
    "backend/app/api/routes/buyers_suppliers.py",
    "backend/app/api/routes/dispatch.py",
    "backend/app/api/routes/finance.py",
    "backend/app/api/routes/orders.py",
    "backend/app/api/routes/overview.py",
    "backend/app/api/routes/people.py",
    "backend/app/api/routes/production.py",
    "backend/app/api/routes/rolls.py",
    "backend/app/api/routes/yarn.py",
    "backend/app/models/entities.py",
    "backend/app/services/notification_service.py",
    "backend/app/services/overview_service.py",
    "backend/tests/conftest.py",
    "backend/tests/test_auth.py",
    "backend/tests/test_workflows.py",
    "docs/architecture.md",
    "frontend/src/app/buyers/page.tsx",
    "frontend/src/app/dispatch/DispatchClient.tsx",
    "frontend/src/app/dispatch/page.tsx",
    "frontend/src/app/finance/page.tsx",
    "frontend/src/app/login/page.tsx",
    "frontend/src/app/orders/page.tsx",
    "frontend/src/app/orders/[id]/OrderDetailClient.tsx",
    "frontend/src/app/orders/[id]/page.tsx",
    "frontend/src/app/overview/page.tsx",
    "frontend/src/app/people/page.tsx",
    "frontend/src/app/people/PeopleClient.tsx",
    "frontend/src/app/production/page.tsx",
    "frontend/src/app/production/ProductionBoardClient.tsx",
    "frontend/src/app/profile/page.tsx",
    "frontend/src/app/rolls/page.tsx",
    "frontend/src/app/rolls/[id]/page.tsx",
    "frontend/src/app/settings/page.tsx",
    "frontend/src/app/suppliers/page.tsx",
    "frontend/src/app/yarn/page.tsx",
    "frontend/src/app/yarn/[id]/page.tsx",
    "frontend/src/components/layout/AppShell.tsx",
    "frontend/src/lib/auth.ts",
    "frontend/src/lib/formatters.ts"
]

def update_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Exact word replacements
    content = re.sub(r'\bOWNER\b', 'ADMINISTRATOR', content)
    content = re.sub(r'\bOFFICE\b', 'MANAGER', content)
    
    # Capitalized words
    content = re.sub(r'\bOwner\b', 'Administrator', content)
    content = re.sub(r'\bOffice\b', 'Manager', content)
    
    # Lowercase variables (if standalone)
    content = re.sub(r'\bowner\b', 'administrator', content)
    content = re.sub(r'\boffice\b', 'manager', content)
    
    # CamelCase specific replacements
    content = content.replace('isOwner', 'isAdministrator')
    content = content.replace('isOffice', 'isManager')
    
    # Specific UI Strings
    content = content.replace('Office Entry', 'Manager Entry')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
for f in files_to_update:
    update_file(f)
print("Files updated successfully.")
