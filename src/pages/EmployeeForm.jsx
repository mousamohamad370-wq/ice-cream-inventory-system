import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";


function yyyy_mm_dd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function EmployeeForm() {
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [dateStr, setDateStr] = useState(yyyy_mm_dd());

  const [regular, setRegular] = useState("");
  const [diet, setDiet] = useState("");
  const [cream, setCream] = useState("");
  const [avocado, setAvocado] = useState("");
  const [merryQty, setMerryQty] = useState("");
  const [freeRegular, setFreeRegular] = useState("");
  const [freeCream, setFreeCream] = useState("");
  const [notes, setNotes] = useState("");

  // جلب branchName من users/{uid}
  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? snap.data() : null;

        if (!data?.branchName || data?.role !== "employee") {
          setStatus("❌ This account is not assigned to a branch (ask admin to assign UID).");
          return;
        }

        setBranch(data.branchName);
      } catch (e) {
        console.error(e);
        setStatus("❌ Failed to load user branch: " + e.message);
      }
    })();
  }, []);

  const resetForm = () => {
    setEmployeeName("");
    // التاريخ خليه اليوم (أو خليه ثابت إذا بدك)
    setDateStr(yyyy_mm_dd());
    setRegular("");
    setDiet("");
    setCream("");
    setAvocado("");
    setMerryQty("");
    setFreeRegular("");
    setFreeCream("");
    setNotes("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setStatus("❌ Not logged in");
        return;
      }
      if (!branch) {
        setStatus("❌ No branch assigned to this account (Admin must assign UID).");
        return;
      }
      if (!employeeName.trim()) {
        setStatus("❌ Enter employee name");
        return;
      }

      const dateTs = Timestamp.fromDate(new Date(dateStr + "T00:00:00"));

      const payload = {
        dateStr,
        dateTs,
        branchName: branch, // مهم: من users فقط
        employeeName: employeeName.trim(),

        regular: num(regular),
        diet: num(diet),
        cream: num(cream),
        avocado: num(avocado),
        merryQty: num(merryQty),

        freeRegular: num(freeRegular),
        freeCream: num(freeCream),

        notes: notes || "",

        createdAt: serverTimestamp(),
        createdBy: uid,
      };

      console.log("SENDING DOC:", payload);

      await addDoc(collection(db, "inventory"), payload);

      alert("✅ تم ارسال الجردة بنجاح");
      resetForm();
      setStatus("✅ Saved to Firestore (inventory)");
    } catch (e2) {
      console.error("SAVE ERROR:", e2);
      setStatus("❌ SAVE ERROR: " + (e2?.message || String(e2)));
    }
  };

  return (
    <div className="page">
      <div className="card wide">
        <h2 className="title">Employee Inventory Form</h2>
        <p className="muted">Branch: <b>{branch || "..."}</b></p>

        <form onSubmit={submit} className="form">
          <div className="grid2">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>

            <div>
              <label className="label">Employee Name (اسم الموظف)</label>
              <input className="input" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="محمد" />
            </div>

            <div>
              <label className="label">Regular (Kg) - عادي</label>
              <input className="input" value={regular} onChange={(e) => setRegular(e.target.value)} />
            </div>
            <div>
              <label className="label">Diet (Kg) - دايت</label>
              <input className="input" value={diet} onChange={(e) => setDiet(e.target.value)} />
            </div>

            <div>
              <label className="label">Cream (Kg) - قشطة</label>
              <input className="input" value={cream} onChange={(e) => setCream(e.target.value)} />
            </div>
            <div>
              <label className="label">Avocado (Kg) - أفوكادو</label>
              <input className="input" value={avocado} onChange={(e) => setAvocado(e.target.value)} />
            </div>

            <div>
              <label className="label">Merrycream (Qty) - عدد</label>
              <input className="input" value={merryQty} onChange={(e) => setMerryQty(e.target.value)} />
            </div>

            <div>
              <label className="label">Free Regular (Kg)</label>
              <input className="input" value={freeRegular} onChange={(e) => setFreeRegular(e.target.value)} />
            </div>

            <div>
              <label className="label">Free Cream (Kg)</label>
              <input className="input" value={freeCream} onChange={(e) => setFreeCream(e.target.value)} />
            </div>

            <div>
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="free 2 kilos..." />
            </div>
          </div>

          <button className="btn" type="submit">Send Inventory</button>
          <button className="btn ghost" type="button" onClick={resetForm}>Clear</button>
            <button
    className="btn ghost"
    type="button"
    onClick={async () => {
      await signOut(auth);
    }}
  >
    Logout
  </button>

          

          {status && <div className="alert">{status}</div>}
        </form>
      </div>
    </div>
  );
}