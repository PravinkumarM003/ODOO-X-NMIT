import os

file_path = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\overview\OverviewClient.tsx'
with open(file_path, 'r') as f:
    content = f.read()

part1 = '{/* 2. SUMMARY TILES (Section 7.2) */}'
part2 = '{/* 3. STAGE PIPELINE (Section 7.2) */}'
part3 = '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">'

idx1 = content.find(part1)
idx2 = content.find(part2)
idx3 = content.find(part3)

if idx1 != -1 and idx2 != -1 and idx3 != -1:
    summary_tiles = content[idx1:idx2]
    pipeline = content[idx2:idx3]
    
    # We want Pipeline BEFORE Summary Tiles
    # Actually wait, let's look at the spacing.
    # We will just swap them.
    new_content = content[:idx1] + pipeline + "\n      " + summary_tiles + content[idx3:]
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully swapped sections.")
else:
    print(f"Failed to find indices. idx1={idx1}, idx2={idx2}, idx3={idx3}")
