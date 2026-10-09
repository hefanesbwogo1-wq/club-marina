'use client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const MENU: Record<string, {label:string, href:string}[]> = {
  super_admin: [
    {label:'System Overview', href:'/dashboard'},
    {label:'Staff', href:'/dashboard/staff'},
    {label:'Products', href:'/dashboard/products'},
    {label:'Inventory', href:'/dashboard/inventory'},
    {label:'POS', href:'/dashboard/pos'},
    {label:'Orders', href:'/dashboard/orders'},
    {label:'Tables', href:'/dashboard/tables'},
    {label:'Audit Log', href:'/dashboard/audit'},
    {label:'Reports', href:'/dashboard/reports'},
    {label:'Settings', href:'/dashboard/settings'},
  ],
  manager: [
    {label:'Control Center', href:'/dashboard'},
    {label:'POS', href:'/dashboard/pos'},
    {label:'Orders', href:'/dashboard/orders'},
    {label:'Tables', href:'/dashboard/tables'},
    {label:'Products', href:'/dashboard/products'},
    {label:'Staff', href:'/dashboard/staff'},
    {label:'Reports', href:'/dashboard/reports'},
    {label:'Expenses', href:'/dashboard/expenses'},
  ],
  admin: [ // alias for manager - fixes your bug
    {label:'Control Center', href:'/dashboard'},
    {label:'POS', href:'/dashboard/pos'},
    {label:'Orders', href:'/dashboard/orders'},
    {label:'Tables', href:'/dashboard/tables'},
    {label:'Products', href:'/dashboard/products'},
    {label:'Staff', href:'/dashboard/staff'},
    {label:'Reports', href:'/dashboard/reports'},
    {label:'Expenses', href:'/dashboard/expenses'},
  ],
  cashier: [
    {label:'Billing', href:'/dashboard'},
    {label:'POS', href:'/dashboard/pos'},
    {label:'Orders', href:'/dashboard/orders'},
    {label:'Cash Shifts', href:'/dashboard/cash-shifts'},
    {label:'M-Pesa', href:'/dashboard/mpesa'},
  ],
  waiter: [
    {label:'My Tables', href:'/dashboard'},
    {label:'POS', href:'/dashboard/pos'},
    {label:'My Orders', href:'/dashboard/waiter'},
  ],
  storekeeper: [
    {label:'Stock Overview', href:'/dashboard'},
    {label:'Products', href:'/dashboard/products'},
    {label:'Inventory', href:'/dashboard/inventory'},
    {label:'Purchases', href:'/dashboard/purchases'},
    {label:'Suppliers', href:'/dashboard/suppliers'},
  ],
  accountant: [
    {label:'Finance', href:'/dashboard'},
    {label:'Reports', href:'/dashboard/reports'},
    {label:'Expenses', href:'/dashboard/expenses'},
    {label:'M-Pesa', href:'/dashboard/mpesa'},
    {label:'Audit', href:'/dashboard/audit'},
  ],
  auditor: [
    {label:'Audit Log', href:'/dashboard'},
    {label:'Reports', href:'/dashboard/reports'},
    {label:'Orders', href:'/dashboard/orders'},
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { appUser, user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!user &&!appUser) {
      const t = setTimeout(() => { if (!user) router.replace('/login'); }, 2000);
      return () => clearTimeout(t);
    }
  }, [user, appUser, mounted, router]);

  if (!mounted) return null;
  const effectiveUser = appUser || (user? { email: user.email || '', role: 'admin', uid: user.uid } as any : null);

  if (!effectiveUser) {
    return (
      <div style={{ minHeight:'100vh', background:'#0f172a', color:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:30, height:30, border:'3px solid #334155', borderTop:'3px solid white', borderRadius:'50%', animation:'spin 1s linear infinite' }}></div>
        <p style={{marginTop:12}}>Restoring session...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const role = (effectiveUser.role || 'waiter').toLowerCase();
  // normalize admin -> manager for menu lookup
  const menuRole = role === 'admin'? 'manager' : role;
  const items = MENU[role] || MENU[menuRole] || MENU['waiter'];

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'sans-serif' }}>
      <div style={{ width:230, background:'#0f172a', color:'white', padding:16, display:'flex', flexDirection:'column' }}>
        <h2 style={{ fontWeight:900, fontSize:16 }}>CLUB MARINA</h2>
        <p style={{ fontSize:11, color:'#38bdf8', fontWeight:700 }}>{role.toUpperCase()}</p>
        <p style={{ fontSize:11, opacity:0.7, wordBreak:'break-all' }}>{effectiveUser.email}</p>

        <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:2, flex:1 }}>
          {items.map(it => {
            const active = path === it.href;
            return (
              <Link key={it.href+it.label} href={it.href} style={{ display:'block', padding:'10px 12px', background: active? '#1e293b' : 'transparent', color: active? '#38bdf8' : 'white', textDecoration:'none', borderRadius:8, fontSize:13, borderLeft: active? '3px solid #38bdf8' : '3px solid transparent' }}>
                {it.label}
              </Link>
            )
          })}
        </div>
        <button onClick={logout} style={{ marginTop:20, width:'100%', padding:10, background:'#dc2626', color:'white', border:0, borderRadius:8, cursor:'pointer' }}>Logout</button>
      </div>
      <div style={{ flex:1, background:'#f1f5f9', padding:20, overflow:'auto' }}>{children}</div>
    </div>
  );
}