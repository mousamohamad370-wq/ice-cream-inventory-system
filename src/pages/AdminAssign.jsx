import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db, BRANCHES } from "../firebaseConfig";

export default function AdminAssign() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("employee");
  const [branchName, setBranchName] = useState(BRANCHES[0] || "");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setStatus("");

    try {
      if (!auth.currentUser) {
        setStatus("❌ Not logged in");
        return;
      }

      if (!uid.trim()) {
        setStatus("❌ Paste UID first");
        return;
      }

      setLoading(true);

      await setDoc(
        doc(db, "users", uid.trim()),
        {
          role,
          branchName: role === "admin" ? "HQ" : branchName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setStatus("✅ Saved to users/" + uid.trim());
      setUid("");
    } catch (e) {
      console.error("ADMIN ASSIGN SAVE ERROR:", e);
      setStatus("❌ " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Admin Assign</h2>
        <p className="muted">Paste UID and assign role / branch</p>

        <div className="form">
          <div className="grid2">
            <div>
              <label className="label">UID</label>
              <input
                className="input"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Paste UID here"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="employee">employee</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div>
              <label className="label">Branch</label>
              <select
                className="input"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={role === "admin"}
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {role === "admin" ? (
              <div>
                <label className="label">Assigned Branch</label>
                <input className="input" value="HQ" disabled />
              </div>
            ) : null}
          </div>

          <div className="actions">
            <button className="btn" onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>

            <a
              className="btn ghost"
              href="/admin/export"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              📥 Export Excel
            </a>

            <a
              className="btn ghost"
              href="/admin/assign"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              👤 Assign Users
            </a>

            <button
              className="btn ghost logout-btn"
              type="button"
              onClick={async () => {
                await signOut(auth);
              }}
            >
              Logout
            </button>
          </div>

          {status && <div className="alert">{status}</div>}
        </div>
      </div>
    </div>
  );
}