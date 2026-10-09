'use client';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [filter, setFilter] = useState<'today'|'all'>('today');
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'sales'), orderBy('createdAt','desc')), snap => {
      setSales(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return () => unsub();
  }, []);

  const todayStr = new Date().toDateString();

  const { todayCompleted, allCompleted, pending, followUp, recent } = useMemo(() => {
    const todayCompleted = sales.filter(s => s.status==='Completed' && s.businessDay===todayStr);
    const allCompleted = sales.filter(s => s.status==='Completed');
    const pending = sales.filter(s => s.status==='Pending');
    const followUp = sales.filter(s => s.status==='FollowUp');
    const recent = sales.slice(0,50);
    return { todayCompleted, allCompleted, pending, followUp, recent };
  }, [sales, todayStr]);

  const todaySales = todayCompleted.reduce((a,b)=>a+(b.total||0),0);
  const totalSales = allCompleted.reduce((a,b)=>a+(b.total||0),0);
  const todayProfit = todayCompleted.reduce((a,b)=>a+(b.profit||0),0);
  const totalProfit = allCompleted.reduce((a,b)=>a+(b.profit||0),0);
  const pendingTotal = pending.reduce((a,b)=>a+(b.total||0),0);

  // KRA PDF - uses custom date range
  const filteredForKRA = useMemo(()=>{
    return allCompleted.filter((s:any)=>{
      const d = s.confirmedAt?.toDate?.()?.toISOString().slice(0,10) || s.createdAt?.toDate?.()?.toISOString().slice(0,10) || new Date().toISOString().slice(0,10);
      return d >= from && d <= to;
    });
  }, [allCompleted, from, to]);

  const kraTotal = filteredForKRA.reduce((a,b)=>a+(b.total||0),0);
  const kraProfit = filteredForKRA.reduce((a,b)=>a+(b.profit||0),0);
  const kraVat = kraTotal * 16 / 116;
  const kraExVat = kraTotal - kraVat;

  const downloadKRA_PDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica','bold'); doc.setFontSize(15);
    doc.text('CLUB MARINA - CHEBUNYO MAIN', 14, 14);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text('KRA PIN: P051234567A | Chebunyo, Bomet | Tel: 0700 000000', 14, 20);
    doc.text(`SALES REPORT FOR KRA - ${from} to ${to}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString('en-KE')} | Bills: ${filteredForKRA.length}`, 14, 31);
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(`TOTAL SALES VAT Incl: KES ${kraTotal.toFixed(2)}`, 14, 41);
    doc.text(`VAT 16%: KES ${kraVat.toFixed(2)}`, 14, 47);
    doc.text(`NET Ex-VAT: KES ${kraExVat.toFixed(2)}`, 100, 47);
    doc.text(`PROFIT: KES ${kraProfit.toFixed(2)}`, 14, 53);

    const rows = filteredForKRA.map((s:any,i:number)=>[
      i+1, s.id.slice(-6).toUpperCase(), s.tableName||'-', (s.waiterEmail||s.waiterName||'').split('@')[0],
      s.paymentMethod||'Cash', s.confirmedAt?.toDate?.()?.toLocaleString('en-KE')||s.createdAt?.toDate?.()?.toLocaleString('en-KE')||'-',
      `KES ${s.total}`, `KES ${s.profit||0}`
    ]);
    autoTable(doc,{
      startY:58,
      head:[['#','Receipt','Table','Waiter','Pay','Date','Total','Profit']],
      body:rows,
      styles:{fontSize:8},
      headStyles:{fillColor:[15,23,42]}
    });
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8); doc.setFont('helvetica','italic');
    doc.text('System generated - Club Marina MIS for KRA iTax. Powered by Marina POS',14,y);
    doc.text('Signature: __________________ Stamp: __________________ Date: __________',14,y+8);
    doc.save(`KRA_CLUB_MARINA_${from}_to_${to}_KES_${kraTotal}.pdf`);
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div>
          <h1 style={{fontWeight:800, fontSize:20}}>Sales Reports - Chebunyo</h1>
          <p style={{fontSize:11, color:'#94a3b8', marginTop:4}}>{sales.length} total bills • {pending.length} pending • {followUp.length} follow-up • Today: {todayStr}</p>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center', background:'white', padding:8, borderRadius:10, border:'1px solid #e2e8f0'}}>
          <label style={{fontSize:11,fontWeight:700}}>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:6,border:'1px solid #cbd5e1',borderRadius:6}}/></label>
          <label style={{fontSize:11,fontWeight:700}}>To <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:6,border:'1px solid #cbd5e1',borderRadius:6}}/></label>
          <button onClick={downloadKRA_PDF} style={{padding:'8px 14px', background:'#0f172a', color:'white', borderRadius:8, fontWeight:800, border:0, cursor:'pointer', fontSize:12}}>📄 KRA PDF ({filteredForKRA.length}) - KES {kraTotal.toLocaleString()}</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16}}>
        <div style={{background:'white', padding:14, borderRadius:12, border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:10, color:'#64748b', fontWeight:700}}>TODAY SALES (Completed Only)</div>
          <div style={{fontSize:22, fontWeight:800, marginTop:6}}>KES {todaySales.toLocaleString()}</div>
          <div style={{fontSize:11, color:'#64748b', marginTop:4}}>{todayCompleted.length} bills • Profit KES {todayProfit.toLocaleString()}</div>
        </div>
        <div style={{background:'white', padding:14, borderRadius:12, border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:10, color:'#64748b', fontWeight:700}}>TOTAL SALES (Completed)</div>
          <div style={{fontSize:22, fontWeight:800, marginTop:6}}>KES {totalSales.toLocaleString()}</div>
          <div style={{fontSize:11, color:'#64748b', marginTop:4}}>{allCompleted.length} bills</div>
        </div>
        <div style={{background: pending.length? '#fef3c7':'white', padding:14, borderRadius:12, border:'1px solid #fcd34d'}}>
          <div style={{fontSize:10, color:'#92400e', fontWeight:700}}>PENDING - At Cashier</div>
          <div style={{fontSize:22, fontWeight:800, marginTop:6}}>KES {pendingTotal.toLocaleString()}</div>
          <div style={{fontSize:11, color:'#92400e', marginTop:4}}>{pending.length} bills waiting confirmation</div>
        </div>
        <div style={{background: followUp.length? '#fee2e2':'#dcfce7', padding:14, borderRadius:12, border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:10, color: followUp.length?'#991b1b':'#166534', fontWeight:700}}>FOLLOW-UP / RETURNED</div>
          <div style={{fontSize:22, fontWeight:800, marginTop:6, color: followUp.length?'#dc2626':'#16a34a'}}>KES {followUp.reduce((a,b)=>a+(b.originalTotal||b.total||0),0).toLocaleString()}</div>
          <div style={{fontSize:11, marginTop:4}}>{followUp.length} bills need waiter action</div>
        </div>
      </div>

      <div style={{background:'white', borderRadius:12, padding:14, marginTop:16, border:'1px solid #e2e8f0'}}>
        <h3 style={{fontWeight:800, fontSize:13}}>Recent Bills</h3>
        <div style={{overflowX:'auto', marginTop:10}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
            <thead><tr style={{fontSize:10, color:'#64748b', textAlign:'left', borderBottom:'2px solid #f1f5f9'}}><th style={{padding:'8px'}}>Time</th><th>Table</th><th>Items</th><th>Total</th><th>Profit</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {recent.map((b:any)=>(
                <tr key={b.id} style={{borderBottom:'1px solid #f8fafc', background: b.status==='Pending'? '#fffbeb' : b.status==='FollowUp'? '#fef2f2' : 'white'}}>
                  <td style={{padding:'8px', fontSize:11}}>{b.createdAt?.toDate? b.createdAt.toDate().toLocaleString('en-KE') : new Date().toLocaleString()}</td>
                  <td style={{padding:'8px', fontWeight:700}}>{b.tableName}</td>
                  <td style={{padding:'8px'}}>{b.items?.map((i:any)=>`${i.name} x${i.qty}`).join(', ')}</td>
                  <td style={{padding:'8px', fontWeight:800}}>KES {b.total}</td>
                  <td style={{padding:'8px', color: (b.profit||0)>=0?'#16a34a':'#dc2626'}}>KES {b.profit}</td>
                  <td style={{padding:'8px'}}><span style={{padding:'2px 6px', borderRadius:4, fontSize:10, fontWeight:700, background: b.status==='Completed'?'#dcfce7': b.status==='Pending'?'#fef3c7':'#fee2e2', color: b.status==='Completed'?'#166534': b.status==='Pending'?'#92400e':'#991b1b'}}>{b.status}</span></td>
                  <td style={{padding:'8px'}}>{b.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{background:'#f1f5f9', padding:10, borderRadius:8, marginTop:12, fontSize:11, color:'#475569'}}>
        <b>Logic:</b> TODAY SALES = Only Completed bills. Pending bills don't add to sales until cashier confirms. PDF includes VAT 16% breakdown for KRA. From/To filter controls PDF.
      </div>
    </div>
  );
}