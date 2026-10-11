
export function formatRole(role: string): string {
  switch (role) {
    case 'ADMINISTRATOR': return 'Administrator';
    case 'MANAGER': return 'Operations Manager';
    case 'PRODUCTION_SUPERVISOR': return 'Production Manager';
    case 'MECHANIC': return 'Head Mechanic';
    case 'INSPECTION_SUPERVISOR': return 'QC Inspector';
    case 'DISPATCH_OFFICER': return 'Dispatch Officer';
    case 'BUYER': return 'Buyer';
    default: return role.replace("_", " ");
  }
}
