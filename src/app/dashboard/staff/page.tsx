"use client";
import { useState, useEffect } from "react";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};
const getApp = () => getApps().length? getApps()[0] : initializeApp(firebaseConfig);

export default function StaffPage(){
  const [staff,setStaff]=useState<any[]>([]);
  const [showModal,setShowModal]=useState(false);
  const [showPass,setShowPass]=useState(false);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [form,setForm]=useState({name:"",email:"",phone:"",role:"waiter",password:"123456"});

  const app = getApp();
  const db = getFirestore(app);

  useEffect(()=>{ fetchStaff(); },[]);

  const fetchStaff = async()=>{
    try{
      // merge all 3 collections by uid to avoid duplicates
      const [s1,s2,s3] = await Promise.all([
        getDocs(collection(db,"users")).catch(()=>({docs:[]} as any)),
        getDocs(collection(db,"staff")).catch(()=>({docs:[]} as any)),
        getDocs(collection(db,"appUsers")).catch(()=>({docs:[]} as any)),
      ]);
      const map = new Map();
      [...s1.docs,...s2.docs,...s3.docs].forEach(d=>{
        const data:any = d.data();
        const uid = data.uid || d.id;
        if(!map.has(uid)) map.set(uid, {id:uid,...data});
      });
      setStaff(Array.from(map.values()));
    }catch(e){ console.log(e); }
  }

  const createStaff = async(e:any)=>{
    e.preventDefault(); setLoading(true);
    try{
      const secondary = initializeApp(firebaseConfig, "secondary-"+Date.now());
      const secAuth = getAuth(secondary);
      let uid="";
      try{
        const cred = await createUserWithEmailAndPassword(secAuth, form.email.toLowerCase().trim(), form.password);
        uid = cred.user.uid;
      }catch(err:any){
        if(err.code==="auth/email-already-in-use"){
          alert(`Email ${form.email} already exists in Auth!\nGo to Firebase Console > Authentication > delete it first, then also delete docs in users/staff/appUsers with same email.`);
          setLoading(false); await signOut(secAuth); await deleteApp(secondary); return;
        }
        throw err;
      }
      await signOut(secAuth); await deleteApp(secondary);

      const normalizedRole = form.role.toLowerCase().trim(); // waiter, cashier, manager, admin, super_admin, storekeeper, accountant, auditor, bar

      const data = {
        uid,
        id: uid,
        name:form.name,
        Name: form.name,
        email:form.email.toLowerCase().trim(),
        phone:form.phone,
        role: normalizedRole,
        Role: normalizedRole,
        active:true,
        isOnline:false,
        branch:"Chebunyo",
        branchId:"chebunyo_main",
        BranchId:"chebunyo_main",
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      };

      // WRITE TO ALL 3 COLLECTIONS - AuthContext checks all 3
      await Promise.all([
        setDoc(doc(db,"users",uid), data),
        setDoc(doc(db,"staff",uid), data),
        setDoc(doc(db,"appUsers",uid), data),
      ]);

      alert(`✅ Created ${form.name}\nRole: ${normalizedRole}\nEmail: ${form.email}\nPassword: ${form.password}\n\nOn login they will land to ${normalizedRole.toUpperCase()} dashboard automatically.`);
      setShowModal(false); setForm({name:"",email:"",phone:"",role:"waiter",password:"123456"}); fetchStaff();
    }catch(err:any){ alert(err.message); } setLoading(false);
  }

  const del = async(id:string,email:string)=>{
    if(!confirm(`Delete ${email}? This deletes from users, staff, appUsers. Also delete from Authentication manually.`)) return;
    await Promise.all([
      deleteDoc(doc(db,"appUsers",id)).catch(()=>{}),
      deleteDoc(doc(db,"users",id)).catch(()=>{}),
      deleteDoc(doc(db,"staff",id)).catch(()=>{}),
      deleteDoc(doc(db,"staffs",id)).catch(()=>{}),
    ]);
    fetchStaff();
  }

  const filtered = staff.filter(s=> (s.name||"").toLowerCase().includes(search.toLowerCase()) || (s.email||"").toLowerCase().includes(search.toLowerCase()));
  const count = (role:string)=> staff.filter(s=> (s.role||s.Role||"").toLowerCase()===role.toLowerCase()).length;

  return(
    <div style={{padding:24, background:"#f8fafc", minHeight:"100vh"}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:20}}>
        <div><h2 style={{fontWeight:800}}>👥 Staff Management - Club Marina</h2><p style={{fontSize:11, color:"#666"}}>{staff.length} total staff - Chebunyo - {new Date().toDateString()} - Source: users + staff + appUsers merged</p></div>
        <button onClick={()=>setShowModal(true)} style={{background:"black", color:"white", padding:"8px 16px", borderRadius:8, fontSize:13}}>+ Add Staff</button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:12, marginBottom:20}}>
        {[["SUPER ADMIN","super_admin"],["ADMIN","admin"],["MANAGER","manager"],["CASHIER","cashier"],["WAITER","waiter"],["STOREKEEPER","storekeeper"],["ACCOUNTANT","accountant"],["BAR/KITCHEN","bar"]].map(([label,key])=>(
          <div key={key} style={{background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:12, textAlign:"center"}}>
            <div style={{fontSize:9, fontWeight:700, color:"#888"}}>{label}</div>
            <div style={{fontSize:18, fontWeight:800}}>{key==="super_admin"? staff.length : count(key)}</div>
            <div style={{fontSize:10, color:"#999"}}>staff</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff..." style={{width:"100%", padding:12, borderRadius:8, border:"1px solid #ddd", marginBottom:16}}/>

      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16}}>
        {filtered.map(s=>(
          <div key={s.id} style={{background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:16}}>
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <div style={{display:"flex", gap:8}}><div style={{width:32,height:32,background:"#dbeafe",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{(s.name||"A")[0]}</div>
              <div><div style={{fontWeight:700,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:"#666"}}>{s.email}</div><span style={{fontSize:10,background:"#eff6ff",color:"#1d4ed8",padding:"2px 6px",borderRadius:6}}>{s.role||s.Role}</span></div></div>
              <span style={{fontSize:10,color:"green"}}>● Active</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:12, fontSize:11}}><div><div style={{color:"#999"}}>TODAY ORDERS</div><b>{s.todayOrders||0}</b></div><div><div style={{color:"#999"}}>TODAY SALE</div><b>KES {s.todaySale||0}</b></div><div><div style={{color:"#999"}}>ROLE</div><b>{s.role}</b></div></div>
            <div style={{display:"flex", gap:8, marginTop:12}}><button style={{flex:1,border:"1px solid #ddd",borderRadius:6,padding:6,fontSize:12}}>✎ Edit</button><button onClick={()=>del(s.id,s.email)} style={{flex:1,border:"1px solid #ddd",borderRadius:6,padding:6,fontSize:12,color:"red"}}>🗑 Delete</button></div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50}}>
          <div style={{background:"white", width:400, borderRadius:16, padding:20}}>
            <h3 style={{fontWeight:700}}>+ Add New Staff - Club Marina</h3>
            <p style={{fontSize:11,color:"#666",marginBottom:12}}>Auto-creates in users + staff + appUsers. Dashboard auto-matches role.</p>
            <form onSubmit={createStaff} style={{display:"grid", gap:10}}>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full Name" required style={{padding:12,border:"1px solid #ddd",borderRadius:8}}/>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" required style={{padding:12,border:"1px solid #ddd",borderRadius:8}}/>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone 075..." style={{padding:12,border:"1px solid #ddd",borderRadius:8}}/>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{padding:12,border:"1px solid #ddd",borderRadius:8}}>
                <option value="waiter">Waiter - My Tables</option>
                <option value="cashier">Cashier - Billing</option>
                <option value="bar">Bar/Kitchen - Orders</option>
                <option value="storekeeper">Storekeeper - Inventory</option>
                <option value="manager">Manager - Control Center</option>
                <option value="admin">Admin - Control Center</option>
                <option value="accountant">Accountant - Finance</option>
                <option value="auditor">Auditor - Audit Log</option>
                <option value="super_admin">Super Admin - System</option>
              </select>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password min 6" required style={{width:"100%",padding:12,paddingRight:80,border:"1px solid #ddd",borderRadius:8}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:8,top:8,padding:"6px 10px",fontSize:12,border:"1px solid #ddd",borderRadius:6,background:"#f9fafb"}}>{showPass?"🙈 Hide":"👁️ Show"}</button>
              </div>
              <div style={{display:"flex",gap:10,marginTop:8}}><button type="button" onClick={()=>setShowModal(false)} style={{flex:1,border:"1px solid #ddd",padding:10,borderRadius:8}}>Cancel</button><button disabled={loading} type="submit" style={{flex:1,background:"black",color:"white",padding:10,borderRadius:8}}>{loading?"Saving...":"Create Staff"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}