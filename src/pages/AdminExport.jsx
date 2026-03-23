import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where ,Timestamp} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { buildWorkbookFromInventory, downloadWorkbook } from "../utils/inventoryExcel";
import { signOut } from "firebase/auth";

function daysBetween(fromDate, toDate) {
  const from = new Date(fromDate + "T00:00:00");
  const to = new Date(toDate + "T00:00:00");
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
function startOfDayTimestamp(dateStr) {
  return Timestamp.fromDate(new Date(dateStr + "T00:00:00"));
}

function endOfDayTimestamp(dateStr) {
  return Timestamp.fromDate(new Date(dateStr + "T23:59:59"));
}

export default function AdminExport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);

  const dateError = useMemo(() => {
    if (!fromDate || !toDate) return "";

    if (fromDate > toDate) {
      return "❌ تاريخ البداية لازم يكون قبل تاريخ النهاية";
    }

    const diff = daysBetween(fromDate, toDate);
    if (diff > 62) {
      return "❌ المدة كبيرة جدًا. الرجاء اختيار مدة لا تتجاوز شهرين";
    }

    return "";
  }, [fromDate, toDate]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!fromDate || !toDate || dateError) {
        setPreviewRows([]);
        return;
      }

      try {
        setPreviewLoading(true);

      const qy = query(
  collection(db, "inventory"),
  where("dateTs", ">=", startOfDayTimestamp(fromDate)),
  where("dateTs", "<=", endOfDayTimestamp(toDate))
);

        const snap = await getDocs(qy);

        const rows = [];
        snap.forEach((docu) => {
          const it = docu.data();
          rows.push({
            id: docu.id,
            dateStr: it.dateStr || "",
            branchName: (it.branchName || "Unknown").toString().trim() || "Unknown",
            employeeName: (it.employeeName || "").toString().trim(),
          });
        });

        rows.sort((a, b) => {
          if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
          return a.branchName.localeCompare(b.branchName);
        });

        setPreviewRows(rows);
      } catch (e) {
        console.error("PREVIEW ERROR:", e);
        setPreviewRows([]);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [fromDate, toDate, dateError]);

  const exportExcel = async () => {
    setStatus("");

    try {
      if (!fromDate || !toDate) {
        setStatus("❌ Please select From / To");
        return;
      }

      if (dateError) {
        setStatus(dateError);
        return;
      }

      setLoading(true);
const qy = query(
  collection(db, "inventory"),
  where("dateTs", ">=", startOfDayTimestamp(fromDate)),
  where("dateTs", "<=", endOfDayTimestamp(toDate))
);

      const snap = await getDocs(qy);

      if (snap.empty) {
        setStatus("❌ No data in this range");
        return;
      }

      const groupedByBranch = {};

      snap.forEach((docu) => {
        const it = docu.data();
        const branchName = (it.branchName || "Unknown").toString().trim() || "Unknown";

        if (!groupedByBranch[branchName]) groupedByBranch[branchName] = [];
        groupedByBranch[branchName].push(it);
      });

      const wb = buildWorkbookFromInventory({
        groupedByBranch,
        fromDate,
        toDate,
      });

      downloadWorkbook(wb, `IceCream_Inventory_${fromDate}_to_${toDate}.xlsx`);

      setStatus(`✅ Excel downloaded successfully (${snap.size} rows)`);
    } catch (e) {
      console.error(e);
      setStatus("❌ Export failed: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Admin – Export Excel</h2>
        <p className="muted">اختر الفترة المطلوبة ثم نزّل ملف الإكسل.</p>

        <div className="form">
          <div className="grid2">
            <div>
              <label className="label">From</label>
              <input
                className="input"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">To</label>
              <input
                className="input"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {dateError ? <div className="alert">{dateError}</div> : null}

          {!dateError && fromDate && toDate ? (
            <div className="section">
              <h3 className="section-title">الجردات الموجودة ضمن الفترة</h3>

              {previewLoading ? (
                <div className="muted">جاري التحقق...</div>
              ) : previewRows.length === 0 ? (
                <div className="alert">لا توجد جردات ضمن هذه الفترة</div>
              ) : (
                <>
                  <div className="alert">
                    موجود {previewRows.length} جردة ضمن الفترة المحددة
                  </div>

                  <div className="inventory-list">
                    {previewRows.map((row) => (
                      <div key={row.id} className="inventory-item">
                        <div>
                          <strong>{row.branchName}</strong>
                          {row.employeeName ? ` — ${row.employeeName}` : ""}
                        </div>
                        <div className="muted">{row.dateStr}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="actions">
            <button className="btn" onClick={exportExcel} disabled={loading}>
              {loading ? "Preparing Excel..." : "Download Excel"}
            </button>

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