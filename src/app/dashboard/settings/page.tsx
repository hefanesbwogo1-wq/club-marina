'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { appUser } = useAuth();
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [branch, setBranch] = useState({ 
    name: 'CLUB MARINA - CHEBUNYO MAIN', 
    phone: '0700 000000', 
    address: 'Chebunyo, Bomet', 
    pin: 'P051234567A' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const role = (appUser?.role || '').toLowerCase();
  const isAdmin = ['super_admin','admin','manager'].includes(role);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.managerPin) setPin(data.managerPin);
          if (data.branch) setBranch(data.branch);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const savePin = async () => {
    if (!isAdmin) return alert('Only Admin/Manager allowed');
    if (newPin.length < 4) return alert('PIN must be 4+ digits');
    if (newPin !== confirmPin) return alert('PINs do not match');

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        managerPin: newPin,
        updatedBy: appUser?.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setPin(newPin);
      setNewPin('');
      setConfirmPin('');
      alert(`✅ Manager PIN updated to ${newPin}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const saveBranch = async () => {
    if (!isAdmin) return alert('Only Admin/Manager allowed');
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        branch,
        updatedBy: appUser?.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('✅ Branch details saved - will show on receipt');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading settings...</div>;
  if (!isAdmin) return <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8 }}>⛔ Access Denied - Only Admin/Manager. Your role: {role}</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>⚙️ System Settings</h1>

      {/* MANAGER PIN */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>🔐 Manager Discount PIN</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Required when waiter gives discount {'>'} 20%. Current PIN hidden for security.</p>
        
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Current PIN:</span><b>{pin ? '•••• (' + pin.length + ' digits)' : 'Not set - using 1234'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
            <span>Last Updated:</span><span>{new Date().toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            <span>Actual Value (Admin only):</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{pin || '1234'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>NEW PIN</label>
            <input value={newPin} onChange={e=>setNewPin(e.target.value)} type="text" maxLength={6} placeholder="e.g 2024" style={{ width: '100%', marginTop: 4, padding: 12, border: '2px solid #0f172a', borderRadius: 8, fontSize: 18, fontWeight: 800, letterSpacing: '4px', textAlign: 'center' }}/>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>CONFIRM PIN</label>
            <input value={confirmPin} onChange={e=>setConfirmPin(e.target.value)} type="text" maxLength={6} placeholder="Confirm" style={{ width: '100%', marginTop: 4, padding: 12, border: '2px solid #0f172a', borderRadius: 8, fontSize: 18, fontWeight: 800, letterSpacing: '4px', textAlign: 'center' }}/>
          </div>
        </div>

        <button onClick={savePin} disabled={saving} style={{ width: '100%', marginTop: 16, background: '#0f172a', color: 'white', padding: 12, borderRadius: 8, fontWeight: 800, cursor: 'pointer', border: 0 }}>
          {saving ? 'Saving...' : newPin ? `Update PIN to ${newPin}` : 'Update PIN'}
        </button>
      </div>

      {/* BRANCH DETAILS */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>🏢 Branch Details (For Receipt)</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>BRANCH NAME</label>
            <input value={branch.name} onChange={e=>setBranch({...branch, name: e.target.value})} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>PHONE</label>
              <input value={branch.phone} onChange={e=>setBranch({...branch, phone: e.target.value})} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}/>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>KRA PIN</label>
              <input value={branch.pin} onChange={e=>setBranch({...branch, pin: e.target.value})} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700 }}>ADDRESS</label>
            <input value={branch.address} onChange={e=>setBranch({...branch, address: e.target.value})} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}/>
          </div>
        </div>
        
        <button onClick={saveBranch} disabled={saving} style={{ width: '100%', marginTop: 16, background: '#2563eb', color: 'white', padding: 12, borderRadius: 8, fontWeight: 800, cursor: 'pointer', border: 0 }}>
          {saving ? 'Saving...' : 'Save Branch Details'}
        </button>
      </div>

      <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 16, textAlign: 'center' }}>
        Logged in as {appUser?.email} ({role}) | Firestore: settings/config
      </p>
    </div>
  );
}