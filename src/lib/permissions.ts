export type Role = 'super_admin'|'admin'|'manager'|'cashier'|'waiter'|'storekeeper'|'accountant'|'auditor';

export const PERMISSIONS = {
  super_admin: ['all'],
  admin: ['dashboard','pos','reports','mpesa','cash','tables','bookings','events','products','categories','purchases','suppliers','expenses','staff','audit'],
  manager: ['dashboard','pos','reports','mpesa','cash','tables','bookings','events','products','categories','purchases','suppliers','expenses','staff','audit'],
  cashier: ['dashboard','pos','mpesa','cash','reports_own'],
  waiter: ['dashboard','pos','tables','orders_own'],
  storekeeper: ['dashboard','products','categories','purchases','suppliers','stock'],
  accountant: ['dashboard','reports','mpesa','cash','expenses','purchases','audit'],
  auditor: ['dashboard','reports_read','audit_read'],
};

export const canAccess = (role: Role, perm: string) => {
  if (role === 'super_admin') return true;
  return PERMISSIONS[role]?.includes(perm) || false;
};