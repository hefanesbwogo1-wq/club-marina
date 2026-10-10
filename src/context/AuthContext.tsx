
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type AppUser = {
  uid: string;
  email: string;
  role: string;
  branchId?: string;
  name?: string;
};

type AuthContextValue = {
  user: User | null;
  appUser: AppUser | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  appUser: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

const PROFILE_COLLECTIONS = ['users', 'staff', 'appUsers', 'staffs'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      setAppUser(null);

      if (!firebaseUser) {
        if (active) setLoading(false);
        return;
      }

      try {
        let profile: AppUser | null = null;

        for (const collectionName of PROFILE_COLLECTIONS) {
          try {
            const snapshot = await getDoc(
              doc(db, collectionName, firebaseUser.uid)
            );

            if (!snapshot.exists()) continue;

            const data = snapshot.data();
            const role = String(data.role || data.Role || '')
              .trim()
              .toLowerCase();

            if (!role) continue;
            if (data.active === false) continue;

            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role,
              branchId: String(
                data.branchId || data.BranchId || data.branch || ''
              ),
              name: String(data.name || data.Name || data.displayName || ''),
            };

            break;
          } catch (error) {
            // Continue checking the legacy profile collections.
            console.error(
              `Unable to read profile from ${collectionName}:`,
              error
            );
          }
        }

        if (active) {
          // No profile means no application role. Never guess admin.
          setAppUser(profile);
        }
      } catch (error) {
        console.error('Unable to load the signed-in user profile:', error);

        if (active) {
          setAppUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        profile: appUser,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);