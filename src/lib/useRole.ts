import { useAuth } from '@/context/AuthContext';
export function useRole() {
  const { appUser } = useAuth();
  const role = (appUser?.role || '').toLowerCase();
  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isAdmin: ['super_admin','admin','manager'].includes(role),
    isStorekeeper: ['super_admin','admin','manager','storekeeper'].includes(role),
    isCashier: ['super_admin','admin','manager','cashier'].includes(role),
    isWaiter: role === 'waiter',
    isAccountant: ['super_admin','admin','manager','accountant'].includes(role),
    canEditTables: ['super_admin','admin','manager'].includes(role),
    canEditProducts: ['super_admin','admin','manager','storekeeper'].includes(role),
    canEditPurchases: ['super_admin','admin','manager','storekeeper'].includes(role),
    canEditExpenses: ['super_admin','admin','manager','accountant'].includes(role),
    canEditStaff: ['super_admin','admin','manager'].includes(role),
    canManageCash: ['super_admin','admin','manager','cashier'].includes(role),
  };
}