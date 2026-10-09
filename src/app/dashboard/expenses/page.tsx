'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const CATS = ['Rent','Electricity','Water','Salaries','Repairs','Transport','Cleaning','Security','Entertainment','Supplies','Maintenance','Other'];

export default function ExpensesPage(){
  const { appUser } = useAuth();
  const [list,setList]=useState<any[]>([]); const [cat,setCat]=useState('Supplies'); const [amount,setAmount]=useState(0); const [desc,setDesc]=useState(''); const [method,setMethod]=useState('Cash');
  useEffect(()=>onSnapshot(query(collection(db,'expenses'), orderBy('createdAt','desc')), s=>setList(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  const save=async(e:any)=>{
    e.preventDefault();
    await addDoc(collection(db,'expenses'),{category:cat,amount:Number(amount),description:desc,paymentMethod:method,user:appUser?.email,createdAt:serverTimestamp(),branchId:'chebunyo_main',status:'Approved'});
    await addDoc(collection(db,'auditLogs'),{action:'Expense Created', user:appUser?.email, record:cat, amount:Number(amount), date:serverTimestamp(), details:desc});
    setAmount(0); setDesc('');
  };
  const total = list.reduce((a,b)=>a+(b.amount||0),0);
  return <div><h1 style={{fontSize:22,fontWeight:800}}>Expenses - Spec 41</h1><div style={{background:'white',padding:12,borderRadius:12,marginTop:12}}>Total: <b>KES {total}</b></div>
  <form onSubmit={save} style={{background:'white',padding:16,borderRadius:12,display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}><select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="Amount" required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:120}}/><select value={method} onChange={e=>setMethod(e.target.value)} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}><option>Cash</option><option>Till</option><option>Paybill</option></select><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description - Spec 56" required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,flex:1}}/><button style={{padding:'10px 20px',background:'#0f172a',color:'white',border:0,borderRadius:8}}>Add</button></form>
  <div style={{background:'white',marginTop:16,borderRadius:12,overflow:'hidden'}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:10,textAlign:'left'}}>Date</th><th>Category</th><th>Amount</th><th>Method</th><th>Description</th><th>User</th><th></th></tr></thead><tbody>{list.map((x:any)=><tr key={x.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:10}}>{x.createdAt?.toDate?.()?.toLocaleDateString()||''}</td><td>{x.category}</td><td style={{fontWeight:700}}>KES {x.amount}</td><td>{x.paymentMethod}</td><td>{x.description}</td><td>{x.user}</td><td><button onClick={()=>deleteDoc(doc(db,'expenses',x.id))} style={{color:'red',border:0,background:'none',cursor:'pointer'}}>Del</button></td></tr>)}</tbody></table></div></div>
}