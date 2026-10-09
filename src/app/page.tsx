'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace('/dashboard');
    else {
      const t = setTimeout(() => router.replace('/login'), 1000);
      return () => clearTimeout(t);
    }
  }, [user, router]);
  return <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>CLUB MARINA Loading...</div>;
}