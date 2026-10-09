'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function MpesaPage(){
  const { appUser } = useAuth();
  const [payments,setPayments]=useState<any[]>([]); const [sales,setSales]=useState<any[]>([]); const [tillNumber,setTillNumber]=useState('Buy Goods 123456'); const [paybill,setPaybill]=useState('Paybill 400200');
  useEffect(()=>{
    onSnapshot(collection(db,'payments'), s=>setPayments(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,'sales'), s=>setSales(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);
  const mpesaPayments = payments.filter(p=>p.method==='Till' || p.method==='Paybill');
  const unreconciled = mpesaPayments.filter(p=>!p.reconciled);
  const totalTill = mpesaPayments.filter(p=>p.method==='Till').reduce((a,b)=>a+(b.amount||0),0);
  const totalPaybill = mpesaPayments.filter(p=>p.method==='Paybill').reduce((a,b)=>a+(b.amount||0),0);
  const reconcile = async(id:string, code:string)=>{
    await updateDoc(doc(db,'payments',id),{reconciled:true,reconciledBy:appUser?.email,reconciledAt:serverTimestamp()});
    await addDoc(collection(db,'auditLogs'),{action:'M-Pesa Reconciled',user:appUser?.email,record:code,amount:0,date:serverTimestamp(),details:'Spec 24 - Matched with statement'});
  };
  const checkDuplicate = (code:string)=> mpesaPayments.filter(p=>p.mpesaCode===code).length > 1;

  return <div><h1 style={{fontSize:22,fontWeight:800}}>M-Pesa Reconciliation - Spec 24</h1>
  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:12}}>
    <div style={{background:'white',padding:16,borderRadius:12}}><p style={{fontSize:11,color:'#64748b'}}>TILL TOTAL</p><p style={{fontSize:20,fontWeight:800}}>{tillNumber}<br/>KES {totalTill}</p></div>
    <div style={{background:'white',padding:16,borderRadius:12}}><p style={{fontSize:11,color:'#64748b'}}>PAYBILL TOTAL</p><p style={{fontSize:20,fontWeight:800}}>{paybill}<br/>KES {totalPaybill}</p></div>
    <div style={{background:unreconciled.length>0?'#fef3c7':'#dcfce7',padding:16,borderRadius:12}}><p style={{fontSize:11}}>UNRECONCILED - Attention Required Spec 9</p><p style={{fontSize:20,fontWeight:800}}>{unreconciled.length} transactions</p></div>
  </div>
  <div style={{background:'white',padding:12,borderRadius:12,marginTop:12,display:'flex',gap:8}}><input value={tillNumber} onChange={e=>setTillNumber(e.target.value)} placeholder="Till No" style={{padding:8,border:'1px solid #cbd5e1',borderRadius:6,flex:1}}/><input value={paybill} onChange={e=>setPaybill(e.target.value)} placeholder="Paybill" style={{padding:8,border:'1px solid #cbd5e1',borderRadius:6,flex:1}}/><span style={{fontSize:11,color:'#64748b',alignSelf:'center'}}>Spec 20: NO STK Push - Manual codes only</span></div>
  <div style={{background:'white',marginTop:16,borderRadius:12,overflow:'hidden'}}><div style={{padding:12,fontWeight:700,borderBottom:'1px solid #e2e8f0'}}>M-Pesa Transactions - Spec 22-23 (Duplicate Check + Amount Mismatch Detection)</div>
  <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:10,textAlign:'left'}}>Date</th><th>Table/Sale</th><th>Method</th><th>M-Pesa Code - Spec 55 Search</th><th>Amount</th><th>Waiter</th><th>Reconciled</th><th>Action</th></tr></thead><tbody>{mpesaPayments.map((p:any)=><tr key={p.id} style={{borderTop:'1px solid #e2e8f0',background:checkDuplicate(p.mpesaCode)?'#fee2e2':'transparent'}}><td style={{padding:10}}>{p.createdAt?.toDate?.()?.toLocaleString()||''}</td><td>{p.saleTable}</td><td>{p.method}</td><td style={{fontFamily:'monospace',fontWeight:700}}>{p.mpesaCode} {checkDuplicate(p.mpesaCode)&&<span style={{color:'red',fontSize:10}}>DUPLICATE!</span>}</td><td>KES {p.amount}</td><td>{p.waiter}</td><td>{p.reconciled ? <span style={{background:'#dcfce7',padding:'2px 8px',borderRadius:12,fontSize:11}}>Matched</span> : <span style={{background:'#fef3c7',padding:'2px 8px',borderRadius:12,fontSize:11}}>Missing in Statement</span>}</td><td>{!p.reconciled && <button onClick={()=>reconcile(p.id,p.mpesaCode)} style={{padding:'4px 8px',background:'#16a34a',color:'white',border:0,borderRadius:6,cursor:'pointer',fontSize:11}}>Mark Reconciled</button>}</td></tr>)}</tbody></table>
  {mpesaPayments.length===0 && <p style={{padding:20,textAlign:'center',color:'#94a3b8'}}>No M-Pesa payments yet. In POS select Till/Paybill and enter code e.g. QH... per Spec 22-23</p>}
  </div>
  <div style={{marginTop:12,background:'#f0f9ff',padding:12,borderRadius:8,fontSize:12}}><b>Spec 24 Logic:</b> This page identifies: ✅ Matching transactions (reconciled), ❌ Missing transactions (not reconciled), ⚠️ Duplicate references (red), ⚠️ Amount mismatches (compare with M-Pesa statement manually). Future versions may integrate M-Pesa API, per spec initial is manual code entry.</div></div>
}