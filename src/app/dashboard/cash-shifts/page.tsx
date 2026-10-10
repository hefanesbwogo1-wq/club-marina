'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  addDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

type DataRow = Record<string, any> & { id: string };

const money = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

function timestampMillis(value: any): number {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function paymentIsCash(value: unknown): boolean {
  return String(value ?? '').trim().toLowerCase() === 'cash';
}

export default function CashShiftsPage() {
  const { appUser } = useAuth();
  const email = String(appUser?.email ?? '').trim().toLowerCase();

  const [shifts, setShifts] = useState<DataRow[]>([]);
  const [sales, setSales] = useState<DataRow[]>([]);
  const [expenses, setExpenses] = useState<DataRow[]>([]);
  const [openingCash, setOpeningCash] = useState('5000');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    let shiftsReady = false;
    let salesReady = false;
    let expensesReady = false;

    const updateLoading = () => {
      setLoading(!(shiftsReady && salesReady && expensesReady));
    };

    const handleError = (message: string) => {
      setError(message);
      setLoading(false);
    };

    const unsubscribeShifts = onSnapshot(
      query(
        collection(db, 'cashShifts'),
        where('cashier', '==', appUser?.email),
      ),
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as DataRow[];

        rows.sort(
          (a, b) =>
            timestampMillis(b.openedAt) - timestampMillis(a.openedAt),
        );

        setShifts(rows);
        shiftsReady = true;
        updateLoading();
      },
      () => handleError('Unable to load your cash shifts. Check your access or connection.'),
    );

    const unsubscribeSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        setSales(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as DataRow[],
        );
        salesReady = true;
        updateLoading();
      },
      () => handleError('Unable to load sales needed for cash reconciliation.'),
    );

    const unsubscribeExpenses = onSnapshot(
      collection(db, 'expenses'),
      (snapshot) => {
        setExpenses(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as DataRow[],
        );
        expensesReady = true;
        updateLoading();
      },
      () => handleError('Unable to load cash expenses for reconciliation.'),
    );

    return () => {
      unsubscribeShifts();
      unsubscribeSales();
      unsubscribeExpenses();
    };
  }, [email, appUser?.email]);

  const activeShift = useMemo(
    () => shifts.find((shift) => shift.status === 'open') ?? null,
    [shifts],
  );

  const shiftStart = timestampMillis(activeShift?.openedAt);

  const cashSales = useMemo(() => {
    if (!activeShift || !shiftStart) return 0;

    return sales.reduce((sum, sale) => {
      const createdAt = timestampMillis(sale.createdAt);
      if (
        paymentIsCash(sale.paymentMethod) &&
        createdAt >= shiftStart &&
        sale.status !== 'cancelled' &&
        sale.status !== 'voided'
      ) {
        return sum + (Number(sale.total) || 0);
      }
      return sum;
    }, 0);
  }, [sales, activeShift, shiftStart]);

  const cashExpenses = useMemo(() => {
    if (!activeShift || !shiftStart) return 0;

    return expenses.reduce((sum, expense) => {
      const createdAt = timestampMillis(expense.createdAt);
      if (
        paymentIsCash(expense.paymentMethod) &&
        createdAt >= shiftStart
      ) {
        return sum + (Number(expense.amount) || 0);
      }
      return sum;
    }, 0);
  }, [expenses, activeShift, shiftStart]);

  const opening = Number(activeShift?.openingCash ?? 0);
  const expectedCash = opening + cashSales - cashExpenses;

  const openShift = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const amount = Number(openingCash);

    if (!email) {
      setError('Your account email is missing. Sign in again and retry.');
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid opening float of zero or more.');
      return;
    }

    if (activeShift) {
      setError('You already have an open shift. Close it before opening another.');
      return;
    }

    if (saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'cashShifts'), {
        openingCash: amount,
        cashier: appUser?.email,
        cashierUid: appUser?.uid ?? null,
        openedAt: serverTimestamp(),
        status: 'open',
        branchId: 'chebunyo_main',
      });
    } catch {
      setError('Could not open the shift. Check your permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const closeShift = async () => {
    setError('');

    if (!activeShift) {
      setError('There is no open shift to close.');
      return;
    }

    const input = window.prompt(
      `Expected cash: ${money(expectedCash)}\nEnter the actual cash counted:`,
    );

    if (input === null) return;

    const actual = Number(input.trim());

    if (input.trim() === '' || !Number.isFinite(actual) || actual < 0) {
      setError('Enter a valid actual cash count of zero or more.');
      return;
    }

    if (saving) return;

    const variance = actual - expectedCash;
    setSaving(true);

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'cashShifts', activeShift.id), {
        closedAt: serverTimestamp(),
        actualCash: actual,
        expectedCash,
        cashSales,
        cashExpenses,
        variance,
        status: 'closed',
        closedBy: appUser?.email,
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        action: 'Cash Shift Closed',
        user: appUser?.email,
        record: activeShift.id,
        amount: actual,
        date: serverTimestamp(),
        details: `Expected ${expectedCash}; actual ${actual}; variance ${variance}`,
      });

      await batch.commit();
    } catch {
      setError(
        'Could not close the shift. No success was confirmed. Check the connection and shift status before retrying.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ color: '#475569' }}>Loading cash-shift records...</p>;
  }

  const cardStyle: React.CSSProperties = {
    background: 'white',
    padding: 18,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            color: '#0f766e',
          }}
        >
          CLUB MARINA · CASH MANAGEMENT
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>
          Cash Shifts
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Track your opening float, cash received, expected cash and handover.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {activeShift ? (
        <>
          <div
            style={{
              background: '#dcfce7',
              color: '#166534',
              padding: 14,
              borderRadius: 10,
              marginBottom: 16,
              fontWeight: 800,
            }}
          >
            SHIFT OPEN · {activeShift.cashier}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
            }}
          >
            <div style={cardStyle}>
              <p style={{ color: '#64748b', fontSize: 13 }}>Opening float</p>
              <h2 style={{ fontSize: 22 }}>{money(opening)}</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#64748b', fontSize: 13 }}>Cash sales</p>
              <h2 style={{ fontSize: 22 }}>{money(cashSales)}</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#64748b', fontSize: 13 }}>Cash expenses</p>
              <h2 style={{ fontSize: 22 }}>{money(cashExpenses)}</h2>
            </div>
            <div style={cardStyle}>
              <p style={{ color: '#64748b', fontSize: 13 }}>Expected cash</p>
              <h2 style={{ fontSize: 22 }}>{money(expectedCash)}</h2>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={closeShift}
            style={{
              marginTop: 18,
              padding: '12px 20px',
              background: '#0f172a',
              color: 'white',
              border: 0,
              borderRadius: 8,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.65 : 1,
              fontWeight: 700,
            }}
          >
            {saving ? 'Saving...' : 'Count Cash & Close Shift'}
          </button>
        </>
      ) : (
        <form
          onSubmit={openShift}
          style={{
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 500,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Open a cash shift</h2>
          <label htmlFor="openingCash" style={{ fontSize: 13, fontWeight: 700 }}>
            Opening cash float (KES)
          </label>
          <input
            id="openingCash"
            type="number"
            min="0"
            step="0.01"
            required
            value={openingCash}
            onChange={(event) => setOpeningCash(event.target.value)}
            style={{
              padding: 12,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 16,
            }}
          />
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: 12,
              background: '#047857',
              color: 'white',
              border: 0,
              borderRadius: 8,
              cursor: saving ? 'wait' : 'pointer',
              fontWeight: 800,
            }}
          >
            {saving ? 'Opening shift...' : 'Open Shift'}
          </button>
        </form>
      )}

      <section style={{ ...cardStyle, marginTop: 24, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          Your shift history
        </h2>
        <table
          style={{
            width: '100%',
            minWidth: 700,
            fontSize: 13,
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              {[
                'Opened',
                'Opening Float',
                'Cash Sales',
                'Expected',
                'Actual',
                'Variance',
                'Status',
              ].map((heading) => (
                <th key={heading} style={{ padding: 10 }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: 10 }}>
                  {shift.openedAt?.toDate?.()?.toLocaleString() ?? 'Pending'}
                </td>
                <td>{money(Number(shift.openingCash) || 0)}</td>
                <td>{money(Number(shift.cashSales) || 0)}</td>
                <td>
                  {shift.expectedCash == null
                    ? '—'
                    : money(Number(shift.expectedCash))}
                </td>
                <td>
                  {shift.actualCash == null
                    ? '—'
                    : money(Number(shift.actualCash))}
                </td>
                <td
                  style={{
                    color:
                      Number(shift.variance) < 0
                        ? '#dc2626'
                        : Number(shift.variance) > 0
                          ? '#047857'
                          : '#334155',
                    fontWeight: 700,
                  }}
                >
                  {shift.variance == null
                    ? '—'
                    : money(Number(shift.variance))}
                </td>
                <td>{shift.status}</td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, color: '#64748b' }}>
                  No shifts found for your account yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}