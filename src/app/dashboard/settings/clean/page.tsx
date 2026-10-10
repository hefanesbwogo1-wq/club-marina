'use client';
import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const COLLECTIONS_TO_CLEAN = [
  'sales',
  'auditLogs',
  'liveActivity',
  'voidRequests',
  'expenses',
  'products',
  'tables',
  'purchases',
  'suppliers',
  'cashShifts',
  'bookings',
  'events',
  'inventoryMovements',
  'wastage',
  'stockCounts',
  'notifications',
  'receipts',
  // staff - we will keep your current admin, delete rest
  'users',
  'appUsers',
];

export default function CleanSystemPage(){
  const { appUser } = useAuth();
  const [status,setStatus]=useState('Ready to clean');
  const [cleaning,setCleaning]=useState(false);
  const [confirmText,setConfirmText]=useState('');

  const role=(appUser?.role||'').toLowerCase();
  if(!['super_admin','admin'].includes(role)){
    return <div style={{padding:40, fontWeight:800}}>Access Denied - Only Super Admin can clean system. Your role: {role}</div>;
  }

  const deleteCollection = async (colName:string, keepAdminEmail?:string) => {
    const snap = await getDocs(collection(db,colName));
    let count=0;
    // delete in batches of 400
    const batchSize=400;
    for(let i=0;i<snap.docs.length;i+=batchSize){
      const batch = writeBatch(db);
      const chunk = snap.docs.slice(i,i+batchSize);
      for(const d of chunk){
        const data=d.data() as any;
        // KEEP YOUR SUPER ADMIN
        if((colName==='appUsers' || colName==='users') && data.email?.toLowerCase()===keepAdminEmail?.toLowerCase()){
          continue;
        }
        // KEEP admin@clubmarina.co.ke always
        if((colName==='appUsers' || colName==='users') && data.email==='admin@clubmarina.co.ke'){
          continue;
        }
        batch.delete(doc(db,colName,d.id));
        count++;
      }
      await batch.commit();
    }
    return count;
  };

  const handleClean = async () => {
    return alert('Factory reset is temporarily disabled for safety. No data was changed.');
    if(confirmText!=='DELETE EVERYTHING'){
      return alert('Type DELETE EVERYTHING to confirm');
    }
    if(!confirm('LAST WARNING: This will DELETE ALL sales, staff, products, tables, audit logs. Are you 100% sure?')){
      return;
    }
    setCleaning(true);
    try{
      let total=0;
      for(const col of COLLECTIONS_TO_CLEAN){
        setStatus(`Deleting ${col}...`);
        const c = await deleteCollection(col, appUser?.email||'');
        total+=c;
        setStatus(`Deleted ${c} from ${col} - Total: ${total}`);
      }
      setStatus(`âœ… DONE - Deleted ${total} documents. System is FRESH. Now recreate 12 tables and products.`);
      
      // Recreate 12 tables fresh
      setStatus('Recreating 12 tables fresh...');
      for(let i=1;i<=12;i++){
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db,'tables',`table-${i}`), {
          number:i,
          status:'available',
          occupiedBy:null,
          occupiedAt:null,
          createdAt: new Date(),
          name:`TABLE ${i}`
        });
      }
      setStatus(`âœ… SYSTEM FRESH - 12 tables recreated - ${total} old records deleted - Ready for work at Chebunyo!`);

    }catch(e:any){
      setStatus('Error: '+e.message);
    }
    setCleaning(false);
  };

  return(
    <div style={{padding:20, maxWidth:600}}>
      <h1 style={{fontWeight:900, fontSize:22, color:'#991b1b'}}>âš ï¸ FACTORY RESET - CLEAN SYSTEM</h1>
      <div style={{background:'#fef2f2', border:'2px solid #fecaca', padding:16, borderRadius:12, marginTop:16}}>
        <div style={{fontWeight:800, fontSize:13}}>This will DELETE:</div>
        <ul style={{fontSize:12, marginTop:8, lineHeight:1.6}}>
          <li>All sales / orders</li>
          <li>All audit logs & live activity</li>
          <li>All void requests</li>
          <li>All expenses, purchases, suppliers</li>
          <li>All products, tables (will recreate 12 fresh)</li>
          <li>All staff EXCEPT you ({appUser?.email}) and admin@clubmarina.co.ke</li>
        </ul>
        <div style={{fontWeight:800, color:'#991b1b', marginTop:10, fontSize:12}}>IRREVERSIBLE - No undo!</div>
      </div>

      <div style={{background:'white', borderRadius:12, padding:16, marginTop:16, border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:12, fontWeight:700, marginBottom:8}}>Type <b style={{background:'#0f172a', color:'white', padding:'2px 6px', borderRadius:4}}>DELETE EVERYTHING</b> to confirm:</div>
        <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Type DELETE EVERYTHING" style={{width:'100%', padding:12, borderRadius:8, border:'2px solid #fecaca', fontWeight:700}} />
        <button onClick={handleClean} disabled={true} style={{width:'100%', marginTop:12, padding:14, background: confirmText==='DELETE EVERYTHING'?'#dc2626':'#94a3b8', color:'white', border:0, borderRadius:10, fontWeight:900, cursor:'pointer', fontSize:14}}>
          {cleaning? 'Cleaning...' : 'ðŸ—‘ï¸ DELETE EVERYTHING - MAKE FRESH'}
        </button>
        <div style={{marginTop:12, fontSize:11, background:'#f8fafc', padding:10, borderRadius:8, fontWeight:600}}>{status}</div>
      </div>

      <div style={{marginTop:16, fontSize:11, color:'#64748b'}}>
        After clean: Go to /dashboard/products/bulk-seed to add your drinks, and /dashboard/tables/bulk-seed to confirm 12 tables. Then add staff fresh at /dashboard/staff.
      </div>
    </div>
  );
}
