'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function OrdersPage() {
  const { appUser } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (appUser?.role || '').toLowerCase();

  useEffect(() => {
    if (!appUser?.uid || !appUser?.email) return;
    // Waiter is allowed to list (see rules), then we filter client-side to support old docs
    const unsub = onSnapshot(collection(db, 'sales'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      if (role === 'waiter') {
        const mine = all.filter((x:any) => 
          x.waiterId === appUser.uid || 
          x.waiterEmail === appUser.email || 
          x.waiter === appUser.email // OLD field from your first order
        );
        setOrders(mine.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      } else {
        setOrders(all.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      }
      setLoading(false);
    }, (err) => {
      console.error("Orders error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [appUser, role]);

  if (loading) return <div style={{ padding: 20 }}>Loading orders...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{role === 'waiter' ? 'My Orders' : 'All Orders'} - {orders.length}</h1>
      <div style={{ background: 'white', borderRadius: 12, marginTop: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 16px', background: '#f8fafc', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
          <span>Table / Waiter</span><span>Total</span><span>Method</span>
        </div>
        {orders.length === 0 && <div style={{ padding: 20, color: '#64748b', textAlign: 'center' }}>No orders — go to POS Billing and create one with NEW POS file I gave you</div>}
        {orders.map((o:any) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 16px', borderTop: '1px solid #f1f5f9', fontSize: 13 }}>
            <span><b>{o.tableName || o.tableId || 'Table'}</b><br/><span style={{ fontSize: 11, color: '#64748b' }}>{o.waiterEmail || o.waiter || o.waiterId}</span></span>
            <span style={{ fontWeight: 800 }}>KES {o.total || 0}</span>
            <span>{o.paymentMethod || 'Cash'} {o.mpesaCode || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}