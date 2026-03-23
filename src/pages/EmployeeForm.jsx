import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";

function yyyy_mm_dd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TANK_WEIGHTS = {
  regularBigClosed: 8.3,
  regularSmallClosed: 5.3,
  dietClosed: 5,
  dietBigClosed: 7.2,
  avocadoClosed: 6.1,
  creamClosed: 7.3,
};

const OPEN_KG_WARNING_LIMIT = 30;

function convertArabicDigits(value) {
  const arabicNums = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicNums = "۰۱۲۳۴۵۶۷۸۹";

  return String(value)
    .split("")
    .map((ch) => {
      const i1 = arabicNums.indexOf(ch);
      if (i1 !== -1) return String(i1);

      const i2 = easternArabicNums.indexOf(ch);
      if (i2 !== -1) return String(i2);

      return ch;
    })
    .join("");
}

function normalizeNumberInput(value, allowDecimal = true) {
  if (value === null || value === undefined) return "";

  let v = convertArabicDigits(String(value).trim());

  v = v.replace(/,/g, ".");
  v = v.replace(/،/g, ".");
  v = v.replace(/[^\d.]/g, "");

  if (allowDecimal) {
    if (v.startsWith(".")) v = "0" + v;

    const firstDot = v.indexOf(".");
    if (firstDot !== -1) {
      const before = v.slice(0, firstDot + 1);
      const after = v.slice(firstDot + 1).replace(/\./g, "");
      v = before + after;
    }
  } else {
    v = v.replace(/\./g, "");
  }

  return v;
}

function parseNumber(value, allowDecimal = true) {
  const cleaned = normalizeNumberInput(value, allowDecimal);
  if (!cleaned || cleaned === ".") return 0;

  const n = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isSuspiciousOpenKg(value) {
  const cleaned = normalizeNumberInput(value, true);

  if (!cleaned) return false;
  if (!cleaned.includes(".") && cleaned.length >= 4) return true;

  const n = parseNumber(cleaned, true);
    if (!cleaned.includes(".") && cleaned.length >= 4) {
    return true;
  }

  return false;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  warning = "",
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className={`input ${warning ? "input-warning" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
      />
      {warning ? <div className="field-warning">{warning}</div> : null}
    </div>
  );
}

export default function EmployeeForm() {
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [dateStr, setDateStr] = useState(yyyy_mm_dd());

  const [regularBigClosedCount, setRegularBigClosedCount] = useState("");
  const [regularBigOpenKg, setRegularBigOpenKg] = useState("");

  const [regularSmallClosedCount, setRegularSmallClosedCount] = useState("");
  const [regularSmallOpenKg, setRegularSmallOpenKg] = useState("");

  const [dietClosedCount, setDietClosedCount] = useState("");
  const [dietOpenKg, setDietOpenKg] = useState("");

  const [dietBigClosedCount, setDietBigClosedCount] = useState("");
  const [dietBigOpenKg, setDietBigOpenKg] = useState("");

  const [creamClosedCount, setCreamClosedCount] = useState("");
  const [creamOpenKg, setCreamOpenKg] = useState("");

  const [avocadoClosedCount, setAvocadoClosedCount] = useState("");
  const [avocadoOpenKg, setAvocadoOpenKg] = useState("");

  const [merryQty, setMerryQty] = useState("");
  const [freeRegular, setFreeRegular] = useState("");
  const [freeCream, setFreeCream] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? snap.data() : null;

        if (!data?.branchName || data?.role !== "employee") {
          setStatus("❌ This account is not assigned to a branch.");
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
    setDateStr(yyyy_mm_dd());

    setRegularBigClosedCount("");
    setRegularBigOpenKg("");

    setRegularSmallClosedCount("");
    setRegularSmallOpenKg("");

    setDietClosedCount("");
    setDietOpenKg("");

    setDietBigClosedCount("");
    setDietBigOpenKg("");

    setCreamClosedCount("");
    setCreamOpenKg("");

    setAvocadoClosedCount("");
    setAvocadoOpenKg("");

    setMerryQty("");
    setFreeRegular("");
    setFreeCream("");
    setNotes("");
    setStatus("");
  };

  const warnings = useMemo(
    () => ({
      regularBigOpenKg: isSuspiciousOpenKg(regularBigOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      regularSmallOpenKg: isSuspiciousOpenKg(regularSmallOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      dietOpenKg: isSuspiciousOpenKg(dietOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      dietBigOpenKg: isSuspiciousOpenKg(dietBigOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      creamOpenKg: isSuspiciousOpenKg(creamOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      avocadoOpenKg: isSuspiciousOpenKg(avocadoOpenKg)
        ? "⚠️ الوزن كبير أو ربما ناقصه فاصلة، مثال صحيح: 12.5"
        : "",
      freeRegular: isSuspiciousOpenKg(freeRegular)
        ? "⚠️ تأكد من الوزن المدخل"
        : "",
      freeCream: isSuspiciousOpenKg(freeCream)
        ? "⚠️ تأكد من الوزن المدخل"
        : "",
    }),
    [
      regularBigOpenKg,
      regularSmallOpenKg,
      dietOpenKg,
      dietBigOpenKg,
      creamOpenKg,
      avocadoOpenKg,
      freeRegular,
      freeCream,
    ]
  );

  const hasWarnings = Object.values(warnings).some(Boolean);

  const preview = useMemo(() => {
    const regularBigClosedCountNum = parseNumber(regularBigClosedCount, false);
    const regularBigOpenKgNum = parseNumber(regularBigOpenKg, true);

    const regularSmallClosedCountNum = parseNumber(regularSmallClosedCount, false);
    const regularSmallOpenKgNum = parseNumber(regularSmallOpenKg, true);

    const dietClosedCountNum = parseNumber(dietClosedCount, false);
    const dietOpenKgNum = parseNumber(dietOpenKg, true);

    const dietBigClosedCountNum = parseNumber(dietBigClosedCount, false);
    const dietBigOpenKgNum = parseNumber(dietBigOpenKg, true);

    const creamClosedCountNum = parseNumber(creamClosedCount, false);
    const creamOpenKgNum = parseNumber(creamOpenKg, true);

    const avocadoClosedCountNum = parseNumber(avocadoClosedCount, false);
    const avocadoOpenKgNum = parseNumber(avocadoOpenKg, true);

    return {
      regularBigTotalKg: round2(
        regularBigClosedCountNum * TANK_WEIGHTS.regularBigClosed + regularBigOpenKgNum
      ),
      regularSmallTotalKg: round2(
        regularSmallClosedCountNum * TANK_WEIGHTS.regularSmallClosed + regularSmallOpenKgNum
      ),
      dietTotalKg: round2(
        dietClosedCountNum * TANK_WEIGHTS.dietClosed + dietOpenKgNum
      ),
      dietBigTotalKg: round2(
        dietBigClosedCountNum * TANK_WEIGHTS.dietBigClosed + dietBigOpenKgNum
      ),
      creamTotalKg: round2(
        creamClosedCountNum * TANK_WEIGHTS.creamClosed + creamOpenKgNum
      ),
      avocadoTotalKg: round2(
        avocadoClosedCountNum * TANK_WEIGHTS.avocadoClosed + avocadoOpenKgNum
      ),
    };
  }, [
    regularBigClosedCount,
    regularBigOpenKg,
    regularSmallClosedCount,
    regularSmallOpenKg,
    dietClosedCount,
    dietOpenKg,
    dietBigClosedCount,
    dietBigOpenKg,
    creamClosedCount,
    creamOpenKg,
    avocadoClosedCount,
    avocadoOpenKg,
  ]);

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
        setStatus("❌ No branch assigned to this account.");
        return;
      }

      if (!employeeName.trim()) {
        setStatus("❌ Enter employee name");
        return;
      }

      if (hasWarnings) {
        setStatus("❌ يوجد أوزان تحتاج مراجعة قبل الإرسال. تأكد من الفاصلة العشرية.");
        return;
      }

      const dateTs = Timestamp.fromDate(new Date(dateStr + "T00:00:00"));

      const regularBigClosedCountNum = parseNumber(regularBigClosedCount, false);
      const regularBigOpenKgNum = parseNumber(regularBigOpenKg, true);

      const regularSmallClosedCountNum = parseNumber(regularSmallClosedCount, false);
      const regularSmallOpenKgNum = parseNumber(regularSmallOpenKg, true);

      const dietClosedCountNum = parseNumber(dietClosedCount, false);
      const dietOpenKgNum = parseNumber(dietOpenKg, true);

      const dietBigClosedCountNum = parseNumber(dietBigClosedCount, false);
      const dietBigOpenKgNum = parseNumber(dietBigOpenKg, true);

      const creamClosedCountNum = parseNumber(creamClosedCount, false);
      const creamOpenKgNum = parseNumber(creamOpenKg, true);

      const avocadoClosedCountNum = parseNumber(avocadoClosedCount, false);
      const avocadoOpenKgNum = parseNumber(avocadoOpenKg, true);

      const merryQtyNum = parseNumber(merryQty, false);
      const freeRegularNum = parseNumber(freeRegular, true);
      const freeCreamNum = parseNumber(freeCream, true);

      const regularBigTotalKg = round2(
        regularBigClosedCountNum * TANK_WEIGHTS.regularBigClosed + regularBigOpenKgNum
      );
      const regularSmallTotalKg = round2(
        regularSmallClosedCountNum * TANK_WEIGHTS.regularSmallClosed + regularSmallOpenKgNum
      );
      const dietTotalKg = round2(
        dietClosedCountNum * TANK_WEIGHTS.dietClosed + dietOpenKgNum
      );
      const dietBigTotalKg = round2(
        dietBigClosedCountNum * TANK_WEIGHTS.dietBigClosed + dietBigOpenKgNum
      );
      const creamTotalKg = round2(
        creamClosedCountNum * TANK_WEIGHTS.creamClosed + creamOpenKgNum
      );
      const avocadoTotalKg = round2(
        avocadoClosedCountNum * TANK_WEIGHTS.avocadoClosed + avocadoOpenKgNum
      );

      const totalRegularAllKg = round2(regularBigTotalKg + regularSmallTotalKg);
      const totalDietAllKg = round2(dietTotalKg + dietBigTotalKg);

      const payload = {
        dateStr,
        dateTs,
        branchName: branch,
        employeeName: employeeName.trim(),

        weightsReference: TANK_WEIGHTS,

        regularBigClosedCount: regularBigClosedCountNum,
        regularBigOpenKg: regularBigOpenKgNum,
        regularBigTotalKg,

        regularSmallClosedCount: regularSmallClosedCountNum,
        regularSmallOpenKg: regularSmallOpenKgNum,
        regularSmallTotalKg,

        dietClosedCount: dietClosedCountNum,
        dietOpenKg: dietOpenKgNum,
        dietTotalKg,

        dietBigClosedCount: dietBigClosedCountNum,
        dietBigOpenKg: dietBigOpenKgNum,
        dietBigTotalKg,

        creamClosedCount: creamClosedCountNum,
        creamOpenKg: creamOpenKgNum,
        creamTotalKg,

        avocadoClosedCount: avocadoClosedCountNum,
        avocadoOpenKg: avocadoOpenKgNum,
        avocadoTotalKg,

        totalRegularAllKg,
        totalDietAllKg,

        merryQty: merryQtyNum,
        freeRegular: freeRegularNum,
        freeCream: freeCreamNum,

        notes: notes || "",

        createdAt: serverTimestamp(),
        createdBy: uid,
      };

      await addDoc(collection(db, "inventory"), payload);

      alert("✅ تم إرسال الجردة بنجاح");
      resetForm();
      setStatus("✅ Saved to Firestore");
    } catch (e2) {
      console.error("SAVE ERROR:", e2);
      setStatus("❌ SAVE ERROR: " + (e2?.message || String(e2)));
    }
  };

  return (
    <div className="page">
      <div className="card wide">
        <h2 className="title">Employee Inventory Form</h2>
        <p className="muted">
          Branch: <b>{branch || "..."}</b>
        </p>

        <form onSubmit={submit} className="form">
          <div className="section">
            <h3 className="section-title">البيانات الأساسية</h3>
            <div className="grid2">
              <Field
                label="Date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder=""
                inputMode="text"
              />
              <Field
                label="Employee Name (اسم الموظف)"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Enter employee name"
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">بوظة عادي</h3>
            <div className="grid2">
              <Field
                label="بوظة كبير مختوم (8.3 كغ) - عدد"
                value={regularBigClosedCount}
                onChange={(e) =>
                  setRegularBigClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة كبير مفتوح (كغ)"
                value={regularBigOpenKg}
                onChange={(e) =>
                  setRegularBigOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.regularBigOpenKg}
              />

              <Field
                label="بوظة صغير مختوم (5.3 كغ) - عدد"
                value={regularSmallClosedCount}
                onChange={(e) =>
                  setRegularSmallClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة صغير مفتوح (كغ)"
                value={regularSmallOpenKg}
                onChange={(e) =>
                  setRegularSmallOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.regularSmallOpenKg}
              />
            </div>

            <div className="totals-preview">
              الإجمالي المتوقع:
              <span> كبير: {preview.regularBigTotalKg} كغ </span>
              <span> صغير: {preview.regularSmallTotalKg} كغ </span>
              <span>
                المجموع: {round2(preview.regularBigTotalKg + preview.regularSmallTotalKg)} كغ
              </span>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">بوظة دايت</h3>
            <div className="grid2">
              <Field
                label="بوظة دايت مختوم (5 كغ) - عدد"
                value={dietClosedCount}
                onChange={(e) =>
                  setDietClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة دايت مفتوح (كغ)"
                value={dietOpenKg}
                onChange={(e) => setDietOpenKg(normalizeNumberInput(e.target.value, true))}
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.dietOpenKg}
              />

              <Field
                label="بوظة دايت كبير مختوم (7.2 كغ) - عدد"
                value={dietBigClosedCount}
                onChange={(e) =>
                  setDietBigClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة دايت كبير مفتوح (كغ)"
                value={dietBigOpenKg}
                onChange={(e) =>
                  setDietBigOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.dietBigOpenKg}
              />
            </div>

            <div className="totals-preview">
              الإجمالي المتوقع:
              <span> دايت: {preview.dietTotalKg} كغ </span>
              <span> دايت كبير: {preview.dietBigTotalKg} كغ </span>
              <span>
                المجموع: {round2(preview.dietTotalKg + preview.dietBigTotalKg)} كغ
              </span>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">قشطة وأفوكادو</h3>
            <div className="grid2">
              <Field
                label="بوظة قشطة مختوم (7.3 كغ) - عدد"
                value={creamClosedCount}
                onChange={(e) =>
                  setCreamClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة قشطة مفتوح (كغ)"
                value={creamOpenKg}
                onChange={(e) =>
                  setCreamOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.creamOpenKg}
              />

              <Field
                label="بوظة أفوكادو مختوم (6.1 كغ) - عدد"
                value={avocadoClosedCount}
                onChange={(e) =>
                  setAvocadoClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
              />
              <Field
                label="بوظة أفوكادو مفتوح (كغ)"
                value={avocadoOpenKg}
                onChange={(e) =>
                  setAvocadoOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.avocadoOpenKg}
              />
            </div>

            <div className="totals-preview">
              الإجمالي المتوقع:
              <span> قشطة: {preview.creamTotalKg} كغ </span>
              <span> أفوكادو: {preview.avocadoTotalKg} كغ </span>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">إضافات</h3>
            <div className="grid2">
              <Field
                label="Merry Cream - عدد"
                value={merryQty}
                onChange={(e) => setMerryQty(normalizeNumberInput(e.target.value, false))}
                placeholder="0"
                inputMode="numeric"
              />
              <div />

              <Field
                label="Free Regular (كغ)"
                value={freeRegular}
                onChange={(e) =>
                  setFreeRegular(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 2.5"
                inputMode="decimal"
                warning={warnings.freeRegular}
              />
              <Field
                label="Free Cream (كغ)"
                value={freeCream}
                onChange={(e) =>
                  setFreeCream(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 1.5"
                inputMode="decimal"
                warning={warnings.freeCream}
              />

              <Field
                label="Notes (ملاحظات)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="free 2 kilos..."
              />
            </div>
          </div>

          <div className="actions">
            <button className="btn" type="submit">
              Send Inventory
            </button>

            <button className="btn ghost" type="button" onClick={resetForm}>
              Clear
            </button>

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
        </form>
      </div>
    </div>
  );
}