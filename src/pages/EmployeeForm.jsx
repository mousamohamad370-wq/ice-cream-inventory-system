import { useEffect, useMemo, useRef, useState } from "react";
import "../style/EmployeeForm.css";
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
  dietClosed: 5.3,
  dietBigClosed: 7.2,
  avocadoClosed: 6.1,
  ashtaClosed: 7.3,
};

const MERRY_KG_PER_QTY = 0.22;
const DUPLICATE_SUBMIT_WINDOW_MS = 15000;

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

  const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isSuspiciousOpenKg(value) {
  const cleaned = normalizeNumberInput(value, true);
  if (!cleaned) return false;
  return !cleaned.includes(".") && cleaned.length >= 4;
}

function hasNegative(values) {
  return values.some((v) => Number(v) < 0);
}

function buildSubmissionFingerprint({ dateStr, branch, employeeName, numbers }) {
  return [
    dateStr,
    branch,
    employeeName.trim(),
    numbers.regularBigClosedCountNum,
    numbers.regularBigOpenKgNum,
    numbers.regularSmallClosedCountNum,
    numbers.regularSmallOpenKgNum,
    numbers.dietClosedCountNum,
    numbers.dietOpenKgNum,
    numbers.dietBigClosedCountNum,
    numbers.dietBigOpenKgNum,
    numbers.ashtaClosedCountNum,
    numbers.ashtaOpenKgNum,
    numbers.avocadoClosedCountNum,
    numbers.avocadoOpenKgNum,
    numbers.merryQtyNum,
    numbers.freeRegularNum,
    numbers.freeAshtaAvocadoNum,
  ].join("|");
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  warning = "",
  disabled = false,
  type = "text",
  dir,
  readOnly = false,
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
        disabled={disabled}
        readOnly={readOnly}
        type={type}
        dir={dir}
      />
      {warning ? <div className="field-warning">{warning}</div> : null}
    </div>
  );
}

function PreviewPill({ label, value }) {
  return (
    <span>
      {label}: {value}
    </span>
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

  const [ashtaClosedCount, setAshtaClosedCount] = useState("");
  const [ashtaOpenKg, setAshtaOpenKg] = useState("");

  const [avocadoClosedCount, setAvocadoClosedCount] = useState("");
  const [avocadoOpenKg, setAvocadoOpenKg] = useState("");

  const [merryQty, setMerryQty] = useState("");
  const [freeRegular, setFreeRegular] = useState("");
  const [freeAshtaAvocado, setFreeAshtaAvocado] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const submitLockRef = useRef(false);
  const lastSubmitRef = useRef({
    fingerprint: "",
    at: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? snap.data() : null;

        if (!data?.branchName || data?.role !== "employee") {
          setStatus("❌ هالحساب ما عنده فرع موظف صحيح.");
          return;
        }

        setBranch(data.branchName);
      } catch (e) {
        console.error(e);
        setStatus("❌ فشل تحميل بيانات الفرع: " + (e?.message || String(e)));
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

    setAshtaClosedCount("");
    setAshtaOpenKg("");

    setAvocadoClosedCount("");
    setAvocadoOpenKg("");

    setMerryQty("");
    setFreeRegular("");
    setFreeAshtaAvocado("");
    setNotes("");
    setStatus("");
  };

  const warnings = useMemo(
    () => ({
      regularBigOpenKg: isSuspiciousOpenKg(regularBigOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      regularSmallOpenKg: isSuspiciousOpenKg(regularSmallOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      dietOpenKg: isSuspiciousOpenKg(dietOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      dietBigOpenKg: isSuspiciousOpenKg(dietBigOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      ashtaOpenKg: isSuspiciousOpenKg(ashtaOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      avocadoOpenKg: isSuspiciousOpenKg(avocadoOpenKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.23"
        : "",
      freeRegular: isSuspiciousOpenKg(freeRegular)
        ? "⚠️ تأكد من الوزن، ربما ناقصه فاصلة"
        : "",
      freeAshtaAvocado: isSuspiciousOpenKg(freeAshtaAvocado)
        ? "⚠️ تأكد من الوزن، ربما ناقصه فاصلة"
        : "",
    }),
    [
      regularBigOpenKg,
      regularSmallOpenKg,
      dietOpenKg,
      dietBigOpenKg,
      ashtaOpenKg,
      avocadoOpenKg,
      freeRegular,
      freeAshtaAvocado,
    ]
  );

  const hasWarnings = Object.values(warnings).some(Boolean);

  const numbers = useMemo(() => {
    const regularBigClosedCountNum = parseNumber(regularBigClosedCount, false);
    const regularBigOpenKgNum = parseNumber(regularBigOpenKg, true);

    const regularSmallClosedCountNum = parseNumber(regularSmallClosedCount, false);
    const regularSmallOpenKgNum = parseNumber(regularSmallOpenKg, true);

    const dietClosedCountNum = parseNumber(dietClosedCount, false);
    const dietOpenKgNum = parseNumber(dietOpenKg, true);

    const dietBigClosedCountNum = parseNumber(dietBigClosedCount, false);
    const dietBigOpenKgNum = parseNumber(dietBigOpenKg, true);

    const ashtaClosedCountNum = parseNumber(ashtaClosedCount, false);
    const ashtaOpenKgNum = parseNumber(ashtaOpenKg, true);

    const avocadoClosedCountNum = parseNumber(avocadoClosedCount, false);
    const avocadoOpenKgNum = parseNumber(avocadoOpenKg, true);

    const merryQtyNum = parseNumber(merryQty, false);
    const freeRegularNum = parseNumber(freeRegular, true);
    const freeAshtaAvocadoNum = parseNumber(freeAshtaAvocado, true);

    return {
      regularBigClosedCountNum,
      regularBigOpenKgNum,
      regularSmallClosedCountNum,
      regularSmallOpenKgNum,
      dietClosedCountNum,
      dietOpenKgNum,
      dietBigClosedCountNum,
      dietBigOpenKgNum,
      ashtaClosedCountNum,
      ashtaOpenKgNum,
      avocadoClosedCountNum,
      avocadoOpenKgNum,
      merryQtyNum,
      freeRegularNum,
      freeAshtaAvocadoNum,
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
    ashtaClosedCount,
    ashtaOpenKg,
    avocadoClosedCount,
    avocadoOpenKg,
    merryQty,
    freeRegular,
    freeAshtaAvocado,
  ]);

  const preview = useMemo(() => {
    const regularBigTotalKg = round2(
      numbers.regularBigClosedCountNum * TANK_WEIGHTS.regularBigClosed +
        numbers.regularBigOpenKgNum
    );
    const regularSmallTotalKg = round2(
      numbers.regularSmallClosedCountNum * TANK_WEIGHTS.regularSmallClosed +
        numbers.regularSmallOpenKgNum
    );
    const dietTotalKg = round2(
      numbers.dietClosedCountNum * TANK_WEIGHTS.dietClosed + numbers.dietOpenKgNum
    );
    const dietBigTotalKg = round2(
      numbers.dietBigClosedCountNum * TANK_WEIGHTS.dietBigClosed +
        numbers.dietBigOpenKgNum
    );
    const ashtaTotalKg = round2(
      numbers.ashtaClosedCountNum * TANK_WEIGHTS.ashtaClosed + numbers.ashtaOpenKgNum
    );
    const avocadoTotalKg = round2(
      numbers.avocadoClosedCountNum * TANK_WEIGHTS.avocadoClosed +
        numbers.avocadoOpenKgNum
    );
    const merryKg = round2(numbers.merryQtyNum * MERRY_KG_PER_QTY);

    const totalRegularAllKg = round2(regularBigTotalKg + regularSmallTotalKg);
    const totalDietAllKg = round2(dietTotalKg + dietBigTotalKg);
    const totalAshtaAvocadoKg = round2(ashtaTotalKg + avocadoTotalKg);
    const grandTotalKg = round2(
      totalRegularAllKg + totalDietAllKg + totalAshtaAvocadoKg + merryKg
    );

    return {
      regularBigTotalKg,
      regularSmallTotalKg,
      dietTotalKg,
      dietBigTotalKg,
      ashtaTotalKg,
      avocadoTotalKg,
      merryKg,
      totalRegularAllKg,
      totalDietAllKg,
      totalAshtaAvocadoKg,
      grandTotalKg,
    };
  }, [numbers]);

  const submit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || saving) return;

    setStatus("");

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setStatus("❌ لازم تكون مسجل دخول");
        return;
      }

      if (!branch) {
        setStatus("❌ ما في فرع مربوط بهالحساب");
        return;
      }

      if (!employeeName.trim()) {
        setStatus("❌ لازم تكتب اسم الموظف");
        return;
      }

      if (!dateStr) {
        setStatus("❌ لازم تختار التاريخ");
        return;
      }

      if (hasWarnings) {
        setStatus("❌ يوجد أوزان تحتاج مراجعة قبل الإرسال. تأكد من الفاصلة العشرية.");
        return;
      }

      if (
        hasNegative([
          numbers.regularBigClosedCountNum,
          numbers.regularBigOpenKgNum,
          numbers.regularSmallClosedCountNum,
          numbers.regularSmallOpenKgNum,
          numbers.dietClosedCountNum,
          numbers.dietOpenKgNum,
          numbers.dietBigClosedCountNum,
          numbers.dietBigOpenKgNum,
          numbers.ashtaClosedCountNum,
          numbers.ashtaOpenKgNum,
          numbers.avocadoClosedCountNum,
          numbers.avocadoOpenKgNum,
          numbers.merryQtyNum,
          numbers.freeRegularNum,
          numbers.freeAshtaAvocadoNum,
        ])
      ) {
        setStatus("❌ لا يمكن إدخال قيم سالبة");
        return;
      }

      const fingerprint = buildSubmissionFingerprint({
        dateStr,
        branch,
        employeeName,
        numbers,
      });

      const now = Date.now();
      const isFastDuplicate =
        lastSubmitRef.current.fingerprint === fingerprint &&
        now - lastSubmitRef.current.at < DUPLICATE_SUBMIT_WINDOW_MS;

      if (isFastDuplicate) {
        setStatus("⚠️ نفس الجردة انبعتت قبل شوي. إذا بدك جردة جديدة بدّل القيم أو انتظر قليلاً.");
        return;
      }

      submitLockRef.current = true;
      setSaving(true);

      const dateTs = Timestamp.fromDate(new Date(`${dateStr}T00:00:00`));

      const payload = {
        type: "inventory",

        dateStr,
        dateTs,

        branchName: branch,
        employeeName: employeeName.trim(),

        weightsReference: TANK_WEIGHTS,
        merryKgPerQty: MERRY_KG_PER_QTY,

        regularBigClosedCount: numbers.regularBigClosedCountNum,
        regularBigOpenKg: numbers.regularBigOpenKgNum,
        regularBigTotalKg: preview.regularBigTotalKg,

        regularSmallClosedCount: numbers.regularSmallClosedCountNum,
        regularSmallOpenKg: numbers.regularSmallOpenKgNum,
        regularSmallTotalKg: preview.regularSmallTotalKg,

        dietClosedCount: numbers.dietClosedCountNum,
        dietOpenKg: numbers.dietOpenKgNum,
        dietTotalKg: preview.dietTotalKg,

        dietBigClosedCount: numbers.dietBigClosedCountNum,
        dietBigOpenKg: numbers.dietBigOpenKgNum,
        dietBigTotalKg: preview.dietBigTotalKg,

        ashtaClosedCount: numbers.ashtaClosedCountNum,
        ashtaOpenKg: numbers.ashtaOpenKgNum,
        ashtaTotalKg: preview.ashtaTotalKg,

        creamClosedCount: numbers.ashtaClosedCountNum,
        creamOpenKg: numbers.ashtaOpenKgNum,
        creamTotalKg: preview.ashtaTotalKg,

        avocadoClosedCount: numbers.avocadoClosedCountNum,
        avocadoOpenKg: numbers.avocadoOpenKgNum,
        avocadoTotalKg: preview.avocadoTotalKg,

        totalRegularAllKg: preview.totalRegularAllKg,
        totalDietAllKg: preview.totalDietAllKg,
        totalAshtaAvocadoKg: preview.totalAshtaAvocadoKg,
        grandTotalKg: preview.grandTotalKg,

        merryQty: numbers.merryQtyNum,
        merryKg: preview.merryKg,

        freeRegular: numbers.freeRegularNum,
        freeAshtaAvocado: numbers.freeAshtaAvocadoNum,
        freeCream: numbers.freeAshtaAvocadoNum,

        notes: notes.trim(),

        createdAt: serverTimestamp(),
        createdBy: uid,
      };

      await addDoc(collection(db, "inventory"), payload);

      lastSubmitRef.current = {
        fingerprint,
        at: now,
      };

      alert("✅ تم إرسال الجردة بنجاح");
      resetForm();
      setStatus("✅ تم حفظ الجردة بنجاح");
    } catch (e2) {
      console.error("SAVE ERROR:", e2);
      setStatus("❌ SAVE ERROR: " + (e2?.message || String(e2)));
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="card wide employee-page-card">
        <div className="employee-form-header">
          <div>
            <h2 className="title">نموذج جرد الموظف</h2>
            <p className="muted">
              الفرع: <b>{branch || "..."}</b>
            </p>
          </div>
        </div>

        <div className="employee-top-nav">
          <button
            className="btn ghost active"
            type="button"
            onClick={() => (window.location.href = "/employee")}
          >
            📦 Inventory
          </button>

          <button
            className="btn ghost"
            type="button"
            onClick={() => (window.location.href = "/employee/incoming")}
          >
            🚚 Incoming
          </button>

          <button
            className="btn ghost"
            type="button"
            onClick={() => (window.location.href = "/employee/order")}
          >
            🧾 Order Suggestion
          </button>
        </div>

        <div className="employee-instructions">
          <h3>📦 طريقة تسجيل البيانات</h3>

          <div className="instruction-step">
            <span>1</span>
            <p>
              <b>الوارد أولاً:</b> إذا وصل بضاعة، سجّل الوارد قبل أي جرد.
            </p>
          </div>

          <div className="instruction-step">
            <span>2</span>
            <p>
              <b>ثم الجردة:</b> سجّل الموجود الفعلي داخل الفرع بدقة.
            </p>
          </div>

          <div className="instruction-step">
            <span>3</span>
            <p>
              <b>راجع الأوزان:</b> تأكد من الفاصلة العشرية قبل الإرسال.
            </p>
          </div>

          <div className="instruction-warning">
            ⚠️ لا تسجّل وارد بعد الجردة، وإذا ما في وارد اعمل الجردة مباشرة.
          </div>

          <div className="instruction-flow">📦 جردة → 🚚 وارد → 📦 جردة</div>
        </div>

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
                type="date"
                dir="ltr"
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
                dir="ltr"
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
                dir="ltr"
              />

              <Field
                label="بوظة صغير مختوم (5.3 كغ) - عدد"
                value={regularSmallClosedCount}
                onChange={(e) =>
                  setRegularSmallClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
                dir="ltr"
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
                dir="ltr"
              />
            </div>

            <div className="totals-preview">
              <PreviewPill label="كبير" value={`${preview.regularBigTotalKg} كغ`} />
              <PreviewPill label="صغير" value={`${preview.regularSmallTotalKg} كغ`} />
              <PreviewPill label="المجموع" value={`${preview.totalRegularAllKg} كغ`} />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">بوظة دايت</h3>
            <div className="grid2">
              <Field
                label="بوظة دايت مختوم (5.3 كغ) - عدد"
                value={dietClosedCount}
                onChange={(e) =>
                  setDietClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
                dir="ltr"
              />
              <Field
                label="بوظة دايت مفتوح (كغ)"
                value={dietOpenKg}
                onChange={(e) => setDietOpenKg(normalizeNumberInput(e.target.value, true))}
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.dietOpenKg}
                dir="ltr"
              />

              <Field
                label="بوظة دايت كبير مختوم (7.2 كغ) - عدد"
                value={dietBigClosedCount}
                onChange={(e) =>
                  setDietBigClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
                dir="ltr"
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
                dir="ltr"
              />
            </div>

            <div className="totals-preview">
              <PreviewPill label="دايت" value={`${preview.dietTotalKg} كغ`} />
              <PreviewPill label="دايت كبير" value={`${preview.dietBigTotalKg} كغ`} />
              <PreviewPill label="المجموع" value={`${preview.totalDietAllKg} كغ`} />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">قشطة وأفوكادو</h3>
            <div className="grid2">
              <Field
                label="قشطة مختوم (7.3 كغ) - عدد"
                value={ashtaClosedCount}
                onChange={(e) =>
                  setAshtaClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
                dir="ltr"
              />
              <Field
                label="قشطة مفتوح (كغ)"
                value={ashtaOpenKg}
                onChange={(e) => setAshtaOpenKg(normalizeNumberInput(e.target.value, true))}
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.ashtaOpenKg}
                dir="ltr"
              />

              <Field
                label="أفوكادو مختوم (6.1 كغ) - عدد"
                value={avocadoClosedCount}
                onChange={(e) =>
                  setAvocadoClosedCount(normalizeNumberInput(e.target.value, false))
                }
                placeholder="0"
                inputMode="numeric"
                dir="ltr"
              />
              <Field
                label="أفوكادو مفتوح (كغ)"
                value={avocadoOpenKg}
                onChange={(e) =>
                  setAvocadoOpenKg(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 12.5"
                inputMode="decimal"
                warning={warnings.avocadoOpenKg}
                dir="ltr"
              />
            </div>

            <div className="totals-preview">
              <PreviewPill label="قشطة" value={`${preview.ashtaTotalKg} كغ`} />
              <PreviewPill label="أفوكادو" value={`${preview.avocadoTotalKg} كغ`} />
              <PreviewPill label="المجموع" value={`${preview.totalAshtaAvocadoKg} كغ`} />
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
                dir="ltr"
              />
              <Field
                label="Merry Cream (Kg)"
                value={String(preview.merryKg)}
                onChange={() => {}}
                placeholder="0"
                inputMode="decimal"
                disabled
                readOnly
                dir="ltr"
              />

              <Field
                label="Free Regular (كغ)"
                value={freeRegular}
                onChange={(e) => setFreeRegular(normalizeNumberInput(e.target.value, true))}
                placeholder="مثال: 2.5"
                inputMode="decimal"
                warning={warnings.freeRegular}
                dir="ltr"
              />
              <Field
                label="Free Ashta+Avocado (كغ)"
                value={freeAshtaAvocado}
                onChange={(e) =>
                  setFreeAshtaAvocado(normalizeNumberInput(e.target.value, true))
                }
                placeholder="مثال: 1.5"
                inputMode="decimal"
                warning={warnings.freeAshtaAvocado}
                dir="ltr"
              />

              <Field
                label="Notes (ملاحظات)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="free 2 kilos..."
              />
            </div>

           
          </div>

          <div className="section">
            <h3 className="section-title">الملخص النهائي</h3>
            <div className="totals-preview">
              <PreviewPill label="Regular" value={`${preview.totalRegularAllKg} كغ`} />
              <PreviewPill label="Diet" value={`${preview.totalDietAllKg} كغ`} />
              <PreviewPill label="Ashta+Avocado" value={`${preview.totalAshtaAvocadoKg} كغ`} />
              <PreviewPill label="Merry" value={`${preview.merryKg} كغ`} />
              <PreviewPill label="Total" value={`${preview.grandTotalKg} كغ`} />
            </div>
          </div>

          <div className="actions employee-form-actions">
            <button className="btn" type="submit" disabled={saving || !branch}>
              {saving ? "Sending..." : "Send Inventory"}
            </button>

            <button className="btn ghost" type="button" onClick={resetForm} disabled={saving}>
              Clear
            </button>

            <button
              className="btn ghost logout-btn"
              type="button"
              disabled={saving}
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