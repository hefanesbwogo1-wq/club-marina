import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminAuth,
  adminDb,
  INITIAL_ADMIN_EMAIL,
} from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set([
  'waiter',
  'cashier',
  'bar',
  'storekeeper',
  'manager',
  'admin',
  'accountant',
  'auditor',
]);

async function authorize(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return { error: 'Authentication required.', status: 401 as const };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(match[1], true);

    if (
      !decoded.email ||
      decoded.email.toLowerCase() !== INITIAL_ADMIN_EMAIL
    ) {
      return { error: 'Administrator access required.', status: 403 as const };
    }

    return { uid: decoded.uid };
  } catch {
    return { error: 'Invalid or expired sign-in. Please sign in again.', status: 401 as const };
  }
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);

  if ('error' in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  let createdUid: string | undefined;

  try {
    const body = await request.json();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role =
      typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';

    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Enter a valid staff name.' }, { status: 400 });
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });

    createdUid = userRecord.uid;

    const profile = {
      uid: userRecord.uid,
      id: userRecord.uid,
      name,
      Name: name,
      email,
      phone,
      role,
      Role: role,
      active: true,
      isOnline: false,
      branch: 'Chebunyo',
      branchId: 'chebunyo_main',
      BranchId: 'chebunyo_main',
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    };

    const batch = adminDb.batch();

    for (const collectionName of ['users', 'staff', 'appUsers']) {
      batch.set(adminDb.collection(collectionName).doc(userRecord.uid), profile);
    }

    await batch.commit();

    return NextResponse.json(
      { success: true, uid: userRecord.uid, message: 'Staff account created.' },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch {
        // Do not expose internal cleanup errors to the client.
      }

      for (const collectionName of ['users', 'staff', 'appUsers']) {
        try {
          await adminDb.collection(collectionName).doc(createdUid).delete();
        } catch {
          // Best-effort cleanup if profile creation partially failed.
        }
      }
    }

    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';

    if (code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'This email already has a Firebase Authentication account.' },
        { status: 409 }
      );
    }

    console.error('Staff account creation failed:', error);

    return NextResponse.json(
      { error: 'Unable to create the staff account. Check server logs.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const access = await authorize(request);

  if ('error' in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  try {
    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';

    if (!uid) {
      return NextResponse.json(
        { error: 'Staff UID is required.' },
        { status: 400 }
      );
    }

    if (uid === access.uid) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own administrator account.' },
        { status: 400 }
      );
    }

    const account = await adminAuth.getUser(uid);

    if (account.email?.toLowerCase() === INITIAL_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'The initial administrator account cannot be deactivated here.' },
        { status: 403 }
      );
    }

    const profileCollections = ['users', 'staff', 'appUsers', 'staffs'];
    const existingProfiles = [];

    for (const collectionName of profileCollections) {
      const profileRef = adminDb.collection(collectionName).doc(uid);
      const profileSnapshot = await profileRef.get();

      if (profileSnapshot.exists) {
        existingProfiles.push(profileRef);
      }
    }

    if (existingProfiles.length === 0) {
      return NextResponse.json(
        { error: 'No staff profile was found. No changes were made.' },
        { status: 404 }
      );
    }

    // Disable sign-in before marking profiles inactive.
    await adminAuth.updateUser(uid, { disabled: true });

    const batch = adminDb.batch();

    for (const profileRef of existingProfiles) {
      batch.set(
        profileRef,
        {
          active: false,
          deactivatedAt: FieldValue.serverTimestamp(),
          deactivatedBy: access.uid,
        },
        { merge: true }
      );
    }

    await batch.commit();

    // Revoke existing refresh tokens so the account cannot continue
    // obtaining new ID tokens after deactivation.
    await adminAuth.revokeRefreshTokens(uid);

    return NextResponse.json({
      success: true,
      deactivated: true,
      message: 'Staff account deactivated. Existing records were preserved.',
    });
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';

    if (code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Firebase Authentication account was not found.' },
        { status: 404 }
      );
    }

    console.error('Staff account deactivation failed:', error);

    return NextResponse.json(
      {
        error:
          'Unable to complete staff deactivation. Check server logs and verify the account status.',
      },
      { status: 500 }
    );
  }
}

