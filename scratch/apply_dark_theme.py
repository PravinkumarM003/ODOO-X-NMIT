import os, re

def replace_colors(content):
    # Core Backgrounds & Surfaces
    content = re.sub(r'bg-white', r'bg-[var(--surface)]', content)
    content = re.sub(r'bg-\[\#F4F6F5\]', r'bg-[var(--background)]', content)
    content = re.sub(r'bg-\[\#172D38\]', r'bg-[var(--sidebar)]', content)
    content = re.sub(r'bg-\[\#203B46\]', r'bg-[var(--sidebar-secondary)]', content)
    content = re.sub(r'bg-\[\#142630\]', r'bg-[var(--sidebar-secondary)]', content)
    
    # Core Texts
    content = re.sub(r'text-\[\#202B32\]', r'text-white', content)
    content = re.sub(r'text-\[\#617078\]', r'text-[var(--text-secondary)]', content)
    content = re.sub(r'text-\[\#8EA0A8\]', r'text-[var(--text-secondary)]', content)
    
    # Primary Cyan
    content = re.sub(r'text-\[\#176B63\]', r'text-[var(--primary)]', content)
    content = re.sub(r'bg-\[\#176B63\]', r'bg-[var(--primary)]', content)
    content = re.sub(r'border-\[\#176B63\]', r'border-[var(--primary)]', content)
    content = re.sub(r'hover:text-\[\#176B63\]', r'hover:text-[var(--primary)]', content)
    
    # Borders
    content = re.sub(r'border-\[\#DCE3E1\]', r'border-[var(--border)]', content)
    content = re.sub(r'border-\[\#203B46\]', r'border-[var(--border)]', content)
    content = re.sub(r'divide-\[\#DCE3E1\]', r'divide-[var(--border)]', content)
    content = re.sub(r'divide-\[\#F4F6F5\]', r'divide-[var(--border)]', content)
    
    # Semantic Colors (Critical)
    content = re.sub(r'text-\[\#B44545\]', r'text-[var(--critical)]', content)
    content = re.sub(r'bg-red-50/70', r'bg-[rgba(255,77,77,0.1)]', content)
    content = re.sub(r'bg-red-100', r'bg-[rgba(255,77,77,0.15)]', content)
    content = re.sub(r'border-red-200', r'border-[rgba(255,77,77,0.3)]', content)
    
    # Semantic Colors (Warning)
    content = re.sub(r'text-\[\#A86F1F\]', r'text-[var(--warning)]', content)
    content = re.sub(r'bg-amber-100', r'bg-[rgba(245,166,35,0.15)]', content)
    
    # Semantic Colors (Info)
    content = re.sub(r'text-\[\#54758A\]', r'text-[var(--info)]', content)
    content = re.sub(r'bg-blue-50/50', r'bg-[rgba(58,141,212,0.1)]', content)
    content = re.sub(r'bg-blue-100', r'bg-[rgba(58,141,212,0.15)]', content)
    content = re.sub(r'border-blue-200', r'border-[rgba(58,141,212,0.3)]', content)
    
    # Semantic Colors (Success)
    content = re.sub(r'text-\[\#277653\]', r'text-[var(--success)]', content)
    content = re.sub(r'bg-green-100', r'bg-[rgba(0,230,118,0.15)]', content)
    
    # General UI Polish (shadows and panels)
    content = re.sub(r'shadow-xs', r'shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md', content)
    
    return content

dirs_to_process = [r'frontend/src/app', r'frontend/src/components']
for d in dirs_to_process:
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                new_content = replace_colors(content)
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f"Updated {path}")
