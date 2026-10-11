import os

file_path = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\rolls\RollsQCClient.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('export default function RollsQCClient({ rolls: initialRolls, eligibleOrdersForRegistration: initialOrders, machineDefects }: { rolls: any[], eligibleOrdersForRegistration: any[], machineDefects: any[] })', 'export default function RollsQCClient({ rolls: initialRolls, eligibleOrdersForRegistration: initialOrders, machineDefects, userRole }: { rolls: any[], eligibleOrdersForRegistration: any[], machineDefects: any[], userRole?: string })')

target_inspect = 'onClick={() => setInspectRoll(r)}'
replacement_inspect = 'onClick={() => setInspectRoll(r)}\n                        disabled={userRole !== "INSPECTION_SUPERVISOR" && userRole !== "OWNER"}'
content = content.replace(target_inspect, replacement_inspect)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
