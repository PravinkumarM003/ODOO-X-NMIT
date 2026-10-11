import re

with open('frontend/src/app/production/ProductionBoardClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace duplicate disabled= attributes. The old one has "OWNER"
content = re.sub(r'disabled=\{[^}]+"OWNER"[^}]+\}\s+disabled=', 'disabled=', content)

with open('frontend/src/app/production/ProductionBoardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
