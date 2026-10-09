'use client';
import { useState } from 'react';
import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABLES = Array.from({length:12}, (_,i)=>({
  name: `Table ${i+1}`,
  number: i+1,
  seats: i < 4? 4 : i < 8? 6 : 8,
  status: 'available',
  location: i < 6? 'Indoor' : 'Outdoor'
}));

export default function TablesBulkSeedPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const seed = async () => {
    if(!confirm(`Delete old tables and create 12 new Tables (1-12) with Available status?`)) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,'tables'));
      for(let i=0;i<snap.docs.length;i+=400){
        const batch = writeBatch(db);
        snap.docs.slice(i,i+400).forEach(d=>batch.delete(d.ref));
        await batch.commit();
      }
      const batch = writeBatch(db);
      TABLES.forEach(t=>{
        const ref = doc(collection(db,'tables'));
        batch.set(ref, {
          name: t.name,
          number: t.number,
          seats: t.seats,
          capacity: t.seats,
          location: t.location,
          status: 'available',
          branchId: 'chebunyo_main',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setMsg(`✅ Done! Deleted ${snap.docs.length} old, Created 12 tables: Table 1-12 All Available 🟢`);
    } catch(e:any){ setMsg(`Error: ${e.message}`); }
    setLoading(false);
  };

  return (
    <div style={{padding:24, maxWidth:600}}>
      <h1 style={{fontWeight:800, fontSize:22}}>Tables Setup - 12 Tables</h1>
      <p style={{fontSize:13, color:'#64748b', marginTop:8}}>Will create Table 1 to Table 12, all Available</p>
      <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginTop:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
        {TABLES.map(t=><div key={t.number} style={{padding:8, background:'#dcfce7', borderRadius:8, fontSize:12, fontWeight:700, textAlign:'center'}}>{t.name}<br/><span style={{fontSize:10, fontWeight:400}}>{t.seats} seats</span></div>)}
      </div>
      <button onClick={seed} disabled={loading} style={{marginTop:16, width:'100%', padding:14, background: loading?'#94a3b8':'#0f172a', color:'white', borderRadius:10, fontWeight:800, border:0, cursor:'pointer'}}>
        {loading?'Creating...':'🚀 CREATE 12 TABLES - Available'}
      </button>
      {msg && <div style={{marginTop:12, padding:12, background: msg.includes('✅')?'#dcfce7':'#fee2e2', borderRadius:8, fontWeight:700, fontSize:13}}>{msg}</div>}
    </div>
  );
}