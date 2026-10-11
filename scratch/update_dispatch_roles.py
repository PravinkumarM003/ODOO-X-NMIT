import os
import re

file_path = r'c:\Users\pravi\Videos\Desktop\ODOO X\frontend\src\app\dispatch\DispatchClient.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update props interface
content = content.replace('  invoices: any[];\n}', '  invoices: any[];\n  userRole?: string;\n}')
content = content.replace('  invoices,\n}: DispatchClientProps) {', '  invoices,\n  userRole,\n}: DispatchClientProps) {')

# 2. Restrict Dispatch Truck
target_dispatch = 'onClick={() => openDispatchModal(ro)}'
replacement_dispatch = 'onClick={() => openDispatchModal(ro)}\n                        disabled={userRole !== "DISPATCH_OFFICER" && userRole !== "OWNER"}'
content = content.replace(target_dispatch, replacement_dispatch)

# 3. Restrict Record Payment (two locations usually, or one)
target_payment = 'onClick={() => setPaymentInvoice(inv)}'
replacement_payment = 'onClick={() => setPaymentInvoice(inv)}\n                          disabled={userRole !== "OWNER" && userRole !== "OFFICE"}'
content = content.replace(target_payment, replacement_payment)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
