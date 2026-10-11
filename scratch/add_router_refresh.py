import os
import re

directory = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app'

files_to_update = [
    r'buyer\orders\BuyerOrdersClient.tsx',
    r'dispatch\DispatchClient.tsx',
    r'finance\FinanceClient.tsx',
    r'orders\OrderListClient.tsx',
    r'orders\[id]\OrderDetailClient.tsx',
    r'people\PeopleClient.tsx',
    r'production\ProductionBoardClient.tsx',
    r'rolls\RollsQCClient.tsx',
    r'yarn\YarnStoreClient.tsx'
]

for rel_path in files_to_update:
    filepath = os.path.join(directory, rel_path)
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
        
    # 1. Import useRouter if not present
    if 'useRouter' not in content:
        content = re.sub(r'(import .* from "next/navigation";?)', r'\1\nimport { useRouter } from "next/navigation";', content)
        if original == content: # if there is no next/navigation import
            content = content.replace('"use client";', '"use client";\n\nimport { useRouter } from "next/navigation";')
    
    # 2. Inject const router = useRouter(); right after the main function starts
    # Find `export default function X(...) {`
    func_pattern = r'(export default function [A-Za-z0-9_]+\s*\([^)]*\)\s*\{)'
    if 'const router = useRouter()' not in content:
        content = re.sub(func_pattern, r'\1\n  const router = useRouter();', content)
        
    # 3. Add router.refresh() inside the else block of res.error
    # This regex looks for "} else {" followed by something that includes a setState for modal
    # We will just replace all instances of "if (res.error) {" block's "else {"
    
    # A safer way is to find "const res = await " and then find the subsequent "else {"
    
    # Let's just find "    } else {\n" and replace with "    } else {\n      router.refresh();\n"
    # ONLY if it's right after `if (res.error)`
    
    # Find all occurrences of "if (res.error)"
    pieces = content.split('if (res.error)')
    new_content = pieces[0]
    for piece in pieces[1:]:
        # piece contains " { ... } else { ... }"
        # replace the FIRST "} else {" with "} else {\n      router.refresh();"
        piece = piece.replace('} else {\n', '} else {\n      router.refresh();\n', 1)
        new_content += 'if (res.error)' + piece
        
    content = new_content
    
    # One more thing: Some places might use `if (!res.error)`
    # Or maybe there's no `else` block? 
    # If the file was changed, save it
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {rel_path}")
    else:
        print(f"No changes for {rel_path}")
