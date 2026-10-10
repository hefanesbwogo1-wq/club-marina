import 'server-only';

import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error('Firebase project ID is not configured.');
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: applicationDefault(),
      projectId,
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export const INITIAL_ADMIN_EMAIL = 'admin@clubmarina.co.ke';
