import os

files = [
    (r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\people\PeopleClient.tsx', 'setCreateModalOpen(false);', 'setCreateModalOpen(false);\n      window.location.reload();'),
    (r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\people\PeopleClient.tsx', 'setUpdateModalOpen(false);', 'setUpdateModalOpen(false);\n      window.location.reload();'),
    (r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\profile\ProfileClient.tsx', 'setToast("Profile updated successfully");', 'setToast("Profile updated successfully");\n      setTimeout(() => window.location.reload(), 1500);'),
    (r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\settings\SettingsClient.tsx', 'setToast("Settings saved successfully");', 'setToast("Settings saved successfully");\n      setTimeout(() => window.location.reload(), 1500);'),
    (r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\suppliers\page.tsx', 'setCreateModalOpen(false);', 'setCreateModalOpen(false);\n      window.location.reload();')
]

for file_path, target, replacement in files:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace(target, replacement)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
