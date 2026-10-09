'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AuditPage(){
  const [logs,setLogs]=useState<any[]>([]); const [filter,setFilter]=useState('');
  useEffect(()=>onSnapshot(query(collection(db,'auditLogs'), orderBy('date','desc')), s=>setLogs(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  const filtered = logs.filter(l=>!filter || l.action?.toLowerCase().includes(filter.toLowerCase()) || l.user?.toLowerCase().includes(filter.toLowerCase()));
  return <div><h1 style={{fontSize:22,fontWeight:800}}>Audit Log - Spec 65 (No Silent Deletion - Spec 66)</h1>
  <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Global Search Spec 55 - Sale, Payment, M-Pesa code, Waiter..." style={{width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginTop:12}}/>
  <div style={{background:'white',marginTop:12,borderRadius:12,overflow:'hidden'}}><table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:8,textAlign:'left'}}>Date/Time</th><th>User</th><th>Action - Spec 65</th><th>Record</th><th>Amount</th><th>Details/Reason - Spec 56</th></tr></thead><tbody>{filtered.map((l:any)=><tr key={l.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:8}}>{l.date?.toDate?.()?.toLocaleString()||''}</td><td>{l.user}</td><td style={{fontWeight:700}}>{l.action}</td><td>{l.record}</td><td>{l.amount}</td><td>{l.details}</td></tr>)}</tbody></table></div>
  {logs.length===0 && <p style={{padding:20,color:'#94a3b8',textAlign:'center'}}>No logs yet. Sales, Purchases, Expenses, Cash Shifts will log here automatically.</p>}
  </div>
}