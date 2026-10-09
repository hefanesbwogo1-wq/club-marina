'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function CashShiftsPage(){
  const { appUser } = useAuth();
  const [shifts,setShifts]=useState<any[]>([]); const [openingCash,setOpeningCash]=useState(5000); const [activeShift,setActiveShift]=useState<any>(null);
  const [sales,setSales]=useState<any[]>([]); const [expenses,setExpenses]=useState<any[]>([]);

  useEffect(()=>{
    onSnapshot(query(collection(db,'cashShifts'), orderBy('openedAt','desc')), s=>{ const list=s.docs.map(d=>({id:d.id,...d.data()})); setShifts(list); setActiveShift(list.find((x:any)=>x.status==='open')||null); });
    onSnapshot(collection(db,'sales'), s=>setSales(s.docs.map(d=>d.data())));
    onSnapshot(collection(db,'expenses'), s=>setExpenses(s.docs.map(d=>d.data())));
  },[]);

  const cashSales = sales.filter((s:any)=>s.paymentMethod==='Cash' && activeShift && s.createdAt?.toMillis?.() > activeShift.openedAt?.toMillis?.()).reduce((a:any,b:any)=>a+(b.total||0),0);
  const cashExpenses = expenses.filter((e:any)=>e.paymentMethod==='Cash' && activeShift && e.createdAt?.toMillis?.() > activeShift.openedAt?.toMillis?.()).reduce((a:any,b:any)=>a+(b.amount||0),0);
  const expected = activeShift ? (activeShift.openingCash + cashSales - cashExpenses) : 0;

  const openShift = async(e:any)=>{
    e.preventDefault();
    if(activeShift) return alert('Close current shift first per Spec 26');
    await addDoc(collection(db,'cashShifts'),{ openingCash:Number(openingCash), cashier:appUser?.email, openedAt:serverTimestamp(), status:'open', branchId:'chebunyo_main' });
  };
  const closeShift = async()=>{
    const actual = Number(prompt(`Expected Cash per Spec 25: KES ${expected}\nEnter Actual Cash Counted:`));
    if(isNaN(actual)) return;
    const variance = actual - expected;
    await updateDoc(doc(db,'cashShifts',activeShift.id),{ closedAt:serverTimestamp(), actualCash:actual, expectedCash:expected, cashSales, cashExpenses, variance, status:'closed', closedBy:appUser?.email });
    await addDoc(collection(db,'auditLogs'),{action:'Cash Shift Closed', user:appUser?.email, record:activeShift.id, amount:actual, date:serverTimestamp(), details:`Variance ${variance}`});
  };

  return <div>
    <h1 style={{fontSize:22,fontWeight:800}}>Cash Shifts - Spec 25</h1>
    {activeShift ? <div style={{background:'#dcfce7',padding:16,borderRadius:12,marginTop:12}}><b>OPEN SHIFT</b> - Cashier: {activeShift.cashier}<br/>Opening: KES {activeShift.openingCash} | Cash Sales: KES {cashSales} | Cash Expenses: KES {cashExpenses}<br/><b>Expected: KES {expected}</b><br/><button onClick={closeShift} style={{marginTop:10,padding:'10px 20px',background:'#0f172a',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>Close Shift + Handover - Spec 26</button></div>
    : <form onSubmit={openShift} style={{background:'white',padding:16,borderRadius:12,display:'flex',gap:12,marginTop:12}}><input type="number" value={openingCash} onChange={e=>setOpeningCash(Number(e.target.value))} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,flex:1}} placeholder="Opening Cash"/><button style={{padding:'10px 20px',background:'#16a34a',color:'white',border:0,borderRadius:8}}>Open Shift</button></form>}
    <div style={{background:'white',marginTop:16,borderRadius:12,overflow:'hidden'}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:10,textAlign:'left'}}>Opened</th><th>Cashier</th><th>Opening</th><th>Cash Sales</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Status</th></tr></thead><tbody>{shifts.map((s:any)=><tr key={s.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:10}}>{s.openedAt?.toDate?.()?.toLocaleString()||''}</td><td>{s.cashier}</td><td>{s.openingCash}</td><td>{s.cashSales||'-'}</td><td>{s.expectedCash||'-'}</td><td>{s.actualCash||'-'}</td><td style={{color:s.variance<0?'red':'green',fontWeight:700}}>{s.variance ?? '-'}</td><td>{s.status}</td></tr>)}</tbody></table></div>
  </div>
}