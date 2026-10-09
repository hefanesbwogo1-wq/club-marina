'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function InventoryPage(){
  const { appUser } = useAuth();
  const [products,setProducts]=useState<any[]>([]);
  const [movements,setMovements]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [counts,setCounts]=useState<any>({});

  useEffect(()=>{
    const u1=onSnapshot(query(collection(db,'products'), orderBy('name')), s=>setProducts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(query(collection(db,'inventoryMovements'), orderBy('createdAt','desc')), s=>setMovements(s.docs.map(d=>({id:d.id,...d.data()})).slice(0,50)));
    return ()=>{u1();u2();};
  },[]);

  const saveCount=async(p:any)=>{
    const c = Number(counts[p.id]);
    if(isNaN(c)) return alert('Enter counted qty');
    const prev = p.stock||0;
    await updateDoc(doc(db,'products',p.id),{ stock:c, updatedAt:serverTimestamp(), updatedBy:appUser?.email });
    await addDoc(collection(db,'inventoryMovements'),{ productId:p.id, productName:p.name, movementType:'Stock Take', previousQty:prev, newQty:c, qty:c-prev, reason:'Physical Count', user:appUser?.email, createdAt:serverTimestamp() });
    alert(`${p.name}: ${prev} → ${c} (Variance ${c-prev})`);
  };

  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const totalVariance = filtered.reduce((a,p)=>{ const c=counts[p.id]; if(c!==undefined && c!=='') return a + (Number(c)-(p.stock||0)); return a; },0);

  return (
    <div style={{padding:12}}>
      <div style={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
        <div><h1 style={{fontSize:22, fontWeight:800}}>📦 Stock Count / Audit</h1><p style={{fontSize:11, color:'#64748b'}}>Storekeeper = Stock Officer: Do physical count and update system</p></div>
        <div style={{background: totalVariance===0?'#dcfce7':'#fef3c7', padding:'10px 14px', borderRadius:8, fontWeight:800, fontSize:12}}>Total Variance: {totalVariance}</div>
      </div>

      <div style={{background:'white', padding:12, borderRadius:12, marginTop:12, display:'flex', gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search product..." style={{flex:1, padding:10, border:'1px solid #cbd5e1', borderRadius:8}}/>
      </div>

      <div style={{background:'white', borderRadius:12, marginTop:12, overflow:'hidden'}}>
        <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc', fontSize:10, color:'#64748b'}}><th style={{padding:10, textAlign:'left'}}>Product</th><th>Category</th><th>System</th><th style={{width:120}}>Counted</th><th>Variance</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.map(p=>{
              const c = counts[p.id]; const v = c!==undefined && c!==''? Number(c)-(p.stock||0) : null;
              return <tr key={p.id} style={{borderTop:'1px solid #f1f5f9', background: v!==null && v!==0? '#fff7ed':'white'}}>
                <td style={{padding:10, fontWeight:700}}>{p.name}</td><td>{p.category}</td><td style={{textAlign:'center', fontWeight:800}}>{p.stock}</td>
                <td><input type="number" value={c??''} onChange={e=>setCounts({...counts,[p.id]:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #cbd5e1', borderRadius:6}}/></td>
                <td style={{textAlign:'center', fontWeight:800, color: v===null?'#94a3b8': v===0?'#16a34a': v<0?'#dc2626':'#d97706'}}>{v!==null? (v>0? '+'+v : v):'-'}</td>
                <td><button onClick={()=>saveCount(p)} style={{background:'#0f172a', color:'white', padding:'6px 12px', borderRadius:6, border:0, fontWeight:700}}>Save</button></td>
              </tr>
            })}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{padding:20, textAlign:'center', color:'#94a3b8'}}>No products - Add in Products page first</div>}
      </div>

      <div style={{background:'white', borderRadius:12, marginTop:16, padding:12}}>
        <h3 style={{fontWeight:800, fontSize:13}}>📝 Recent Stock Movements</h3>
        <table style={{width:'100%', fontSize:11, marginTop:8}}><thead><tr style={{color:'#64748b'}}><th style={{textAlign:'left'}}>Time</th><th>Product</th><th>Type</th><th>Prev</th><th>New</th><th>Qty</th><th>By</th></tr></thead>
        <tbody>{movements.map(m=><tr key={m.id} style={{borderTop:'1px solid #f1f5f9'}}><td>{m.createdAt?.toDate?.()?.toLocaleString()?.slice(0,16)||''}</td><td>{m.productName}</td><td>{m.movementType}</td><td>{m.previousQty}</td><td style={{fontWeight:800}}>{m.newQty}</td><td style={{color:m.qty<0?'#dc2626':'#16a34a'}}>{m.qty>0? '+'+m.qty:m.qty}</td><td>{m.user?.split('@')[0]}</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}