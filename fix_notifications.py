import os
import re

files_to_fix = [
    'frontend/src/app/yarn/page.tsx',
    'frontend/src/app/yarn/[id]/page.tsx',
    'frontend/src/app/suppliers/page.tsx',
    'frontend/src/app/rolls/[id]/page.tsx',
    'frontend/src/app/people/page.tsx',
    'frontend/src/app/orders/page.tsx',
    'frontend/src/app/orders/[id]/page.tsx',
    'frontend/src/app/finance/page.tsx',
    'frontend/src/app/buyers/page.tsx'
]

for file_path in files_to_fix:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove apiClient.get('/notifications')
        content = re.sub(r',\s*apiClient\.get<[^>]+>\("/notifications"\)', '', content)
        
        # We need to remove the middle or last notifRes in the array destructuring
        content = re.sub(r'const\s*\[([^,]+),\s*notifRes\]', r'const [\1]', content)
        content = re.sub(r'const\s*\[([^,]+),\s*notifRes,\s*([^\]]+)\]', r'const [\1, \2]', content)
        content = re.sub(r'if\s*\(notifRes\)\s*notifications\s*=\s*notifRes;\s*\n', '', content)
        content = re.sub(r'let\s*notifications:\s*any\[\]\s*=\s*\[\];\s*\n', '', content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {file_path}')
    except Exception as e:
        print(f'Error processing {file_path}: {e}')
