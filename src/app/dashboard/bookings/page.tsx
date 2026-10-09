'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const STATUSES = ['Pending','Confirmed','Checked In','Completed','Cancelled'];

export default function BookingsPage(){
  const { appUser } = useAuth();
  const [list,setList]=useState<any[]>([]); const [tables,setTables]=useState<any[]>([]); const [customer,setCustomer]=useState(''); const [phone,setPhone]=useState(''); const [table,setTable]=useState(''); const [guests,setGuests]=useState(4); const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [deposit,setDeposit]=useState(0); const [notes,setNotes]=useState('');
  useEffect(()=>{
    onSnapshot(query(collection(db,'vipBookings'), orderBy('createdAt','desc')), s=>setList(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,'tables'), s=>setTables(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);
  const save=async(e:any)=>{
    e.preventDefault();
    await addDoc(collection(db,'vipBookings'),{customerName:customer,phone,table,date,time:'20:00',guests:Number(guests),package:'VIP',deposit:Number(deposit),balance:5000-Number(deposit),assignedStaff:appUser?.email,specialRequests:notes,bookingStatus:'Pending',createdAt:serverTimestamp(),branchId:'chebunyo_main',createdBy:appUser?.email});
    setCustomer(''); setPhone(''); setNotes('');
  };
  return <div><h1 style={{fontSize:22,fontWeight:800}}>VIP Bookings - Spec 49</h1>
  <form onSubmit={save} style={{background:'white',padding:16,borderRadius:12,display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
    <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer Name" required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,flex:1}}/>
    <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
    <select value={table} onChange={e=>setTable(e.target.value)} required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}><option value="">Table - Spec 49</option>{tables.map((t:any)=><option key={t.id} value={t.name}>{t.name} - {t.status}</option>)}</select>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
    <input type="number" value={guests} onChange={e=>setGuests(Number(e.target.value))} placeholder="Guests" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:80}}/>
    <input type="number" value={deposit} onChange={e=>setDeposit(Number(e.target.value))} placeholder="Deposit KES" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,width:110}}/>
    <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Special requests" style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,flex:1}}/>
    <button style={{padding:'10px 20px',background:'#7c3aed',color:'white',border:0,borderRadius:8}}>Book VIP</button>
  </form>
  <div style={{background:'white',marginTop:16,borderRadius:12,overflow:'hidden'}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr style={{background:'#f8fafc'}}><th style={{padding:10,textAlign:'left'}}>Date</th><th>Customer</th><th>Phone</th><th>Table</th><th>Guests</th><th>Deposit</th><th>Status - Spec 49</th><th>Action</th></tr></thead><tbody>{list.map((b:any)=><tr key={b.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:10}}>{b.date}</td><td>{b.customerName}</td><td>{b.phone}</td><td>{b.table}</td><td>{b.guests}</td><td>KES {b.deposit}</td><td><span style={{padding:'2px 8px',borderRadius:12,background:b.bookingStatus==='Confirmed'?'#dcfce7':'#fef3c7',fontSize:11}}>{b.bookingStatus}</span></td><td><select value={b.bookingStatus} onChange={e=>updateDoc(doc(db,'vipBookings',b.id),{bookingStatus:e.target.value})} style={{padding:4,borderRadius:6,border:'1px solid #cbd5e1',fontSize:11}}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div></div>
}