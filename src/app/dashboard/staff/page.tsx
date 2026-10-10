"use client";

import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const getApp = () =>
  getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "waiter",
    password: "123456",
  });

  const app = getApp();
  const db = getFirestore(app);

  useEffect(() => {
    void fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const [s1, s2, s3] = await Promise.all([
        getDocs(collection(db, "users")).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, "staff")).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, "appUsers")).catch(() => ({ docs: [] } as any)),
      ]);

      const map = new Map<string, any>();

      [...s1.docs, ...s2.docs, ...s3.docs].forEach((d: any) => {
        const data = d.data();
        const uid = data.uid || d.id;

        if (!map.has(uid)) {
          map.set(uid, {
            id: uid,
            ...data,
          });
        }
      });

      setStaff(Array.from(map.values()));
    } catch (error) {
      console.error("Unable to load staff:", error);
      alert("Unable to load staff records. Check your access and connection.");
    }
  };

  const createStaff = async (e: any) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const currentUser = getAuth(app).currentUser;

      if (!currentUser) {
        throw new Error("Please sign in again before creating staff.");
      }

      const token = await currentUser.getIdToken();

      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role: form.role,
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create staff account.");
      }

      alert(
        `Staff account created successfully.\n\nName: ${form.name}\nRole: ${form.role}\nEmail: ${form.email}\n\nCommunicate the initial password securely.`
      );

      setShowModal(false);
      setShowPass(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        role: "waiter",
        password: "123456",
      });

      await fetchStaff();
    } catch (error: any) {
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: string, email: string) => {
    if (deletingId) return;

    if (
      !confirm(
        `Deactivate ${email || id}? Their sign-in will be disabled and their existing records preserved.`
      )
    ) {
      return;
    }

    setDeletingId(id);

    try {
      const currentUser = getAuth(app).currentUser;

      if (!currentUser) {
        throw new Error("Please sign in again before deactivating staff.");
      }

      const token = await currentUser.getIdToken();

      const response = await fetch("/api/staff", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to deactivate staff account.");
      }

      alert("Staff account deactivated successfully. Existing records were preserved.");
      await fetchStaff();
    } catch (error: any) {
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setDeletingId("");
    }
  };

  const filtered = staff.filter((s) => {
    const name = String(s.name || s.Name || "").toLowerCase();
    const email = String(s.email || "").toLowerCase();
    const query = search.toLowerCase();

    return name.includes(query) || email.includes(query);
  });

  const count = (role: string) =>
    staff.filter(
      (s) =>
        String(s.role || s.Role || "").toLowerCase() === role.toLowerCase()
    ).length;

  const roleCards = [
    ["SUPER ADMIN", "super_admin"],
    ["ADMIN", "admin"],
    ["MANAGER", "manager"],
    ["CASHIER", "cashier"],
    ["WAITER", "waiter"],
    ["STOREKEEPER", "storekeeper"],
    ["ACCOUNTANT", "accountant"],
    ["BAR/KITCHEN", "bar"],
  ];

  return (
    <div
      style={{
        padding: 24,
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 23 }}>
            👥 Staff Management - Club Marina
          </h2>
          <p style={{ fontSize: 11, color: "#666", marginTop: 5 }}>
            {staff.length} total staff · Chebunyo · {new Date().toDateString()}
            {" · "}Source: users + staff + appUsers merged
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            background: "#0f172a",
            color: "white",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            border: 0,
            cursor: "pointer",
          }}
        >
          + Add Staff
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {roleCards.map(([label, key]) => (
          <div
            key={key}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "#888" }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>
              {count(key)}
            </div>
            <div style={{ fontSize: 10, color: "#999" }}>staff</div>
          </div>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search staff by name or email..."
        aria-label="Search staff"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          marginBottom: 16,
          background: "white",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((s) => {
          const name = s.name || s.Name || "Unnamed staff";
          const email = s.email || "";
          const role = s.role || s.Role || "unassigned";

          return (
            <div
              key={s.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      background: "#dbeafe",
                      borderRadius: 99,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {String(name)[0]?.toUpperCase() || "A"}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {email}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 5,
                        fontSize: 10,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        padding: "3px 7px",
                        borderRadius: 6,
                      }}
                    >
                      {role}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    color: s.active === false ? "#b91c1c" : "#15803d",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.active === false ? "● Inactive" : "● Active"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginTop: 16,
                  fontSize: 11,
                }}
              >
                <div>
                  <div style={{ color: "#999" }}>TODAY ORDERS</div>
                  <b>{s.todayOrders || 0}</b>
                </div>
                <div>
                  <div style={{ color: "#999" }}>TODAY SALE</div>
                  <b>KES {s.todaySale || 0}</b>
                </div>
                <div>
                  <div style={{ color: "#999" }}>ROLE</div>
                  <b>{role}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  disabled
                  title="Staff editing is not enabled yet."
                  style={{
                    flex: 1,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    padding: 7,
                    fontSize: 12,
                    background: "#f8fafc",
                    color: "#64748b",
                    cursor: "not-allowed",
                  }}
                >
                  ✎ Edit
                </button>

                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => void del(s.id, email)}
                  style={{
                    flex: 1,
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: 7,
                    fontSize: 12,
                    color: "#b91c1c",
                    background: "white",
                    cursor: deletingId ? "wait" : "pointer",
                    opacity: deletingId && deletingId !== s.id ? 0.6 : 1,
                  }}
                >
                  {deletingId === s.id ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: 30,
            textAlign: "center",
            color: "#64748b",
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          No staff records match your search.
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "white",
              width: "100%",
              maxWidth: 420,
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 16,
              padding: 20,
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ fontWeight: 800, fontSize: 18 }}>
              + Add New Staff - Club Marina
            </h3>
            <p style={{ fontSize: 11, color: "#666", margin: "8px 0 16px" }}>
              Creates the Firebase login and staff profiles. Administrator
              authorization is checked by the server.
            </p>

            <form onSubmit={createStaff} style={{ display: "grid", gap: 10 }}>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Full Name"
                autoComplete="name"
                maxLength={120}
                required
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              />

              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="Email"
                autoComplete="email"
                maxLength={254}
                required
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="Phone 075..."
                autoComplete="tel"
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              />

              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "white",
                }}
              >
                <option value="waiter">Waiter - My Tables</option>
                <option value="cashier">Cashier - Billing</option>
                <option value="bar">Bar/Kitchen - Orders</option>
                <option value="storekeeper">Storekeeper - Inventory</option>
                <option value="manager">Manager - Control Center</option>
                <option value="admin">Admin - Control Center</option>
                <option value="accountant">Accountant - Finance</option>
                <option value="auditor">Auditor - Audit Log</option>
              </select>

              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Initial password (minimum 6 characters)"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={128}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    paddingRight: 82,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 7,
                    top: 7,
                    padding: "6px 9px",
                    fontSize: 12,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    background: "#f9fafb",
                  }}
                >
                  {showPass ? "🙈 Hide" : "👁️ Show"}
                </button>
              </div>

              <p style={{ fontSize: 11, color: "#92400e" }}>
                Use a unique temporary password and communicate it privately.
                Do not reuse this example password for real accounts.
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowModal(false);
                    setShowPass(false);
                  }}
                  style={{
                    flex: 1,
                    border: "1px solid #ddd",
                    padding: 10,
                    borderRadius: 8,
                    background: "white",
                  }}
                >
                  Cancel
                </button>

                <button
                  disabled={loading}
                  type="submit"
                  style={{
                    flex: 1,
                    background: "#0f172a",
                    color: "white",
                    padding: 10,
                    borderRadius: 8,
                    border: 0,
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
