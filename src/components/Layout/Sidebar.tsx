'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BUSINESS_NAME } from '@/lib/constants';
const nav = [
  { label: 'Dashboard', href: '/dashboard', roles: ['super_admin','manager','admin','accountant','auditor','cashier','storekeeper','waiter'] },
  { label: 'POS', href: '/pos', roles: ['super_admin','manager','admin','cashier','waiter'] },
  { label: 'Orders', href: '/orders', roles: ['super_admin','manager','admin','cashier','waiter'] },
  { label: 'Tables', href: '/tables', roles: ['super_admin','manager','admin','cashier','waiter'] },
  { label: 'Products', href: '/products', roles: ['super_admin','manager','admin','storekeeper'] },
  { label: 'Inventory', href: '/inventory', roles: ['super_admin','manager','admin','storekeeper'] },
  { label: 'Purchases', href: '/purchases', roles: ['super_admin','manager','admin','storekeeper','accountant'] },
  { label: 'Expenses', href: '/expenses', roles: ['super_admin','manager','admin','accountant'] },
  { label: 'Staff', href: '/staff', roles: ['super_admin','manager','admin'] },
  { label: 'Reports', href: '/reports', roles: ['super_admin','manager','admin','accountant','auditor'] },
  { label: 'Approvals', href: '/approvals', roles: ['super_admin','manager','admin'] },
  { label: 'Audit Logs', href: '/audit', roles: ['super_admin','manager','admin','auditor'] },
];
export default function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest text-amber-400">{BUSINESS_NAME}</h1>
        <p className="text-xs text-slate-400">Chebunyo, Bomet</p>
        <p className="text-[10px] mt-2 px-2 py-1 bg-slate-800 rounded">Role: {profile?.role} | Branch: {profile?.branchId}</p>
      </div>
      <nav className="flex-1 space-y-1">
        {nav.filter(n=>!profile || n.roles.includes(profile.role)).map(item=>{
          const active = pathname?.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`block px-3 py-2 rounded text-sm ${active? 'bg-amber-500 text-slate-900 font-bold':'hover:bg-slate-800 text-slate-300'}`}>{item.label}</Link>
        })}
      </nav>
      <button onClick={logout} className="mt-4 text-xs text-slate-400 hover:text-white border border-slate-700 py-2 rounded">Logout</button>
    </aside>
  );
}