'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type AppUser = {
  uid: string;
  email: string;
  role: string;
  branchId?: string;
  name?: string;
};

type Ctx = { user: User | null; appUser: AppUser | null; profile: AppUser | null; loading: boolean; logout: () => Promise<void>; };

const AuthContext = createContext<Ctx>({ user: null, appUser: null, profile: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAppUser(null);
        setLoading(false);
        return;
      }
      setUser(fbUser);
      
      // TRY 3 collections to find real role - NO guessing from email
      let foundRole = '';
      let foundName = '';
      let foundBranch = '';
      
      const collectionsToTry = ['users', 'staff', 'staffs'];
      
      for (const col of collectionsToTry) {
        try {
          const snap = await getDoc(doc(db, col, fbUser.uid));
          if (snap.exists()) {
            const d: any = snap.data();
            foundRole = String(d.role || d.Role || '').toLowerCase();
            foundName = d.name || d.Name || d.displayName || '';
            foundBranch = d.branchId || d.BranchId || d.branch || '';
            if (foundRole) break;
          }
        } catch {}
      }

      // If not found by UID, try by email in users
      if (!foundRole) {
        try {
          // this is slow but fallback - check if you have email doc
          console.log('No role found for uid, using fallback admin. Please set role in users/', fbUser.uid);
        } catch {}
      }

      const finalRole = foundRole || 'waiter'; // default to waiter, not admin

      setAppUser({
        uid: fbUser.uid,
        email: fbUser.email || '',
        role: finalRole,
        branchId: foundBranch,
        name: foundName,
      });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return <AuthContext.Provider value={{ user, appUser, profile: appUser, loading, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);