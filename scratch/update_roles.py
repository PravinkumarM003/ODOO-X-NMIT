import os

file_path = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\production\ProductionBoardClient.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# For Resolve Breakdown
content = content.replace('onClick={() => handleResolveBreakdown(m.id)}\n                      disabled={loading}', 'onClick={() => handleResolveBreakdown(m.id)}\n                      disabled={loading || (userRole !== "MECHANIC" && userRole !== "OWNER")}')

# For Assign Machine
content = content.replace('onClick={() => setAssignModalWO(wq)}', 'onClick={() => setAssignModalWO(wq)}\n                          disabled={userRole !== "PRODUCTION_SUPERVISOR" && userRole !== "OWNER"}')

# For Reassign Machine
content = content.replace('onClick={() => setReassignWO(wq)}', 'onClick={() => setReassignWO(wq)}\n                          disabled={userRole !== "PRODUCTION_SUPERVISOR" && userRole !== "OWNER"}')

# For Report Down (Production Supervisor only)
content = content.replace('onClick={() => setBreakdownMachine(m)}', 'onClick={() => setBreakdownMachine(m)}\n                    disabled={userRole !== "PRODUCTION_SUPERVISOR" && userRole !== "OWNER"}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
