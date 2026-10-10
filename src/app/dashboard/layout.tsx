'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type MenuItem = { label: string; href: string };

const MENU: Record<string, MenuItem[]> = {
  super_admin: [
    { label: 'System Overview', href: '/dashboard' },
    { label: 'Staff', href: '/dashboard/staff' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Inventory', href: '/dashboard/inventory' },
    { label: 'POS', href: '/dashboard/pos' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Tables', href: '/dashboard/tables' },
    { label: 'Audit Log', href: '/dashboard/audit' },
    { label: 'Reports', href: '/dashboard/reports' },
    { label: 'Settings', href: '/dashboard/settings' },
  ],
  manager: [
    { label: 'Control Center', href: '/dashboard' },
    { label: 'POS', href: '/dashboard/pos' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Tables', href: '/dashboard/tables' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Staff', href: '/dashboard/staff' },
    { label: 'Reports', href: '/dashboard/reports' },
    { label: 'Expenses', href: '/dashboard/expenses' },
  ],
  admin: [
    { label: 'Control Center', href: '/dashboard' },
    { label: 'POS', href: '/dashboard/pos' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Tables', href: '/dashboard/tables' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Staff', href: '/dashboard/staff' },
    { label: 'Reports', href: '/dashboard/reports' },
    { label: 'Expenses', href: '/dashboard/expenses' },
  ],
  cashier: [
    { label: 'Cash Shifts', href: '/dashboard/cash-shifts' },
    { label: 'Pending Payments', href: '/dashboard/pos' },
    { label: 'M-Pesa Reconciliation', href: '/dashboard/mpesa' },
    { label: 'Sales', href: '/dashboard/sales' },
    { label: 'Expenses (View Only)', href: '/dashboard/expenses' },
  ],
  waiter: [
    { label: 'My Tables', href: '/dashboard' },
    { label: 'POS', href: '/dashboard/pos' },
    { label: 'My Orders', href: '/dashboard/waiter' },
  ],
  storekeeper: [
    { label: 'Stock Overview', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Inventory', href: '/dashboard/inventory' },
    { label: 'Purchases', href: '/dashboard/purchases' },
    { label: 'Suppliers', href: '/dashboard/suppliers' },
  ],
  accountant: [
    { label: 'Finance', href: '/dashboard' },
    { label: 'Reports', href: '/dashboard/reports' },
    { label: 'Expenses', href: '/dashboard/expenses' },
    { label: 'M-Pesa', href: '/dashboard/mpesa' },
    { label: 'Audit', href: '/dashboard/audit' },
  ],
  auditor: [
    { label: 'Audit Log', href: '/dashboard' },
    { label: 'Reports', href: '/dashboard/reports' },
    { label: 'Orders', href: '/dashboard/orders' },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appUser, user, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const role = String(appUser?.role ?? '').toLowerCase().trim();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && role === 'cashier' && path === '/dashboard') {
      router.replace('/dashboard/cash-shifts');
    }
  }, [loading, user, role, path, router]);

  if (loading || (user && role === 'cashier' && path === '/dashboard')) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        Loading secure workspace...
      </div>
    );
  }

  if (!user) return null;

  if (!appUser || !role || !MENU[role]) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'sans-serif',
        }}
      >
        <h2>Access unavailable</h2>
        <p>
          Your account does not have a recognized application role.
          Contact an administrator to verify your staff profile.
        </p>
        <button onClick={logout} style={{ marginTop: 16, padding: 10 }}>
          Sign out
        </button>
      </div>
    );
  }

  const items = MENU[role];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <aside
        style={{
          width: 230,
          flexShrink: 0,
          background: '#0f172a',
          color: 'white',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontWeight: 900, fontSize: 16 }}>CLUB MARINA</h2>

        <p style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
          {role.toUpperCase().replace('_', ' ')}
        </p>

        <p
          style={{
            fontSize: 11,
            opacity: 0.7,
            overflowWrap: 'anywhere',
          }}
        >
          {appUser.email}
        </p>

        <nav
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flex: 1,
          }}
        >
          {items.map((item) => {
            const active =
              path === item.href ||
              (item.href !== '/dashboard' &&
                path.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  background: active ? '#1e293b' : 'transparent',
                  color: active ? '#38bdf8' : 'white',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  borderLeft: active
                    ? '3px solid #38bdf8'
                    : '3px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          style={{
            marginTop: 20,
            width: '100%',
            padding: 10,
            background: '#dc2626',
            color: 'white',
            border: 0,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: '#f1f5f9',
          padding: 20,
          overflow: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}