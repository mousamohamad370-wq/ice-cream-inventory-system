import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, BRANCHES } from "../firebaseConfig";

export default function AdminAssign() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("employee"); // admin / employee
  const [branchName, setBranchName] = useState(BRANCHES[0]);
  const [status, setStatus] = useState("");

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
    }
  };

  return (
    <div className="page">
      <div className="card wide">
        <h2 className="title">Admin Assign</h2>
        <p className="muted">Paste UID and assign role/branch</p>

        <div className="grid2">
          <div>
            <label className="label">UID</label>
            <input className="input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Paste UID here" />
          </div>

          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label className="label">Branch</label>
            <select className="input" value={branchName} onChange={(e) => setBranchName(e.target.value)} disabled={role === "admin"}>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn" onClick={save}>Save</button>
        {status && <div className="alert">{status}</div>}

        <div className="hint">
         
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
  <a href="/admin/export">📥 Export Excel</a>
  <a href="/admin/assign">👤 Assign Users</a>
</div>
      </div>
    </div>
    
  );
  
}
