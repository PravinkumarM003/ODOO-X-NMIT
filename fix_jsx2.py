import re

with open('frontend/src/app/production/ProductionBoardClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\s*disabled=\{[^\}]+\"OWNER\"[^\}]+\}\n', '\n', content)

with open('frontend/src/app/production/ProductionBoardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
