'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function PurchasesPage(){
  const { appUser } = useAuth();
  const [products,setProducts]=useState<any[]>([]); const [suppliers,setSuppliers]=useState<any[]>([]); const [list,setList]=useState<any[]>([]);
  const [supplier,setSupplier]=useState(''); const [productId,setProductId]=useState(''); const [qty,setQty]=useState(1); const [buyPrice,setBuyPrice]=useState(0); const [invoice,setInvoice]=useState('');
  useEffect(()=>{
    onSnapshot(collection(db,'products'), s=>setProducts(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,'suppliers'), s=>setSuppliers(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(query(collection(db,'purchases'), orderBy('createdAt','desc')), s=>setList(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  const receive=async(e:any)=>{
    e.preventDefault();
    const prod = products.find(p=>p.id===productId); if(!prod) return alert('Select product');
    const batch = writeBatch(db);
    const prodRef = doc(db,'products',productId); const snap = await getDoc(prodRef); const prev = snap.data()?.stock||0; const now = prev + Number(qty);
    batch.update(prodRef,{stock:now});
    const movRef = doc(collection(db,'inventoryMovements')); batch.set(movRef,{productId,productName:prod.name,movementType:'Purchase',previousQty:prev,newQty:now,qty:Number(qty),user:appUser?.email,createdAt:serverTimestamp(),reference:invoice,branchId:'chebunyo_main'});
    await batch.commit();
    await addDoc(collection(db,'purchases'),{supplier,productId,productName:prod.name,qty:Number(qty),buyingPrice:Number(buyPrice),total:Number(qty)*Number(buyPrice),invoiceNumber:invoice,receivedBy:appUser?.email,createdAt:serverTimestamp(),branchId:'chebunyo_main'});
    await addDoc(collection(db,'auditLogs'),{action:'Purchase Received', user:appUser?.email, record:prod.name, amount:Number(qty), date:serverTimestamp(), details:`Invoice ${invoice} Stock ${prev}->${now}`});
    alert(`Stock Increased per Spec 38! ${prod.name} ${prev} -> ${now}`);
  };
  return <div><h1 style={{fontSize:22,fontWeight:800}}>Purchases - Spec 38 (Auto Stock ++)</h1>
  <form onSubmit={receive} style={{background:'white',padding:16,borderRadius:12,display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
    <select value={supplier} onChange={e=>setSupplier(e.target.value)} required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}><option value="">Select Supplier</option>{suppliers.map((s:any)=><option key={s.id} value={s.name}>{s.name}</option>)}</select>
    <select value={productId} onChange={e=>{setProductId(e.target.value); const p=products.find(x=>x.id===e.target.value); if(p) setBuyPrice(p.buyingPrice);}} required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}><option value="">Product</option>{products.map((p:any)=><option key={p.id} value={p.id}>{p.name} - Stock:{p.stock}</option>)}</select>
    <input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} placeholder="Qty" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:80}}/>
    <input type="number" value={buyPrice} onChange={e=>setBuyPrice(Number(e.target.value))} placeholder="Buy Price" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:100}}/>
    <input value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Invoice No" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:120}}/>
    <button style={{padding:'10px 20px',background:'#16a34a',color:'white',border:0,borderRadius:8}}>Receive + Add Stock</button>
  </form>
  <div style={{background:'white',marginTop:16,borderRadius:12,overflow:'hidden'}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:10,textAlign:'left'}}>Date</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Total</th><th>Invoice</th></tr></thead><tbody>{list.map((x:any)=><tr key={x.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:10}}>{x.createdAt?.toDate?.()?.toLocaleDateString()||''}</td><td>{x.supplier}</td><td>{x.productName}</td><td>{x.qty}</td><td>KES {x.total}</td><td>{x.invoiceNumber}</td></tr>)}</tbody></table></div></div>
}