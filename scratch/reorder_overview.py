import os

file_path = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\overview\OverviewClient.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to extract the three main blocks and reorder them
# 1. ATTENTION STRIP
marker1 = '{/* 1. ATTENTION STRIP'
# 2. STAGE PIPELINE
marker3 = '{/* 3. STAGE PIPELINE'
# 3. SUMMARY TILES
marker2 = '{/* 2. SUMMARY TILES'
# 4. BOTTOM
marker_bottom = '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">'

idx1 = content.find(marker1)
idx2 = content.find(marker3)
idx3 = content.find(marker2)
idx_b = content.find(marker_bottom)

if -1 not in (idx1, idx2, idx3, idx_b):
    # Determine their current order in the file
    markers = [
        (idx1, "attention"),
        (idx2, "pipeline"),
        (idx3, "summary"),
        (idx_b, "bottom")
    ]
    markers.sort()
    
    blocks = {}
    for i in range(len(markers) - 1):
        blocks[markers[i][1]] = content[markers[i][0] : markers[i+1][0]]
        
    top_content = content[:markers[0][0]]
    bottom_content = content[markers[-1][0]:]
    
    # Desired order: SUMMARY TILES -> ATTENTION STRIP -> STAGE PIPELINE
    new_content = top_content + blocks["summary"] + blocks["attention"] + blocks["pipeline"] + bottom_content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Reordered to: Summary -> Attention -> Pipeline")
else:
    print(f"Could not find markers: {idx1}, {idx2}, {idx3}, {idx_b}")
