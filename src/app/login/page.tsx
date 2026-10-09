'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@clubmarina.co.ke');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // CRITICAL: Set persistence BEFORE signIn, or session will be lost
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      // Don't router here - let AuthContext update, then useEffect will redirect
      setTimeout(() => {
        router.replace('/dashboard');
      }, 800);
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      if (err.code === 'auth/invalid-credential') msg = 'Wrong email or password';
      setError(msg);
      setBusy(false);
    }
  };

  // Always show form, never block with "checking..."
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'sans-serif', padding: 16 }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: 32, borderRadius: 16, width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>CLUB MARINA</h1>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Chebunyo, Bomet - MIS Login</p>
        
        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 10, fontSize: 14 }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 16, fontSize: 14 }} />
        
        <button disabled={busy} style={{ width: '100%', padding: 12, background: '#0f172a', color: 'white', border: 0, borderRadius: 8, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}