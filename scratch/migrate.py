import os, glob, re

app_dir = r'frontend/src/app'
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f == 'page.tsx':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Remove <AppShell ...> and </AppShell>
            content = re.sub(r'<AppShell[^>]*>', '<>', content)
            content = re.sub(r'</AppShell>', '</>', content)
            
            # Remove import AppShell
            content = re.sub(r'import\s+AppShell\s+from\s+[\'\"].*?AppShell[\'\"];?\n?', '', content)
            
            with open(path, 'w', encoding='utf-8') as file:
                file.write(content)
print('Done modifying pages')
