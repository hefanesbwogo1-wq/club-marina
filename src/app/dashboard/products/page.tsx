'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function ProductsPage() {
  const { appUser } = useAuth();
  const role = (appUser?.role || '').toLowerCase();
  const isStoreKeeper = ['storekeeper','admin','super_admin','manager'].includes(role);
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterStock, setFilterStock] = useState('All');

  const [name, setName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [category, setCategory] = useState('bar');
  const [editingId, setEditingId] = useState<string|null>(null);

  // Stock adjust modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add'|'remove'|'set'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'products'), orderBy('name')), s => setProducts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db, 'categories'), s => setCategories(s.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>{ u1(); u2(); };
  }, []);

  const resetForm = () => { setName(''); setBuyPrice(''); setSellPrice(''); setStock(''); setMinStock('5'); setCategory('bar'); setEditingId(null); };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    if(!isStoreKeeper) return alert('Only Storekeeper/Admin can add products');
    if(!name.trim()) return alert('Enter product name');
    const buy = Number(buyPrice); const sell = Number(sellPrice); const stk = Number(stock); const min = Number(minStock);
    if(isNaN(buy)||buy<=0) return alert('Enter valid Buying Price e.g. 180');
    if(isNaN(sell)||sell<=0) return alert('Enter valid Selling Price e.g. 250');
    if(sell < buy) if(!confirm(`Selling ${sell} < Buying ${buy}. Continue?`)) return;
    if(isNaN(stk)||stk<0) return alert('Enter valid Stock');

    const data = {
      name: name.trim(),
      buyingPrice: buy,
      sellingPrice: sell,
      profit: sell - buy,
      stock: stk,
      minStock: min,
      category: category.toLowerCase(),
      updatedAt: serverTimestamp(),
      updatedBy: appUser?.email,
    };

    try {
      if(editingId){
        await updateDoc(doc(db,'products',editingId), data);
        alert(`Updated ${name}`);
      } else {
        // @ts-ignore
        await addDoc(collection(db,'products'), {...data, createdAt: serverTimestamp(), createdBy: appUser?.email});
        alert(`Added ${name} - Stock ${stk}`);
      }
      resetForm();
    } catch(err:any){ alert(err.message); }
  };

  const handleEdit = (p:any) => {
    setEditingId(p.id); setName(p.name); setBuyPrice(String(p.buyingPrice||p.buy||'')); setSellPrice(String(p.sellingPrice||'')); setStock(String(p.stock||0)); setMinStock(String(p.minStock||5)); setCategory(p.category||'bar');
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const handleDelete = async (p:any) => {
    if(!isStoreKeeper) return alert('No permission');
    if(!confirm(`DELETE ${p.name}? Stock ${p.stock} will be lost!`)) return;
    if(prompt(`Type product name to confirm: ${p.name}`)!==p.name) return alert('Name mismatch');
    await deleteDoc(doc(db,'products',p.id));
  };

  const openAdjust = (p:any) => { setAdjustProduct(p); setAdjustQty(''); setAdjustType('add'); setAdjustReason(''); setShowAdjust(true); };

  const saveAdjust = async () => {
    const qty = Number(adjustQty); if(isNaN(qty)) return alert('Enter qty');
    let newStock = adjustProduct.stock;
    if(adjustType==='add') newStock = adjustProduct.stock + qty;
    if(adjustType==='remove') newStock = adjustProduct.stock - qty;
    if(adjustType==='set') newStock = qty;
    if(newStock<0) return alert('Stock cannot be negative');
    await updateDoc(doc(db,'products',adjustProduct.id), { stock: newStock, updatedAt: serverTimestamp(), updatedBy: appUser?.email });
    // log movement
    try { await addDoc(collection(db,'inventoryMovements'),{ productId: adjustProduct.id, productName: adjustProduct.name, movementType: adjustType==='add'?'Stock Add':adjustType==='remove'?'Stock Remove':'Stock Set', previousQty: adjustProduct.stock, newQty: newStock, qty: adjustType==='remove'?-qty:qty, reason: adjustReason||'Adjustment', user: appUser?.email, createdAt: serverTimestamp() }); } catch {}
    setShowAdjust(false); alert(`${adjustProduct.name}: ${adjustProduct.stock} → ${newStock}`);
  };

  const filtered = products.filter(p=>{
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat==='All' || (p.category||'bar').toLowerCase()===filterCat.toLowerCase();
    const isLow = (p.stock||0) <= (p.minStock||5);
    const matchStock = filterStock==='All' || (filterStock==='Low' && isLow) || (filterStock==='Ok' && !isLow);
    return matchSearch && matchCat && matchStock;
  });

  const totalValueBuy = products.reduce((a,b)=>a+(b.stock||0)*(b.buyingPrice||b.buy||0),0);
  const totalValueSell = products.reduce((a,b)=>a+(b.stock||0)*(b.sellingPrice||0),0);
  const lowCount = products.filter(p=>(p.stock||0) <= (p.minStock||5)).length;

  return (
    <>
    <style>{`
      .card { background:white; border-radius:12px; padding:14px; border:1px solid #f1f5f9; }
      .input { padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; width:100%; font-size:13px; }
      .input:focus { outline:none; border-color:#0f172a; }
      .btn { padding:10px 16px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; border:0; }
      .grid-form { display:grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr 1fr auto; gap:8px; }
      @media(max-width: 1100px){ .grid-form{ grid-template-columns: 1fr 1fr 1fr; } }
      @media(max-width: 600px){ .grid-form{ grid-template-columns: 1fr; } }
      .table-wrap { overflow-x:auto; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { text-align:left; font-size:11px; color:#64748b; text-transform:uppercase; padding:10px 8px; border-bottom:2px solid #f1f5f9; white-space:nowrap; }
      td { padding:10px 8px; border-bottom:1px solid #f8fafc; }
      .badge { padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; }
    `}</style>

    <div style={{maxWidth:1200}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:800}}>Products - Stock & Pricing</h1>
          <p style={{fontSize:11, color:'#64748b', marginTop:4}}>{products.length} products • KES {totalValueSell.toLocaleString()} sell value • {lowCount} low stock • Logged as {appUser?.email} ({role})</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <div className="card" style={{padding:'8px 12px'}}><span style={{fontSize:10, color:'#64748b'}}>TOTAL BUY VALUE</span><div style={{fontWeight:800}}>KES {totalValueBuy.toLocaleString()}</div></div>
          <div className="card" style={{padding:'8px 12px', background: lowCount? '#fee2e2' : 'white'}}><span style={{fontSize:10, color:'#64748b'}}>LOW STOCK</span><div style={{fontWeight:800, color: lowCount? '#dc2626' : '#0f172a'}}>{lowCount} items</div></div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontWeight:800, fontSize:13, marginBottom:10}}>{editingId? `✏️ Edit Product - ${name}` : '➕ Add New Product'}</h3>
        <form onSubmit={handleSubmit} className="grid-form">
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>PRODUCT NAME</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Tusker 500ml" required/></div>
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>BUY PRICE (KES)</label><input className="input" type="number" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="180" required/></div>
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>SELL PRICE (KES)</label><input className="input" type="number" value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="250" required/></div>
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>CURRENT STOCK</label><input className="input" type="number" value={stock} onChange={e=>setStock(e.target.value)} placeholder="108" required/></div>
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>MIN STOCK ALERT</label><input className="input" type="number" value={minStock} onChange={e=>setMinStock(e.target.value)} placeholder="5"/></div>
          <div><label style={{fontSize:10, fontWeight:700, color:'#475569'}}>CATEGORY</label>
            <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="bar">Bar - Beers</option>
              <option value="spirits">Spirits</option>
              <option value="soda">Soda / Water</option>
              <option value="food">Food / Kitchen</option>
              <option value="wine">Wine</option>
              <option value="cigarette">Cigarette</option>
              <option value="other">Other</option>
              {categories.map((c:any)=><option key={c.id} value={c.name.toLowerCase()}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:'flex', gap:6, alignItems:'flex-end'}}>
            <button type="submit" className="btn" style={{background:'#0f172a', color:'white', flex:1, height:42}}>{editingId? 'Update Product' : 'Add Product'}</button>
            {editingId && <button type="button" onClick={resetForm} className="btn" style={{background:'#f1f5f9', height:42}}>Cancel</button>}
          </div>
        </form>
        {buyPrice && sellPrice && <div style={{marginTop:10, fontSize:11, background:'#f8fafc', padding:8, borderRadius:6}}>Profit: <b style={{color:'#16a34a'}}>KES {Number(sellPrice||0)-Number(buyPrice||0)}</b> ({buyPrice? (((Number(sellPrice)-Number(buyPrice))/Number(buyPrice))*100).toFixed(1):0}% margin) {Number(sellPrice)<Number(buyPrice) && <span style={{color:'#dc2626', fontWeight:700}}>⚠️ Loss!</span>}</div>}
      </div>

      <div className="card" style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
        <input className="input" style={{flex:'1 1 220px'}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search e.g. Tusker..."/>
        <select className="input" style={{flex:'0 1 140px'}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          <option value="bar">Bar</option><option value="spirits">Spirits</option><option value="soda">Soda</option><option value="food">Food</option><option value="wine">Wine</option><option value="other">Other</option>
        </select>
        <select className="input" style={{flex:'0 1 120px'}} value={filterStock} onChange={e=>setFilterStock(e.target.value)}>
          <option value="All">All Stock</option><option value="Low">⚠️ Low Stock</option><option value="Ok">✅ In Stock</option>
        </select>
      </div>

      <div className="card" style={{marginTop:12, padding:0}}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Buy</th><th>Sell</th><th>Profit</th><th>Stock</th><th>Min</th><th>Value</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((p:any)=>{
                const low = (p.stock||0) <= (p.minStock||5);
                return (
                  <tr key={p.id} style={{background: low? '#fff7ed' : 'white'}}>
                    <td style={{fontWeight:700}}>{p.name} {low && <span className="badge" style={{background:'#fee2e2', color:'#991b1b', marginLeft:6}}>LOW</span>}</td>
                    <td><span className="badge" style={{background:'#f1f5f9'}}>{p.category||'bar'}</span></td>
                    <td>{p.buyingPrice||p.buy||0}</td>
                    <td style={{fontWeight:700}}>{p.sellingPrice||0}</td>
                    <td style={{color: (p.sellingPrice-(p.buyingPrice||p.buy||0))>=0? '#16a34a':'#dc2626', fontWeight:700}}>{(p.sellingPrice||0)-(p.buyingPrice||p.buy||0)}</td>
                    <td style={{fontWeight:800, color: low? '#dc2626':'#0f172a'}}>{p.stock||0}</td>
                    <td style={{fontSize:11, color:'#94a3b8'}}>{p.minStock||5}</td>
                    <td style={{fontSize:11}}>KES {((p.stock||0)*(p.sellingPrice||0)).toLocaleString()}</td>
                    <td>
                      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                        <button onClick={()=>handleEdit(p)} className="btn" style={{background:'#eff6ff', color:'#1d4ed8', padding:'6px 8px'}}>Edit</button>
                        <button onClick={()=>openAdjust(p)} className="btn" style={{background:'#f0fdf4', color:'#15803d', padding:'6px 8px'}}>+/- Stock</button>
                        <button onClick={()=>handleDelete(p)} className="btn" style={{background:'#fee2e2', color:'#991b1b', padding:'6px 8px'}}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length===0 && <tr><td colSpan={9} style={{textAlign:'center', padding:20, color:'#94a3b8'}}>No products found. Add Tusker etc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {showAdjust && adjustProduct && (
      <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16}}>
        <div className="card" style={{width:'100%', maxWidth:380}}>
          <h3 style={{fontWeight:800}}>Adjust Stock - {adjustProduct.name}</h3>
          <p style={{fontSize:11, color:'#64748b', marginTop:4}}>Current: <b>{adjustProduct.stock}</b> • Min: {adjustProduct.minStock}</p>
          <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
            <select className="input" value={adjustType} onChange={e=>setAdjustType(e.target.value as any)}>
              <option value="add">➕ Add Stock (Purchase / Restock)</option>
              <option value="remove">➖ Remove Stock (Breakage / Spoil)</option>
              <option value="set">✏️ Set Exact Stock (Stock Take)</option>
            </select>
            <input className="input" type="number" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder={adjustType==='set'? 'New total e.g. 100' : 'Qty e.g. 10'} autoFocus/>
            <input className="input" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Reason e.g. Delivery from supplier, breakage"/>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <button onClick={()=>setShowAdjust(false)} className="btn" style={{flex:1, background:'#f1f5f9'}}>Cancel</button>
              <button onClick={saveAdjust} className="btn" style={{flex:1, background:'#0f172a', color:'white'}}>Save Stock</button>
            </div>
            <p style={{fontSize:10, color:'#94a3b8', textAlign:'center'}}>Preview: {adjustProduct.stock} → {adjustType==='add'? adjustProduct.stock+Number(adjustQty||0) : adjustType==='remove'? adjustProduct.stock-Number(adjustQty||0) : Number(adjustQty||0)}</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}