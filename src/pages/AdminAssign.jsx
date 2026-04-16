import { useMemo, useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db, BRANCHES } from "../firebaseConfig";
import "../style/AdminAssign.css";

function normalizeUid(value) {
  return String(value || "").trim();
}

export default function AdminAssign() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("employee");
  const [branchName, setBranchName] = useState(BRANCHES[0] || "");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanUid = useMemo(() => normalizeUid(uid), [uid]);

  const assignedBranchPreview = useMemo(() => {
    return role === "admin" ? "HQ" : branchName || "-";
  }, [role, branchName]);

  const isValid = useMemo(() => {
    if (!cleanUid) return false;
    if (role === "employee" && !branchName) return false;
    return true;
  }, [cleanUid, role, branchName]);

  const resetForm = () => {
    setUid("");
    setRole("employee");
    setBranchName(BRANCHES[0] || "");
    setStatus("");
  };

  const save = async () => {
    setStatus("");

    try {
      if (!auth.currentUser) {
        setStatus("❌ Not logged in");
        return;
      }

      if (!cleanUid) {
        setStatus("❌ Paste UID first");
        return;
      }

      if (role === "employee" && !branchName) {
        setStatus("❌ Select branch");
        return;
      }

      // ⚠️ حماية إضافية للأدمن
      if (role === "admin") {
        const confirmAdmin = window.confirm(
          "⚠️ هل أنت متأكد من إعطاء صلاحية ADMIN؟ هذا يعطي تحكم كامل."
        );
        if (!confirmAdmin) return;
      }

      setLoading(true);

      await setDoc(
        doc(db, "users", cleanUid),
        {
          uid: cleanUid,
          role,
          branchName: role === "admin" ? "HQ" : branchName,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.uid,
        },
        { merge: true }
      );

      setStatus(`✅ تم حفظ المستخدم بنجاح`);
      setUid("");
    } catch (e) {
      console.error("ADMIN ASSIGN SAVE ERROR:", e);
      setStatus("❌ " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const copyUid = async () => {
    if (!cleanUid) return;
    await navigator.clipboard.writeText(cleanUid);
    setStatus("📋 تم نسخ UID");
  };

  return (
    <div className="page" dir="rtl">
      <div className="card admin-assign-card">
        {/* HEADER */}
        <div className="admin-assign-header">
          <div>
            <h2 className="title">إدارة صلاحيات المستخدمين</h2>
            <p className="muted admin-assign-subtitle">
              تحكم كامل بصلاحيات المستخدمين وربطهم بالفروع
            </p>
          </div>

          <div className="admin-assign-header-links">
            <a className="btn ghost" href="/admin/dashboard">
              📊 Dashboard
            </a>

            <a className="btn ghost" href="/admin/menu">
              🍨 Menu
            </a>
          </div>
        </div>

        {/* FORM */}
        <div className="form">
          <div className="admin-assign-grid">
            {/* UID */}
            <div className="admin-assign-field admin-assign-field--full">
              <label className="label">UID</label>

              <div className="admin-uid-input-wrap">
                <input
                  className="input"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Paste UID here"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="btn ghost small"
                  onClick={copyUid}
                  disabled={!cleanUid}
                >
                  📋
                </button>
              </div>
            </div>

            {/* ROLE */}
            <div className="admin-assign-field">
              <label className="label">Role</label>

              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* BRANCH */}
            <div className="admin-assign-field">
              <label className="label">Branch</label>

              <select
                className="input"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={role === "admin" || loading}
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* PREVIEW */}
            <div className="admin-assign-field">
              <label className="label">Assigned Branch</label>
              <input className="input" value={assignedBranchPreview} disabled readOnly />
            </div>
          </div>

          {/* ⚠️ ADMIN WARNING */}
          {role === "admin" && (
            <div className="alert admin-assign-warning">
              ⚠️ هذا المستخدم سيحصل على صلاحيات كاملة (Admin)
            </div>
          )}

          {/* PREVIEW CARD */}
          <div className="admin-assign-preview card">
            <h3 className="admin-assign-preview__title">معاينة</h3>

            <div className="admin-assign-preview__grid">
              <div>
                <strong>UID</strong>
                <span>{cleanUid || "-"}</span>
              </div>

              <div>
                <strong>Role</strong>
                <span>{role}</span>
              </div>

              <div>
                <strong>Branch</strong>
                <span>{assignedBranchPreview}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="actions admin-assign-actions">
            <button
              className="btn"
              onClick={save}
              disabled={!isValid || loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>

            <button
              className="btn ghost"
              type="button"
              onClick={resetForm}
              disabled={loading}
            >
              Clear
            </button>

            <button
              className="btn ghost logout-btn"
              type="button"
              disabled={loading}
              onClick={async () => {
                await signOut(auth);
              }}
            >
              Logout
            </button>
          </div>

          {/* STATUS */}
          {status && <div className="alert">{status}</div>}
        </div>
      </div>
    </div>
  );
}