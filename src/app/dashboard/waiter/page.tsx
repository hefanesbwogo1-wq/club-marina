'use client';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function WaiterDashboard() {
  const { appUser } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [resolveMethod, setResolveMethod] = useState('Cash');
  const [mpesaCode, setMpesaCode] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const role = (appUser?.role || '').toLowerCase();
  const today = new Date().toDateString();

  useEffect(() => {
    if(!appUser?.uid) return;
    const u1 = onSnapshot(collection(db, 'tables'), s => setTables(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(query(collection(db, 'sales'), where('waiterId','==', appUser.uid), where('businessDay','==', today)), s => setSales(s.docs.map(d=>({id:d.id,...d.data()}))));
    // FollowUps assigned to this waiter
    const u3 = onSnapshot(query(collection(db, 'sales'), where('followUpForId','==', appUser.uid), where('status','==','FollowUp')), s => setFollowUps(s.docs.map(d=>({id:d.id,...d.data()}))));
    // fallback by email if id not set
    const u4 = onSnapshot(query(collection(db, 'sales'), where('followUpFor','==', appUser.email), where('status','==','FollowUp')), s => {
      const byEmail = s.docs.map(d=>({id:d.id,...d.data()}));
      setFollowUps(prev => {
        const merged = [...prev,...byEmail];
        const uniq = Array.from(new Map(merged.map((m:any)=>[m.id,m])).values());
        return uniq;
      });
    });
    return ()=>{ u1(); u2(); u3(); u4(); };
  }, [appUser]);

  const myTables = tables.filter(t=>t.status==='occupied');
  const pendingAtCashier = sales.filter(s=>s.status==='Pending');
  const completedToday = sales.filter(s=>s.status==='Completed');
  const mySalesTotal = completedToday.reduce((a,b)=>a+(b.total||0),0);
  const myProfit = completedToday.reduce((a,b)=>a+(b.profit||0),0);

  const resolveFollowUpAsPaid = async () => {
    if(!selectedFollowUp) return;
    if(resolveMethod==='M-Pesa' &&!mpesaCode.trim()) return alert('Enter M-Pesa code');
    setIsResolving(true);
    try {
      const batch = writeBatch(db);
      for(const item of selectedFollowUp.items){
        const ref = doc(db,'products', item.productId);
        const snap = await getDoc(ref);
        if(snap.exists()){
          const prev = snap.data().stock;
          const now = prev - item.qty;
          if(now<0) throw new Error(`Low stock ${item.name}`);
          batch.update(ref,{stock:now});
          const movRef = doc(collection(db,'inventoryMovements'));
          batch.set(movRef,{productId:item.productId, productName:item.name, movementType:'Sale', previousQty:prev, newQty:now, qty:-item.qty, user:appUser?.email, createdAt:serverTimestamp(), reference:`FollowUp-Resolved-${selectedFollowUp.tableName}`, branchId:'chebunyo_main'});
        }
      }
      await batch.commit();
      await updateDoc(doc(db,'sales', selectedFollowUp.id),{
        status:'Completed', paymentMethod: resolveMethod, mpesaCode: mpesaCode || null,
        cashier: appUser?.email, cashierId: appUser?.uid, resolvedByWaiter: appUser?.email,
        resolvedAt: serverTimestamp(), confirmedAt: serverTimestamp()
      });
      try{ await updateDoc(doc(db,'tables', selectedFollowUp.tableId),{status:'available'}); }catch{}
      await addDoc(collection(db,'payments'),{saleId:selectedFollowUp.id, saleTable:selectedFollowUp.tableName, amount:selectedFollowUp.originalTotal||selectedFollowUp.total, method:resolveMethod, mpesaCode, waiter:selectedFollowUp.waiterEmail, cashier:appUser?.email, createdAt:serverTimestamp(), received:true, status:'Completed', note:'FollowUp resolved by waiter'});
      alert(`✅ Follow-up resolved - KES ${selectedFollowUp.originalTotal||selectedFollowUp.total} marked as ${resolveMethod}`);
      setSelectedFollowUp(null); setMpesaCode('');
    } catch(e:any){ alert(e.message); }
    setIsResolving(false);
  };

  const requestWriteOff = async () => {
    if(!selectedFollowUp) return;
    if(!confirm('Request manager to write off this bill as loss?')) return;
    await updateDoc(doc(db,'sales', selectedFollowUp.id),{
      status:'PendingWriteOff', writeOffRequestedBy: appUser?.email, writeOffReason: selectedFollowUp.followUpNote, writeOffRequestedAt: serverTimestamp()
    });
    alert('Write-off requested - Manager will review');
    setSelectedFollowUp(null);
  };

  return (
    <div style={{padding:4}}>
      <h1 style={{fontSize:22,fontWeight:800}}>Welcome, {(appUser as any)?.name || appUser?.email?.split('@')[0] || 'Waiter'} 👋</h1>
      <p style={{fontSize:12,color:'#64748b',marginTop:4}}>Today: {today} • Role: {role}</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:16}}>
        <div style={{background:'white',padding:16,borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:11,color:'#64748b',fontWeight:700}}>🟢 MY TABLES OCCUPIED</div>
          <div style={{fontSize:28,fontWeight:800,marginTop:6}}>{myTables.length}</div>
          <div style={{fontSize:11,marginTop:4,color:'#64748b'}}>{myTables.map((t:any)=>t.name).join(', ')||'All free'}</div>
        </div>
        <div style={{background: pendingAtCashier.length?'#fef3c7':'white',padding:16,borderRadius:12,border:'1px solid #fcd34d'}}>
          <div style={{fontSize:11,color:'#92400e',fontWeight:700}}>🧾 PENDING AT CASHIER</div>
          <div style={{fontSize:28,fontWeight:800,marginTop:6}}>{pendingAtCashier.length}</div>
          <div style={{fontSize:11,marginTop:4}}>KES {pendingAtCashier.reduce((a,b)=>a+(b.total||0),0).toLocaleString()} waiting</div>
        </div>
        <div style={{background:'white',padding:16,borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:11,color:'#64748b',fontWeight:700}}>💰 MY SALES TODAY</div>
          <div style={{fontSize:22,fontWeight:800,marginTop:6}}>KES {mySalesTotal.toLocaleString()}</div>
          <div style={{fontSize:11,marginTop:4}}>{completedToday.length} bills • Profit KES {myProfit.toLocaleString()}</div>
        </div>
        <div style={{background: followUps.length?'#fee2e2':'#dcfce7',padding:16,borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:11,fontWeight:700,color: followUps.length?'#991b1b':'#166534'}}>⚠️ FOLLOW-UP ACTION NEEDED</div>
          <div style={{fontSize:28,fontWeight:800,marginTop:6,color: followUps.length?'#dc2626':'#16a34a'}}>{followUps.length}</div>
          <div style={{fontSize:11,marginTop:4}}>{followUps.length? 'Resolve now - client owes you' : 'No issues 🎉'}</div>
        </div>
      </div>

      <div style={{marginTop:20, display:'flex', gap:10, flexWrap:'wrap'}}>
        <a href="/dashboard/pos" style={{background:'#0f172a',color:'white',padding:'12px 20px',borderRadius:10,fontWeight:700,textDecoration:'none'}}>+ New Order (PAY)</a>
        <a href="/dashboard/waiter/orders" style={{background:'white',padding:'12px 20px',borderRadius:10,fontWeight:700,border:'1px solid #e2e8f0',textDecoration:'none',color:'black'}}>My Orders Today</a>
      </div>

      {followUps.length>0 && (
        <div style={{marginTop:24, background:'white', borderRadius:12, padding:14, border:'2px solid #fca5a5'}}>
          <h3 style={{fontWeight:800, fontSize:14, color:'#991b1b'}}>🚨 Follow-Up Bills Returned by Cashier - Action Required</h3>
          <p style={{fontSize:11,color:'#64748b',marginTop:4}}>Cashier marked payment as NOT RECEIVED. Go collect from customer and resolve.</p>
          <div style={{display:'grid', gap:10, marginTop:12}}>
            {followUps.map((f:any)=>(
              <div key={f.id} style={{padding:12, border:'1px solid #fee2e2', borderRadius:10, background:'#fff5f5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
                <div>
                  <div style={{fontWeight:800}}>{f.tableName} - KES {f.originalTotal||f.total} - {f.paymentMethod}</div>
                  <div style={{fontSize:11, color:'#991b1b', marginTop:4}}><b>Cashier Note:</b> {f.followUpNote}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{f.followUpAt?.toDate? f.followUpAt.toDate().toLocaleString() : ''} • By {f.followUpBy?.split('@')[0]}</div>
                  <div style={{fontSize:10,marginTop:4}}>{f.items?.map((i:any)=>`${i.name} x${i.qty}`).join(', ')}</div>
                </div>
                <button onClick={()=>setSelectedFollowUp(f)} style={{background:'#dc2626',color:'white',padding:'10px 14px',borderRadius:8,border:0,fontWeight:700,cursor:'pointer'}}>Resolve →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingAtCashier.length>0 && (
        <div style={{marginTop:20, background:'white', borderRadius:12, padding:14, border:'1px solid #e2e8f0'}}>
          <h3 style={{fontWeight:700, fontSize:13}}>⏳ My Pending Bills at Cashier Today</h3>
          <div style={{marginTop:10, display:'grid', gap:6}}>
            {pendingAtCashier.map((p:any)=>(
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',background:'#fffbeb',borderRadius:8,fontSize:12}}>
                <span><b>{p.tableName}</b> - KES {p.total} - {p.items?.length} items</span><span style={{fontSize:10,color:'#92400e'}}>{p.createdAt?.toDate? p.createdAt.toDate().toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFollowUp && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:440}}>
            <h3 style={{fontWeight:800,fontSize:16}}>Resolve Follow-Up: {selectedFollowUp.tableName}</h3>
            <div style={{fontSize:12,marginTop:8,background:'#f8fafc',padding:10,borderRadius:8}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Total:</span><b>KES {selectedFollowUp.originalTotal||selectedFollowUp.total}</b></div>
              <div style={{fontSize:11,marginTop:6,color:'#991b1b'}}>{selectedFollowUp.followUpNote}</div>
            </div>
            <div style={{marginTop:14}}>
              <label style={{fontSize:11,fontWeight:700}}>Payment Method Collected</label>
              <select value={resolveMethod} onChange={e=>setResolveMethod(e.target.value)} style={{width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginTop:6}}>
                <option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option><option value="Bank">Bank</option>
              </select>
              {resolveMethod==='M-Pesa' && (
                <input value={mpesaCode} onChange={e=>setMpesaCode(e.target.value)} placeholder="Enter M-Pesa Transaction Code" style={{width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginTop:10}}/>
              )}
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setSelectedFollowUp(null)} style={{flex:1,padding:12,background:'#f1f5f9',borderRadius:10,border:0,fontWeight:700}}>Cancel</button>
              <button onClick={requestWriteOff} style={{padding:'12px 14px',background:'white',border:'1px solid #fca5a5',color:'#991b1b',borderRadius:10,fontWeight:700}}>Write-Off Request</button>
              <button onClick={resolveFollowUpAsPaid} disabled={isResolving} style={{flex:1,padding:12,background:'#16a34a',color:'white',borderRadius:10,border:0,fontWeight:700}}>{isResolving?'Resolving...':'✅ Mark Paid'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}