import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { buildWorkbookFromInventory, downloadWorkbook } from "../utils/inventoryExcel";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function AdminExport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");

  const exportExcel = async () => {
    setStatus("");
    try {
      if (!fromDate || !toDate) {
        setStatus("❌ Please select From / To");
        return;
      }

      // ✅ فلترة قوية على string بصيغة YYYY-MM-DD (بتشتغل 100%)
      const qy = query(
        collection(db, "inventory"),
        where("dateStr", ">=", fromDate),
        where("dateStr", "<=", toDate)
      );

      const snap = await getDocs(qy);

      console.log("FILTER:", { fromDate, toDate, count: snap.size });

      if (snap.empty) {
        setStatus("❌ No data in this range");
        return;
      }

      // group by branch
      const groupedByBranch = {};
      snap.forEach((docu) => {
        const it = docu.data();

        const b = (it.branchName || "Unknown").toString().trim() || "Unknown";
        if (!groupedByBranch[b]) groupedByBranch[b] = [];
        groupedByBranch[b].push(it);
      });

      const wb = buildWorkbookFromInventory({ groupedByBranch, fromDate, toDate });
      downloadWorkbook(wb, `IceCream_Inventory_${fromDate}_to_${toDate}.xlsx`);

      setStatus(`✅ Excel downloaded (${snap.size} rows)`);
    } catch (e) {
      console.error(e);
      setStatus("❌ Export failed: " + (e?.message || String(e)));
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Admin – Export Excel</h2>

        <label className="label">From</label>
        <input
          className="input"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <label className="label">To</label>
        <input
          className="input"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <button className="btn" onClick={exportExcel}>
          Download Excel
        </button>
                  <button
            className="btn ghost"
            type="button"
            onClick={async () => {
              await signOut(auth);
            }}
          >
            Logout
          </button>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
  <a href="/admin/export">📥 Export Excel</a>
  <a href="/admin/assign">👤 Assign Users</a>
</div>

        {status && <div className="alert">{status}</div>}
      </div>
    </div>
  );
}