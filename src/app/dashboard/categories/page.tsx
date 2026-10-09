'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
export default function CategoriesPage(){
  const [list,setList]=useState<any[]>([]); const [name,setName]=useState(''); const [dept,setDept]=useState('bar');
  useEffect(()=>onSnapshot(collection(db,'categories'), s=>setList(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  const save=async(e:any)=>{e.preventDefault(); await addDoc(collection(db,'categories'),{name,department:dept,branchId:'chebunyo_main'}); setName('');}
  return <div><h1 style={{fontSize:22,fontWeight:800}}>Categories</h1>
  <form onSubmit={save} style={{background:'white',padding:16,borderRadius:12,display:'flex',gap:12,marginTop:16}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Beers, Meals, Whisky" required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,flex:1}}/><select value={dept} onChange={e=>setDept(e.target.value)} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}><option value="bar">Bar</option><option value="kitchen">Kitchen</option></select><button style={{padding:'10px 20px',background:'#0f172a',color:'white',borderRadius:8,border:0}}>Add</button></form>
  <div style={{background:'white',marginTop:16,borderRadius:12,padding:12}}>{list.map((c:any)=><div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:10,borderBottom:'1px solid #f1f5f9'}}><span>{c.name} - {c.department}</span><button onClick={()=>deleteDoc(doc(db,'categories',c.id))} style={{color:'red',border:0,background:'none',cursor:'pointer'}}>Delete</button></div>)}</div></div>
}