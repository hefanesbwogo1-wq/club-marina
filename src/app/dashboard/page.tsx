'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { initializeApp, getApps } from 'firebase/app';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};
const getApp = () => getApps().length? getApps()[0] : initializeApp(firebaseConfig);

export default function Dashboard() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ revenue:0, orders:0, staffOnline:0, staffTotal:0, pendingVoids:0, lowStock:0, sales:0 });
  const [tables, setTables] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState(0);
  const [mySales, setMySales] = useState(0);

  useEffect(() => {
    if (!db) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const unsubSales = onSnapshot(collection(db,'sales'), snap => {
      let rev=0, count=0;
      snap.forEach(d=>{
        const data=d.data() as any;
        const created = data.createdAt?.toDate? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        if (created >= today && data.status!== 'voided') { rev += Number(data.total||0); count++; }
      });
      setStats(s=>({...s, revenue:rev, orders:count, sales:rev}));
    });
    const unsubUsers = onSnapshot(collection(db,'users'), snap => {
      setStats(s=>({...s, staffTotal:snap.size, staffOnline: snap.docs.filter(doc=> (doc.data() as any).isOnline).length }));
    });
    const unsubVoids = onSnapshot(query(collection(db,'voidRequests'), where('status','==','pending')), snap => {
      setStats(s=>({...s, pendingVoids:snap.size}));
    });
    const unsubProducts = onSnapshot(collection(db,'products'), snap => {
      const low = snap.docs.filter(d=> (d.data().stock||0) <= (d.data().minStock||5)).length;
      setStats(s=>({...s, lowStock:low}));
    });
    return () => { unsubSales(); unsubUsers(); unsubVoids(); unsubProducts(); };
  }, []);

  // WAITER REAL-TIME TABLES
  useEffect(() => {
    if (!db) return;
    const role = appUser?.role?.toLowerCase();
    if (role!== 'waiter') return;

    const unsubTables = onSnapshot(query(collection(db,'tables'), orderBy('number','asc')), snap => {
      let list = snap.docs.map(d=>({id:d.id,...d.data() as any}));
      list = list.filter((t:any)=>!t.branchId || t.branchId==='chebunyo_main' || t.branch==='Chebunyo');
      list.sort((a:any,b:any)=>(a.number||0)-(b.number||0));
      if(list.length===0){
        // fallback if no tables collection yet
        list = Array.from({length:8}, (_,i)=>({id:`table-${i+1}`, name:`Table ${i+1}`, number:i+1, status: i===1?'occupied':'available'}));
      }
      setTables(list);
    });

    const todayStr = new Date().toDateString();
    const unsubMy = onSnapshot(query(collection(db,'sales'), where('waiterId','==', appUser?.uid||'')), snap=>{
      let c=0,s=0;
      snap.forEach(d=>{
        const data:any = d.data();
        const created = data.createdAt?.toDate? data.createdAt.toDate() : new Date(data.createdAt||Date.now());
        if(created.toDateString()===todayStr && data.status!=='voided'){ c++; s+=Number(data.total||0); }
      });
      setMyOrders(c); setMySales(s);
    });

    return ()=>{ unsubTables(); unsubMy(); };
  }, [appUser]);

  if (loading) return <div style={{padding:32}}>Loading...</div>;
  const role = appUser?.role?.toLowerCase() || 'waiter';

  if (role === 'super_admin') {
    return (
      <div style={{padding:8}}>
        <h1 style={{fontSize:28, fontWeight:900}}>SUPER_ADMIN - SYSTEM OVERVIEW</h1>
        <p style={{fontSize:12, color:'#64748b'}}>All branches • All staff • Global audit • Chebunyo Main</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginTop:24}}>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderLeft:'4px solid black'}}>
            <p style={{fontSize:11, color:'#64748b'}}>Branches</p><p style={{fontSize:22, fontWeight:800}}>1 Active</p><p style={{fontSize:11, marginTop:4}}>Chebunyo Main 🟢</p>
          </div>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderLeft:'4px solid #22c55e'}}>
            <p style={{fontSize:11, color:'#64748b'}}>Today Revenue</p><p style={{fontSize:22, fontWeight:800}}>KES {stats.revenue.toLocaleString()}</p><p style={{fontSize:11, marginTop:4}}>{stats.orders} orders</p>
          </div>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderLeft:'4px solid #3b82f6'}}>
            <p style={{fontSize:11, color:'#64748b'}}>Staff Online</p><p style={{fontSize:22, fontWeight:800}}>{stats.staffOnline} / {stats.staffTotal}</p><p style={{fontSize:11, marginTop:4}}>{stats.staffTotal-stats.staffOnline} offline</p>
          </div>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderLeft: stats.pendingVoids>0? '4px solid #ef4444' : '4px solid #e5e7eb'}}>
            <p style={{fontSize:11, color:'#64748b'}}>Pending</p><p style={{fontSize:16, fontWeight:800}}>{stats.pendingVoids} voids • {stats.lowStock} low</p><p style={{fontSize:11, marginTop:4}}>{stats.pendingVoids>0?'🔴 Needs attention':'🟢 All clear'}</p>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginTop:24}}>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontWeight:800}}>Branch Performance</h3>
            <div style={{marginTop:12, padding:12, background:'#f8fafc', borderRadius:8}}>
              <p style={{fontWeight:700, fontSize:13}}>Chebunyo Main | Sales KES {stats.sales.toLocaleString()} | Profit KES {Math.round(stats.sales*0.3).toLocaleString()} | 🟢</p>
              <p style={{fontSize:11, color:'#64748b', marginTop:4}}>Low Stock: {stats.lowStock} | Pending Voids: {stats.pendingVoids}</p>
            </div>
          </div>
          <div style={{background:'white', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontWeight:800}}>Staff Management</h3>
            <p style={{fontSize:12, color:'#64748b', marginTop:8}}>Create staff, assign 7 roles, deactivate</p>
            <div style={{marginTop:16, display:'flex', gap:8}}>
              <Link href="/dashboard/staff" style={{background:'black', color:'white', padding:'8px 16px', borderRadius:8, fontSize:12, textDecoration:'none'}}>Manage Staff →</Link>
              <Link href="/dashboard/waiter" style={{background:'#e2e8f0', padding:'8px 16px', borderRadius:8, fontSize:12, textDecoration:'none', color:'black'}}>Waiter Performance →</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'manager' || role === 'admin') {
    return (
      <div style={{padding:16}}>
        <h1 style={{fontSize:24, fontWeight:800}}>CONTROL CENTER - MANAGER - Chebunyo Main</h1>
        <div style={{marginTop:16, background:'#fefce8', border:'1px solid #fde68a', padding:16, borderRadius:12}}>
          <h2 style={{fontWeight:800}}>WHAT NEEDS MY ATTENTION</h2>
          <p>🔴 {stats.pendingVoids} pending void approvals</p>
          <p>🟠 {stats.lowStock} low stock products</p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginTop:24}}>
          <div style={{background:'white', padding:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderRadius:8}}>Sales KES {stats.revenue.toLocaleString()}</div>
          <div style={{background:'white', padding:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderRadius:8}}>Orders {stats.orders}</div>
          <div style={{background:'white', padding:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderRadius:8}}>Avg KES {stats.orders? Math.round(stats.revenue/stats.orders).toLocaleString() : 0}</div>
          <div style={{background:'white', padding:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', borderRadius:8}}>Profit KES {Math.round(stats.revenue*0.3).toLocaleString()}</div>
        </div>
      </div>
    )
  }

  if (role === 'cashier') {
    return (
      <div style={{padding:16}}>
        <h1 style={{fontSize:24, fontWeight:800}}>CASHIER - Billing Center</h1>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:24}}>
          <Link href="/dashboard/pos" style={{background:'#16a34a', color:'white', padding:24, borderRadius:12, textAlign:'center', textDecoration:'none'}}>POS / Billing</Link>
          <div style={{background:'white', padding:16, borderRadius:8}}>Today Sales: KES {stats.revenue.toLocaleString()}</div>
          <div style={{background:'white', padding:16, borderRadius:8}}>Orders: {stats.orders}</div>
        </div>
      </div>
    )
  }

  if (role === 'waiter') {
    return (
      <div style={{padding:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1 style={{fontSize:24, fontWeight:800}}>WAITER - My Tables</h1>
          <div style={{display:'flex', gap:8}}>
            <div style={{background:'white', padding:'8px 12px', borderRadius:8, fontSize:12, border:'1px solid #e5e7eb'}}>My Orders: <b>{myOrders}</b></div>
            <div style={{background:'white', padding:'8px 12px', borderRadius:8, fontSize:12, border:'1px solid #e5e7eb'}}>My Sales: <b>KES {mySales.toLocaleString()}</b></div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:24}}>
          {tables.map(t=>{
            const occupied = t.status==='occupied' || t.status==='payment_pending';
            const isPending = t.status==='payment_pending';
            return (
              <div
                key={t.id}
                onClick={()=> router.push(`/dashboard/pos?table=${t.id}&tableName=${encodeURIComponent(t.name)}`)}
                style={{
                  background: occupied? (isPending? '#dbeafe' : '#fecaca') : '#dcfce7',
                  border: `2px solid ${occupied? (isPending? '#93c5fd' : '#fca5a5') : '#86efac'}`,
                  padding:20, borderRadius:12, cursor:'pointer', textAlign:'center'
                }}
              >
                <div style={{fontWeight:800, fontSize:14}}>{t.name}</div>
                <div style={{fontSize:11, marginTop:4, fontWeight:700, color: occupied? (isPending? '#1d4ed8' : '#991b1b') : '#166534'}}>
                  {isPending? '🔵 Pay Pending' : occupied? '🔴 Occupied' : '🟢 Available'}
                </div>
                {t.seats && <div style={{fontSize:10, color:'#64748b', marginTop:2}}>{t.seats} seats</div>}
              </div>
            );
          })}
        </div>

        <div style={{display:'flex', gap:12, marginTop:24}}>
          <Link href="/dashboard/pos" style={{background:'black', color:'white', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700}}>Open POS →</Link>
          <div style={{fontSize:11, color:'#64748b', alignSelf:'center'}}>Tap table → POS auto-selects table → creates order → table turns 🔴</div>
        </div>
      </div>
    )
  }

  if (role === 'storekeeper') {
    return (
      <div style={{padding:16}}>
        <h1 style={{fontSize:24, fontWeight:800}}>STOREKEEPER - Inventory Center</h1>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:24}}>
          <div style={{background:'#fef2f2', padding:16, borderRadius:8}}>🔴 Low Stock: {stats.lowStock} products</div>
          <div style={{background:'white', padding:16, borderRadius:8}}>Today Sales: {stats.orders} items</div>
          <div style={{background:'white', padding:16, borderRadius:8}}>Pending Voids: {stats.pendingVoids}</div>
        </div>
      </div>
    )
  }

  return <div style={{padding:24}}>Unknown role: {role}</div>;
}