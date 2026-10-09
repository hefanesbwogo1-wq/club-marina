'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, getDoc, writeBatch, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { logAudit } from '@/lib/audit';

const TABLE_STATUS: any = {
  available: { bg:'#dcfce7', border:'#86efac', dot:'🟢', label:'Available', color:'#166534' },
  occupied: { bg:'#fee2e2', border:'#fca5a5', dot:'🔴', label:'Occupied', color:'#991b1b' },
  reserved: { bg:'#fef3c7', border:'#fcd34d', dot:'🟡', label:'Reserved', color:'#92400e' },
  payment_pending: { bg:'#dbeafe', border:'#93c5fd', dot:'🔵', label:'Pay Pending', color:'#1e40af' },
  cleaning: { bg:'#f1f5f9', border:'#cbd5e1', dot:'⚪', label:'Cleaning', color:'#475569' },
  closed: { bg:'#e2e8f0', border:'#94a3b8', dot:'✅', label:'Closed', color:'#334155' },
};

function ReceiptPrint({ order, branch }: any) {
  if (!order) return null;
  return (
    <div id="receipt-print" style={{ width: 300, background: 'white', color: 'black', padding: 12, fontSize: 12, fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed black', paddingBottom: 8, marginBottom: 8 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase' }}>{branch.name}</h1>
        <p style={{ fontSize: 11 }}>{branch.address} Tel: {branch.phone}</p>
        <p style={{ marginTop: 8, fontWeight: 800 }}>*** RECEIPT ***</p>
      </div>
      <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>No:</span><b>{order.id.slice(-6).toUpperCase()}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{new Date().toLocaleString('en-KE')}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Table:</span><b>{order.tableName}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Waiter:</span><span>{order.waiterName}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pay:</span><b>{order.paymentMethod || 'Cash'}</b></div>
      </div>
      <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>
      {order.items.map((it: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span><span>{it.qty}x{it.price}</span><span>{it.qty*it.price}</span></div>
      ))}
      <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}><span>TOTAL</span><span>KES {order.total}</span></div>
      {order.discount>0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span>Discount</span><span>-{order.discount}</span></div>}
      <div style={{ textAlign: 'center', fontSize: 10, marginTop: 12 }}>Karibu Tena! Club Marina<br/>Powered by Marina POS</div>
    </div>
  );
}

export default function POSPage() {
  const { appUser } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printer, setPrinter] = useState<any>({ type: null, name: '', char: null, device: null });
  const [isPrinting, setIsPrinting] = useState(false);
  const [managerPin, setManagerPin] = useState('1234');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [alertedIds, setAlertedIds] = useState<string[]>([]);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const role = (appUser?.role || '').toLowerCase();
  const isAdmin = role.includes('admin') || role.includes('manager') || ['super_admin','admin','manager'].includes(role);
  const isCashier = role.includes('cashier') || isAdmin;
  const isWaiter = role.includes('waiter') || isCashier || isAdmin;
  const canSell = isWaiter;
  const today = new Date().toDateString();
  const getMinStock = (p:any) => p.minStock?? p.min_stock?? 5;

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'tables'), orderBy('number','asc')), s => {
      const list = s.docs.map(d => ({ id: d.id,...d.data() })); list.sort((a:any,b:any)=>(a.number||0)-(b.number||0)); setTables(list);
    });
    const u2 = onSnapshot(collection(db, 'products'), s => setProducts(s.docs.map(d => ({ id: d.id,...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'sales'), where('status','==','Pending'), where('businessDay','==', today)), s => setPendingOrders(s.docs.map(d => ({ id: d.id,...d.data() }))));
    const u4 = onSnapshot(query(collection(db, 'sales'), where('status','==','FollowUp')), s => setFollowUps(s.docs.map(d => ({ id: d.id,...d.data() }))));
    const fetchPin = async () => { try { const snap = await getDoc(doc(db, 'settings', 'config')); if (snap.exists() && snap.data().managerPin) setManagerPin(String(snap.data().managerPin)); } catch {} };
    fetchPin();
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    const low = products.filter((p:any)=> p.stock <= getMinStock(p)); if(low.length===0) return;
    const newOnes = low.filter((p:any)=>!alertedIds.includes(p.id)); if(newOnes.length===0) return;
    try { const play=(f:number,d:number)=>setTimeout(()=>{ const ctx=new (window.AudioContext||(window as any).webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=f; g.gain.value=0.35; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); ctx.close(); },450); },d); play(880,0); play(1200,500); play(880,1000); } catch {}
    setAlertedIds(prev=>[...prev,...newOnes.map((p:any)=>p.id)]);
  }, [products]);

  const buildEscPos = (order: any) => {
    const ESC='\x1B', GS='\x1D', LF='\x0A'; let r=''; r+=ESC+'@'; r+=ESC+'a'+'\x01'+ESC+'!'+'\x10'+'CLUB MARINA\n'+ESC+'!'+'\x00'+'CHEBUNYO MAIN\n'; r+='--------------------------------\n'+ESC+'a'+'\x00'; r+=`Receipt: ${order.id.slice(-6).toUpperCase()}\nDate: ${new Date().toLocaleString('en-KE')}\nTable: ${order.tableName}\nWaiter: ${order.waiterName}\nPay: ${order.paymentMethod||'Cash'}\n`; r+='--------------------------------\nITEM QTY PRICE TOTAL\n--------------------------------\n'; order.items.forEach((it:any)=>{ const n=it.name.substring(0,13).padEnd(13); r+=`${n} ${String(it.qty).padStart(2)} ${String(it.price).padStart(5)} ${String(it.qty*it.price).padStart(6)}\n`; }); r+='--------------------------------\n'+ESC+'!'+'\x18'+`TOTAL KES ${order.total.toFixed(2)}\n`+ESC+'!'+'\x00'; if(order.discount>0) r+=`Discount: -${order.discount}\n`; r+='--------------------------------\n'+ESC+'a'+'\x01'+'Thank you! Karibu Tena!\n'+LF+LF+LF+GS+'V'+'\x41'+'\x03'; return new TextEncoder().encode(r);
  };
  const connectBT = async () => { try { // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb','battery_service'] }); const server = await device.gatt?.connect(); const services = await server?.getPrimaryServices(); let char:any=null; for(const svc of services||[]){ const chars=await svc.getCharacteristics(); if(chars[0]){ char=chars[0]; break; } } if(!char) throw new Error('No writable char'); setPrinter({ type:'bt', name:device.name, char, device }); alert(`BT Connected: ${device.name}`); } catch(e:any){ alert(`BT Error: ${e.message}`); } };
  const connectUSB = async () => { try { // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters: [] }); await device.open(); if(device.configuration===null) await device.selectConfiguration(1); await device.claimInterface(0); setPrinter({ type:'usb', name: device.productName||'USB Printer', device, char: device }); alert(`USB Connected: ${device.productName}`); } catch(e:any){ alert(`USB Error: ${e.message}`); } };
  const connectSerial = async () => { try { // @ts-ignore
      const port = await navigator.serial.requestPort(); await port.open({ baudRate: 9600 }); setPrinter({ type:'serial', name:'Serial Printer', device: port, char: port }); alert(`Serial Connected`); } catch(e:any){ alert(`Serial Error: ${e.message}`); } };
  const printEscPos = async (order: any) => { setIsPrinting(true); try { const data=buildEscPos(order); if(printer.type==='bt' && printer.char){ const chunk=100; for(let i=0;i<data.length;i+=chunk){ await printer.char.writeValue(data.slice(i,i+chunk)); await new Promise(r=>setTimeout(r,80)); } } else if(printer.type==='usb' && printer.device){ await printer.device.transferOut(1, data); } else if(printer.type==='serial' && printer.device?.writable){ const writer=printer.device.writable.getWriter(); await writer.write(data); writer.releaseLock(); } else { handleBrowserPrint(); } } catch{ handleBrowserPrint(); } setIsPrinting(false); };
  const handleBrowserPrint = () => { const content=document.getElementById('receipt-print'); if(!content) return; const win=window.open('', '_blank','width=320,height=700'); if(!win) return; win.document.write(`<html><head><style>@page{size:80mm auto;margin:0}body{margin:0;padding:8px;font-family:monospace;width:80mm}</style></head><body>${content.innerHTML}</body></html>`); win.document.close(); win.focus(); setTimeout(()=>{ win.print(); win.close(); },600); };

  const addToCart = (p:any)=>{
    if(!canSell) return alert('Only Waiter can serve!');
    if(p.stock<=0) return alert('Out of stock!');
    const existing = cart.find(c=>c.id===p.id);
    if(existing && existing.qty+1 > p.stock) return alert(`Only ${p.stock} in stock!`);
    if(existing) setCart(cart.map(c=>c.id===p.id?{...c,qty:c.qty+1}:c));
    else setCart([...cart,{...p,qty:1}]);
  };
  const incQty = (id:string)=>{ const p=products.find(x=>x.id===id); const c=cart.find(x=>x.id===id); if(p && c.qty+1 > p.stock) return alert(`Only ${p.stock} stock`); setCart(cart.map(x=>x.id===id?{...x,qty:x.qty+1}:x)); };
  const decQty = (id:string)=>{ setCart(cart.map(x=>x.id===id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0)); };

  const selectTable = async(t:any)=>{
    if(!canSell &&!selectedPending) return alert('Cashier: select PENDING bill only');
    if(t.status==='cleaning') return alert(`${t.name} is Cleaning ⚪`);
    if(t.status==='closed') return alert(`${t.name} is Closed ✅`);
    setSelectedTable(t);
  };

  const setTableStatus = async (t:any, status:string) => {
    if(!isWaiter) return alert('Only waiter');
    if(status==='available' && t.status!=='available'){ if(!confirm(`Set ${t.name} to Available 🟢?`)) return; }
    try {
      await updateDoc(doc(db,'tables',t.id),{
        status, updatedBy: appUser?.email, updatedAt: serverTimestamp(),
      ...(status==='occupied'? {occupiedBy: appUser?.email, occupiedAt: serverTimestamp()} : {}),
      ...(status==='available'? {occupiedBy:null, freedBy: appUser?.email, freedAt: serverTimestamp()} : {}),
      });
      if(selectedTable?.id===t.id) setSelectedTable({...t, status});
      // AUDIT - WHO did it? WHEN? WHAT?
      await logAudit({ action: `TABLE_${status.toUpperCase()}`, actorEmail: appUser?.email||'', actorRole: role, targetId: t.id, tableName: t.name, details: `${(appUser?.email||'').split('@')[0]} ${status} ${t.name} ${status==='occupied'?'opened':''}`, amount: 0 });
    } catch(e:any){ alert(e.message); }
  };

  const subtotal = cart.reduce((s,i)=>s+i.sellingPrice*i.qty,0);
  const total = Math.max(0, subtotal - discount);
  const isPayDisabled = cart.length===0 ||!selectedTable || total<=0 || isPrinting;

  const payAndSendToCashier = async () => {
    if(!canSell) return alert('Only Waiter can PAY!');
    if(!selectedTable) return alert('Select Table');
    if(cart.length===0) return alert('Cart empty');
    if(total <= 0) return alert('Total 0!');
    if(discount>0 && subtotal>0 && discount > subtotal * 0.2 &&!isAdmin){ setPinError(''); setPinInput(''); setShowPinModal(true); return; }
    const profit = cart.reduce((s,i)=>s+(i.sellingPrice-i.buyingPrice)*i.qty,0)-discount;
    if(profit < 0 &&!isAdmin) { if(!confirm(`WARNING: Below cost! Profit KES ${profit}. Continue?`)) return; setPinError(''); setPinInput(''); setShowPinModal(true); return; }
    const orderData={
      tableId:selectedTable.id, tableName:selectedTable.name,
      items:cart.map(c=>({productId:c.id,name:c.name,qty:c.qty,price:c.sellingPrice,buy:c.buyingPrice})),
      subtotal,discount,total,profit,
      paymentMethod:'Pending', branchId:'chebunyo_main',
      waiterId:appUser?.uid, waiterEmail:appUser?.email, waiterName:(appUser as any)?.name||appUser?.email,
      status:'Pending', createdAt:serverTimestamp(), businessDay: today
    };
    try {
      const ref = await addDoc(collection(db,'sales'),orderData);
      try{ await updateDoc(doc(db,'tables',selectedTable.id),{status:'payment_pending', occupiedBy: appUser?.email, occupiedAt: serverTimestamp()}); }catch{}
      // AUDIT + LIVE FEED
      await logAudit({ action:'ORDER_SUBMITTED', actorEmail: appUser?.email||'', actorRole: role, targetId: ref.id, tableName: selectedTable.name, details: `${(appUser?.email||'').split('@')[0]} submitted order #${ref.id.slice(-4)} - ${selectedTable.name} KES ${total} - ${cart.length} items`, amount: total });
      await logAudit({ action:'TABLE_OPENED', actorEmail: appUser?.email||'', actorRole: role, targetId: selectedTable.id, tableName: selectedTable.name, details: `${(appUser?.email||'').split('@')[0]} opened ${selectedTable.name}`, amount: 0 });
      alert(`✅ PAY sent to cashier: ${selectedTable.name} - KES ${total} → 🔵 Payment Pending`);
      setCart([]); setDiscount(0);
    } catch(e:any){ alert(`Error: ${e.message}`); }
  };

  const confirmPayment = async () => {
    if(!selectedPending) return;
    if(!isCashier) return alert('Only Cashier can confirm!');
    setIsPrinting(true);
    try {
      const pending = selectedPending;
      const batch=writeBatch(db);
      for(const item of pending.items){ const ref=doc(db,'products',item.productId); const snap=await getDoc(ref); if(snap.exists()){ const prev=snap.data().stock; const now=prev-item.qty; if(now<0) throw new Error(`Low stock ${item.name}: ${prev} left`); batch.update(ref,{stock:now}); const movRef=doc(collection(db,'inventoryMovements')); batch.set(movRef,{productId:item.productId,productName:item.name,movementType:'Sale',previousQty:prev,newQty:now,qty:-item.qty,user:appUser?.email,createdAt:serverTimestamp(),reference:`Sale-${pending.tableName}`,branchId:'chebunyo_main'}); } }
      await batch.commit();
      await updateDoc(doc(db,'sales',pending.id),{ status:'Completed', paymentMethod, cashier:appUser?.email, cashierId:appUser?.uid, confirmedAt:serverTimestamp(), total: pending.total, profit: pending.profit });
      await updateDoc(doc(db,'tables',pending.tableId),{status:'occupied'});
      await addDoc(collection(db,'payments'),{saleId:pending.id,saleTable:pending.tableName,amount:pending.total,method:paymentMethod,waiter:pending.waiterEmail,cashier:appUser?.email,createdAt:serverTimestamp(), received: true});
      // AUDIT - PAYMENT RECORDED + SALE COMPLETED + STOCK DEDUCTED
      await logAudit({ action:'PAYMENT_RECORDED', actorEmail: appUser?.email||'', actorRole: role, targetId: pending.id, tableName: pending.tableName, details: `${(appUser?.email||'').split('@')[0]} recorded KES ${pending.total} ${paymentMethod} - Table ${pending.tableName} - Waiter ${pending.waiterEmail?.split('@')[0]}`, amount: pending.total });
      await logAudit({ action:'SALE_COMPLETED', actorEmail: pending.waiterEmail||'', actorRole: 'waiter', targetId: pending.id, tableName: pending.tableName, details: `Order #${pending.id.slice(-4)} completed - ${pending.tableName} KES ${pending.total} - ${paymentMethod} - Cashier ${appUser?.email?.split('@')[0]}`, amount: pending.total });
      for(const it of pending.items){ await logAudit({ action:'STOCK_DEDUCTED', actorEmail: appUser?.email||'', actorRole: role, targetId: it.productId, tableName: pending.tableName, details: `Sold ${it.qty} x ${it.name} - Table ${pending.tableName} - Order #${pending.id.slice(-4)}`, amount: it.qty }); }
      const receiptOrder={...pending, paymentMethod, id:pending.id}; setLastOrder(receiptOrder); setShowReceipt(true);
      setTimeout(()=>{ if(printer.type) printEscPos(receiptOrder); else handleBrowserPrint(); },400);
      setSelectedPending(null);
    } catch(e:any){ alert(`Error: ${e.message}`); }
    setIsPrinting(false);
  };

  // VOID REQUEST - WAITER CANNOT SILENTLY VOID
  const requestVoid = async () => {
    if(!selectedPending) return;
    if(!voidReason.trim()) return alert('Enter reason!');
    try{
      await addDoc(collection(db,'voidRequests'),{
        saleId: selectedPending.id, tableName: selectedPending.tableName, amount: selectedPending.total,
        reason: voidReason, waiterEmail: appUser?.email, status:'pending', createdAt: serverTimestamp(), businessDay: today
      });
      await logAudit({ action:'VOID_REQUESTED', actorEmail: appUser?.email||'', actorRole: role, targetId: selectedPending.id, tableName: selectedPending.tableName, details: `${(appUser?.email||'').split('@')[0]} requested void KES ${selectedPending.total} - ${selectedPending.tableName} Reason: ${voidReason}`, amount: selectedPending.total });
      alert(`Void request sent to manager - ${selectedPending.tableName} KES ${selectedPending.total}`);
      setShowVoidModal(false); setVoidReason(''); setSelectedPending(null);
    }catch(e:any){ alert(e.message); }
  };

  const markAsNotReceived = async () => {
    if(!selectedPending) return;
    if(!followUpNote.trim()) return alert('Write note!');
    try {
      await updateDoc(doc(db,'sales',selectedPending.id),{
        status:'FollowUp', followUpNote: followUpNote, followUpBy: appUser?.email,
        followUpFor: selectedPending.waiterEmail, followUpForId: selectedPending.waiterId,
        followUpAt: serverTimestamp(), paymentMethod, cashier: appUser?.email, originalTotal: selectedPending.total
      });
      await addDoc(collection(db,'payments'),{ saleId:selectedPending.id, saleTable:selectedPending.tableName, amount:selectedPending.total, method:paymentMethod, waiter:selectedPending.waiterEmail, cashier:appUser?.email, note: followUpNote, createdAt:serverTimestamp(), received: false, status:'FollowUp' });
      await logAudit({ action:'PAYMENT_NOT_RECEIVED', actorEmail: appUser?.email||'', actorRole: role, targetId: selectedPending.id, tableName: selectedPending.tableName, details: `${(appUser?.email||'').split('@')[0]} marked NOT RECEIVED Table ${selectedPending.tableName} KES ${selectedPending.total} - ${followUpNote}`, amount: selectedPending.total });
      alert(`⚠️ Returned to Waiter: ${selectedPending.waiterEmail}`);
      setShowFollowUpModal(false); setFollowUpNote(''); setSelectedPending(null);
    } catch(e:any){ alert(e.message); }
  };

  const resolveFollowUpNow = async (o:any) => {
    if(!o) return;
    if(!confirm(`Resolve ${o.tableName} KES ${o.originalTotal||o.total} as PAID?`)) return;
    setResolvingId(o.id);
    try {
      const batch=writeBatch(db);
      for(const item of o.items){ const ref=doc(db,'products',item.productId); const snap=await getDoc(ref); if(snap.exists()){ const prev=snap.data().stock; const now=prev - item.qty; if(now<0) throw new Error(`Low stock ${item.name}: only ${prev} left`); batch.update(ref,{stock:now}); const movRef=doc(collection(db,'inventoryMovements')); batch.set(movRef,{productId:item.productId,productName:item.name,movementType:'Sale',previousQty:prev,newQty:now,qty:-item.qty,user:appUser?.email,createdAt:serverTimestamp(),reference:`FollowUp-Resolved-${o.tableName}`,branchId:'chebunyo_main'}); } }
      await batch.commit();
      await updateDoc(doc(db,'sales',o.id),{ status:'Completed', paymentMethod: o.paymentMethod || 'Cash', resolvedByWaiter: appUser?.email, resolvedAt: serverTimestamp(), confirmedAt: serverTimestamp(), cashier: appUser?.email });
      await addDoc(collection(db,'payments'),{saleId:o.id,saleTable:o.tableName,amount:o.originalTotal||o.total,method:o.paymentMethod||'Cash',waiter:o.waiterEmail,cashier:appUser?.email,createdAt:serverTimestamp(), received:true, status:'Completed', note:'FollowUp resolved'});
      await logAudit({ action:'FOLLOWUP_RESOLVED', actorEmail: appUser?.email||'', actorRole: role, targetId: o.id, tableName: o.tableName, details: `${(appUser?.email||'').split('@')[0]} resolved follow-up ${o.tableName} KES ${o.originalTotal||o.total} as PAID`, amount: o.originalTotal||o.total });
      alert(`✅ Resolved! Table ${o.tableName} still OCCUPIED`);
    } catch(e:any){ alert(e.message); }
    setResolvingId(null);
  };

  const confirmPin = async () => { if(pinInput === managerPin){ setShowPinModal(false); setPinInput(''); await payAndSendToCashier(); } else { setPinError(`Wrong PIN!`); } };

  const filtered=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const myFollowUps = followUps.filter((f:any)=> f.followUpFor===appUser?.email || f.followUpForId===appUser?.uid || f.waiterEmail===appUser?.email || f.waiterId===appUser?.uid || isAdmin || isCashier);
  const lowStockList = products.filter((p:any)=> p.stock <= getMinStock(p));

  return (
    <>
    <style>{`
.pos-wrapper { display: grid; grid-template-columns: 280px 1fr 380px; gap: 10px; height: calc(100vh - 80px); }
.pos-left,.pos-middle,.pos-right { background: white; border-radius: 12px; padding: 12px; overflow-y: auto; border: 1px solid #e2e8f0; }
.pos-right { display: flex; flex-direction: column; }
.products-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
.tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
   @media (max-width: 1100px) {.pos-wrapper { grid-template-columns: 200px 1fr 340px; }.products-grid { grid-template-columns: repeat(2,1fr); } }
   @media (max-width: 768px) {.pos-wrapper { grid-template-columns: 1fr; height: auto; gap: 12px; }.pos-left { order: 3; }.pos-middle { order: 2; max-height: 60vh; }.pos-right { order: 1; }.tables-grid { grid-template-columns: repeat(3,1fr); } }
    `}</style>

    <div className="pos-wrapper">
      <div className="pos-left">
        <h3 style={{fontWeight:800, fontSize:14}}>Tables - 12 Tables</h3>
        <div style={{display:'flex', gap:4, flexWrap:'wrap', marginTop:6, fontSize:9}}>
          <span style={{background:'#dcfce7', padding:'2px 6px', borderRadius:10}}>🟢 Available {tables.filter((t:any)=>t.status==='available').length}</span>
          <span style={{background:'#fee2e2', padding:'2px 6px', borderRadius:10}}>🔴 Occupied {tables.filter((t:any)=>t.status==='occupied').length}</span>
          <span style={{background:'#dbeafe', padding:'2px 6px', borderRadius:10}}>🔵 PayPend {tables.filter((t:any)=>t.status==='payment_pending').length}</span>
        </div>
        {!canSell && <div style={{background:'#fee2e2', padding:8, borderRadius:8, fontSize:11, fontWeight:700, color:'#991b1b', marginTop:8, textAlign:'center'}}>CASHIER VIEW - Confirm Only</div>}
        {(isCashier) && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
          <button onClick={connectBT} style={{padding:8,background:printer.type==='bt'?'#dcfce7':'#eff6ff',border:'1px solid #cbd5e1',borderRadius:8,fontSize:11,fontWeight:700}}>BT Printer</button>
          <button onClick={connectUSB} style={{padding:8,background:printer.type==='usb'?'#dcfce7':'#fef3c7',border:'1px solid #cbd5e1',borderRadius:8,fontSize:11,fontWeight:700}}>USB Printer</button>
          <button onClick={connectSerial} style={{padding:8,background:printer.type==='serial'?'#dcfce7':'#f3e8ff',border:'1px solid #cbd5e1',borderRadius:8,fontSize:11,fontWeight:700}}>Serial</button>
          <div style={{fontSize:10,color:printer.type?'#16a34a':'#94a3b8',textAlign:'center'}}>{printer.type?`✅ ${printer.type.toUpperCase()} Ready`:'No printer'}</div>
        </div>
        )}
        {pendingOrders.length>0 && (
          <div style={{marginTop:12, background:'#fef3c7', padding:8, borderRadius:8, border:'1px solid #fcd34d'}}>
            <h4 style={{fontWeight:800, fontSize:11}}>⏳ PENDING TODAY ({pendingOrders.length})</h4>
            {pendingOrders.map(o=>(
              <div key={o.id} onClick={()=>setSelectedPending(o)} style={{padding:8,marginTop:6,background:selectedPending?.id===o.id?'#0f172a':'white',color:selectedPending?.id===o.id?'white':'black',borderRadius:6,cursor:'pointer',fontSize:11, fontWeight:700}}>
                {o.tableName} - KES {o.total} <div style={{fontSize:9, fontWeight:400}}>{o.waiterEmail?.split('@')[0]}</div>
              </div>
            ))}
          </div>
        )}
        {myFollowUps.length>0 && (
          <div style={{marginTop:12, background:'#fee2e2', padding:8, borderRadius:8, border:'1px solid #fca5a5'}}>
            <h4 style={{fontWeight:800, fontSize:11, color:'#991b1b'}}>⚠️ FOLLOW-UP ({myFollowUps.length})</h4>
            {myFollowUps.map((o:any)=>(
              <div key={o.id} style={{padding:8,marginTop:6,background:'white',borderRadius:8,fontSize:10, border:'1px solid #fecaca'}}>
                <div style={{fontWeight:800, fontSize:11}}>{o.tableName} KES {o.originalTotal||o.total}</div>
                <div style={{fontSize:9, color:'#64748b'}}>{o.waiterEmail?.split('@')[0]} • {o.paymentMethod}</div>
                <div style={{fontSize:9, color:'#dc2626', marginTop:4}}>{o.followUpNote?.slice(0,80)}</div>
                <div style={{display:'flex', gap:6, marginTop:8}}>
                  <button onClick={()=>resolveFollowUpNow(o)} disabled={resolvingId===o.id} style={{flex:1, background: resolvingId===o.id?'#94a3b8':'#16a34a', color:'white', border:0, padding:'8px 6px', borderRadius:6, fontWeight:800, fontSize:11, cursor:'pointer'}}>
                    {resolvingId===o.id? '...' : '✅ PAID NOW'}
                  </button>
                  <button onClick={()=>setSelectedTable(tables.find((t:any)=>t.id===o.tableId) || null)} style={{background:'#f1f5f9', border:'1px solid #cbd5e1', padding:'8px 8px', borderRadius:6, fontWeight:700, fontSize:10}}>View</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="tables-grid">
          {tables.map(t=>{
            const st = TABLE_STATUS[t.status] || TABLE_STATUS.available;
            const isSelected = selectedTable?.id===t.id;
            return (
            <div key={t.id} style={{padding:8,borderRadius:10, background: isSelected?'#0f172a' : st.bg, color: isSelected?'white':'black', textAlign:'center',fontWeight:700, fontSize:11, border: `2px solid ${isSelected?'#0f172a': st.border}`, cursor:'pointer'}}>
              <div onClick={()=>selectTable(t)} style={{cursor:'pointer', padding:4}}>
                <div style={{fontSize:12, fontWeight:800}}>{st.dot} {t.name}</div>
                <div style={{fontSize:8, marginTop:2, color: isSelected?'#cbd5e1': st.color, fontWeight:700}}>{st.label.toUpperCase()}</div>
                <div style={{fontSize:8, color:'#64748b'}}>{t.seats||4} seats</div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, marginTop:6}}>
                {t.status!=='occupied' && <button onClick={()=>setTableStatus(t,'occupied')} style={{background:'#0f172a', color:'white', border:0, borderRadius:5, padding:'4px 2px', fontSize:8, fontWeight:800, cursor:'pointer'}}>OCCUPY</button>}
                {t.status!=='available' && <button onClick={()=>setTableStatus(t,'available')} style={{background:'#16a34a', color:'white', border:0, borderRadius:5, padding:'4px 2px', fontSize:8, fontWeight:800, cursor:'pointer'}}>FREE</button>}
                {t.status!=='reserved' && <button onClick={()=>setTableStatus(t,'reserved')} style={{background:'#d97706', color:'white', border:0, borderRadius:5, padding:'4px 2px', fontSize:8, fontWeight:800, cursor:'pointer'}}>RESERVE</button>}
                {t.status!=='cleaning' && <button onClick={()=>setTableStatus(t,'cleaning')} style={{background:'#64748b', color:'white', border:0, borderRadius:5, padding:'4px 2px', fontSize:8, fontWeight:800, cursor:'pointer'}}>CLEAN</button>}
              </div>
            </div>
          )})}
        </div>
      </div>
      <div className="pos-middle" style={{opacity: canSell? 1 : 0.6}}>
        {lowStockList.length>0 && (
          <div style={{background:'#fee2e2', border:'2px solid #ef4444', padding:8, borderRadius:10, marginBottom:10}}>
            <div style={{fontWeight:900, fontSize:12, color:'#991b1b'}}>🔊 MIN STOCK ALERT - ORDER NOW! ({lowStockList.length})</div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
              {lowStockList.slice(0,8).map((p:any)=>(
                <span key={p.id} style={{background: p.stock===0?'#991b1b':'white', color: p.stock===0?'white':'#991b1b', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, border:'1px solid #fca5a5'}}>
                  {p.name}: {p.stock}/{getMinStock(p)}
                </span>
              ))}
            </div>
          </div>
        )}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search 168 products..." style={{width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginBottom:10, fontSize:13}}/>
        <div className="products-grid">
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>addToCart(p)} style={{border: p.stock <= getMinStock(p)? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius:10,padding:8,cursor:'pointer', opacity: p.stock<=0?0.4:1, background: p.stock <= getMinStock(p)? '#fef2f2' : 'white'}}>
              <div style={{fontWeight:700,fontSize:11, lineHeight:1.2}}>{p.name} {p.stock <= getMinStock(p) && '⚠️'}</div>
              <div style={{fontSize:9,color: p.stock <= getMinStock(p)? '#dc2626' : p.stock < 10? '#d97706' : '#64748b', fontWeight: p.stock <= getMinStock(p)? '800':'400', marginTop:3}}>{`Stock:${p.stock} / Min:${getMinStock(p)}`}</div>
              <div style={{fontWeight:800,color:'#16a34a', fontSize:11, marginTop:2}}>KES {p.sellingPrice}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="pos-right">
        <h3 style={{fontWeight:800, fontSize:13}}>
          {selectedPending? `Confirm: ${selectedPending.tableName} - KES ${selectedPending.total}` : `Bill - ${selectedTable?.name||'Select Table'} ${selectedTable? TABLE_STATUS[selectedTable.status]?.dot : '⚪'}`}
        </h3>
        {selectedPending? (
          <div style={{flex:1,marginTop:10,overflowY:'auto'}}>
            {selectedPending.items.map((c:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}><span>{c.name} x{c.qty}</span><span>KES {c.price*c.qty}</span></div>)}
            <div style={{marginTop:10, padding:8, background:'#f8fafc', borderRadius:6, fontSize:11}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Waiter:</span><b>{selectedPending.waiterEmail?.split('@')[0]}</b></div>
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:800}}><span>Total:</span><span>KES {selectedPending.total}</span></div>
            </div>
            <button onClick={()=>setSelectedPending(null)} style={{marginTop:8,fontSize:11,color:'#64748b', background:'none', border:0, cursor:'pointer', textDecoration:'underline'}}>← Back</button>
          </div>
        ) : (
          <div style={{flex:1,marginTop:10,overflowY:'auto'}}>
            {cart.map((c,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
              <span style={{flex:1, fontSize:11}}>{c.name} x{c.qty}</span>
              <div style={{display:'flex',gap:4,alignItems:'center'}}>
                <button onClick={()=>decQty(c.id)} style={{width:22,height:22,borderRadius:4,border:'1px solid #cbd5e1',background:'white'}}> - </button>
                <button onClick={()=>incQty(c.id)} style={{width:22,height:22,borderRadius:4,border:'1px solid #cbd5e1',background:'white'}}> + </button>
              </div>
              <span style={{width:70,textAlign:'right'}}>KES {c.sellingPrice*c.qty}</span>
            </div>)}
            {cart.length===0 && <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Cart empty - add products<br/><span style={{fontSize:10}}>12 Tables Ready</span></div>}
          </div>
        )}
        <div style={{borderTop:'2px dashed #cbd5e1',paddingTop:10,marginTop:10}}>
          {!selectedPending && (
            <>
              <div style={{display:'flex',justifyContent:'space-between', fontSize:13}}><span>Subtotal</span><span>KES {subtotal}</span></div>
              <input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value))} placeholder="Discount KES" style={{width:'100%',padding:8,border:'1px solid #cbd5e1',borderRadius:6,margin:'8px 0', fontSize:13}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}><span>Total</span><span>KES {total}</span></div>
            </>
          )}
          {selectedPending && (
            <>
              <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} style={{width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginTop:8, fontSize:13}}>
                <option value="Cash">Cash</option><option value="M-Pesa Till">M-Pesa Till</option><option value="M-Pesa Paybill">M-Pesa Paybill</option><option value="Bank">Bank / Card</option><option value="Credit">Credit</option>
              </select>
              <button onClick={confirmPayment} disabled={isPrinting} style={{width:'100%',padding:14,background:'#16a34a',color:'white',border:0,borderRadius:8,fontWeight:800,marginTop:10,cursor:'pointer', fontSize:14}}>
                {isPrinting? 'Processing...' : `✅ CONFIRM - KES ${selectedPending.total} - ${paymentMethod}`}
              </button>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8}}>
                <button onClick={()=>setShowVoidModal(true)} style={{padding:12,background:'white',color:'#dc2626',border:'2px solid #fca5a5',borderRadius:8,fontWeight:700,cursor:'pointer', fontSize:11}}>🗑️ VOID REQUEST</button>
                <button onClick={()=>{ setFollowUpNote(`Payment ${paymentMethod} not received. Table ${selectedPending.tableName} KES ${selectedPending.total}. Waiter: ${selectedPending.waiterEmail}`); setShowFollowUpModal(true); }} style={{padding:12,background:'white',color:'#d97706',border:'2px solid #fcd34d',borderRadius:8,fontWeight:700,cursor:'pointer', fontSize:11}}>❌ NOT RECEIVED</button>
              </div>
            </>
          )}
          {!selectedPending && (
            <>
              <button onClick={payAndSendToCashier} disabled={isPayDisabled} style={{width:'100%',padding:14,background: isPayDisabled? '#94a3b8' : '#0f172a',color:'white',border:0,borderRadius:8,fontWeight:800,marginTop:10,cursor: isPayDisabled? 'not-allowed' : 'pointer', fontSize:14}}>
                {!selectedTable? 'Select Table First (1-12)' : cart.length===0? 'Cart Empty' : `PAY - KES ${total} → Cashier`}
              </button>
              {selectedTable && (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8}}>
                  <button onClick={()=>setTableStatus(selectedTable,'available')} style={{padding:10,background:'#dcfce7',color:'#166534',border:'1px solid #86efac',borderRadius:8,fontWeight:800,fontSize:11, cursor:'pointer'}}>🟢 FREE → Available</button>
                  <button onClick={()=>setTableStatus(selectedTable,'cleaning')} style={{padding:10,background:'#f1f5f9',color:'#475569',border:'1px solid #cbd5e1',borderRadius:8,fontWeight:800,fontSize:11, cursor:'pointer'}}>⚪ Cleaning</button>
                </div>
              )}
            </>
          )}
          {lastOrder&&<div style={{display:'flex',gap:8,marginTop:8}}><button onClick={()=>printEscPos(lastOrder)} style={{flex:1,background:'#2563eb',color:'white',padding:8,borderRadius:6,fontSize:11,fontWeight:700,border:0}}>DIRECT PRINT</button><button onClick={handleBrowserPrint} style={{flex:1,background:'#f1f5f9',padding:8,borderRadius:6,fontSize:11,fontWeight:700,border:0}}>BROWSER PRINT</button></div>}
        </div>
      </div>
    </div>
      {showVoidModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{fontWeight:800,fontSize:16, color:'#991b1b'}}>VOID REQUEST - Manager Approval Required</h3>
            <p style={{fontSize:11,color:'#64748b',margin:'8px 0'}}>Bill: {selectedPending?.tableName} - KES {selectedPending?.total} - Waiter: {selectedPending?.waiterEmail?.split('@')[0]}</p>
            <p style={{fontSize:10, background:'#fef2f2', padding:8, borderRadius:6, border:'1px solid #fecaca'}}>Rule: Waiter cannot silently cancel completed sale. Flow: Request → Reason → Manager Approval → Audit Record + stock restored</p>
            <textarea value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Reason - e.g. Customer cancelled, wrong order, etc - REQUIRED" style={{width:'100%',padding:12,border:'2px solid #fca5a5',borderRadius:10,fontSize:13,minHeight:100, marginTop:10}} autoFocus/>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setShowVoidModal(false)} style={{flex:1,padding:12,background:'#f1f5f9',borderRadius:10,fontWeight:700,border:0}}>Cancel</button>
              <button onClick={requestVoid} style={{flex:1,padding:12,background:'#dc2626',color:'white',borderRadius:10,fontWeight:700,border:0}}>Send Void Request</button>
            </div>
          </div>
        </div>
      )}
      {showFollowUpModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:420}}>
            <h3 style={{fontWeight:800,fontSize:16, color:'#991b1b'}}>Return to Waiter - Follow Up</h3>
            <p style={{fontSize:11,color:'#64748b',margin:'8px 0'}}>Bill: {selectedPending?.tableName} - KES {selectedPending?.total}</p>
            <textarea value={followUpNote} onChange={e=>setFollowUpNote(e.target.value)} placeholder="Reason e.g. M-Pesa not received, client left..." style={{width:'100%',padding:12,border:'2px solid #fca5a5',borderRadius:10,fontSize:13,minHeight:100, marginTop:10}} autoFocus/>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setShowFollowUpModal(false)} style={{flex:1,padding:12,background:'#f1f5f9',borderRadius:10,fontWeight:700,border:0}}>Cancel</button>
              <button onClick={markAsNotReceived} style={{flex:1,padding:12,background:'#dc2626',color:'white',borderRadius:10,fontWeight:700,border:0}}>Return → Waiter</button>
            </div>
          </div>
        </div>
      )}
      {showPinModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, padding:16}}>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:340}}>
            <h3 style={{fontWeight:800,fontSize:18}}>Manager Approval Required</h3>
            <p style={{fontSize:12,color:'#64748b',margin:'8px 0'}}>{'Discount >20% or Below Cost Sale - WHO, WHEN, WHAT, HOW MUCH logged'}</p>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Enter Manager PIN" autoFocus style={{width:'100%',padding:12,border:'2px solid #0f172a',borderRadius:10,fontSize:18,textAlign:'center',letterSpacing:4}}/>
            {pinError && <div style={{color:'#dc2626',fontSize:12,marginTop:8,fontWeight:600}}>{pinError}</div>}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setShowPinModal(false)} style={{flex:1,padding:12,background:'#f1f5f9',borderRadius:10,fontWeight:700,border:0}}>Cancel</button>
              <button onClick={confirmPin} style={{flex:1,padding:12,background:'#0f172a',color:'white',borderRadius:10,fontWeight:700,border:0}}>Approve</button>
            </div>
          </div>
        </div>
      )}
      {showReceipt&&lastOrder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999, padding:16}}>
          <div style={{background:'white',borderRadius:12,padding:16,maxHeight:'90vh',overflowY:'auto', width:'100%', maxWidth:360}}>
            <ReceiptPrint order={lastOrder} branch={{name:'CLUB MARINA - CHEBUNYO MAIN',phone:'0700 000000',address:'Chebunyo, Bomet',pin:'P051234567A'}}/>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={()=>printEscPos(lastOrder)} style={{flex:1,background:'#2563eb',color:'white',padding:12,borderRadius:8,fontWeight:700,border:0}}>DIRECT PRINT</button>
              <button onClick={handleBrowserPrint} style={{flex:1,background:'#0f172a',color:'white',padding:12,borderRadius:8,fontWeight:700,border:0}}>BROWSER PRINT</button>
            </div>
            <button onClick={()=>setShowReceipt(false)} style={{width:'100%',marginTop:8,background:'#f1f5f9',padding:10,borderRadius:8,border:0}}>Close</button>
          </div>
        </div>
      )}
      <div style={{position:'absolute',left:'-9999px', top:0}}><div id="receipt-print">{lastOrder&&<ReceiptPrint order={lastOrder} branch={{name:'CLUB MARINA - CHEBUNYO MAIN',phone:'0700 000000',address:'Chebunyo',pin:'P051234567A'}}/>}</div></div>
    </>
  );
}