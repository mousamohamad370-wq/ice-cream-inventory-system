import { useEffect, useMemo, useRef, useState } from "react";
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
import "../style/incomingDelivery.css";

function yyyy_mm_dd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function parseNum(v, allowDecimal = true) {
  const cleaned = normalizeNumberInput(v, allowDecimal);
  if (!cleaned || cleaned === ".") return 0;

  const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isSuspiciousWeight(value) {
  const cleaned = normalizeNumberInput(value, true);
  if (!cleaned) return false;
  return !cleaned.includes(".") && cleaned.length >= 4;
}

function hasNegative(values) {
  return values.some((v) => Number(v) < 0);
}

function buildSubmissionFingerprint({ dateStr, branch, numbers }) {
  return [
    dateStr,
    branch,
    numbers.regularKgNum,
    numbers.dietKgNum,
    numbers.ashtaAvocadoKgNum,
    numbers.merryQtyNum,
  ].join("|");
}

function Field({
  label,
  value,
  onChange,
  placeholder = "0",
  inputMode = "text",
  warning = "",
  disabled = false,
  readOnly = false,
  type = "text",
  dir,
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

export default function IncomingDelivery() {
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [dateStr, setDateStr] = useState(yyyy_mm_dd());

  const [regularKg, setRegularKg] = useState("");
  const [dietKg, setDietKg] = useState("");
  const [ashtaAvocadoKg, setAshtaAvocadoKg] = useState("");
  const [merryQty, setMerryQty] = useState("");

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
        setStatus("❌ فشل تحميل معلومات الفرع");
      }
    })();
  }, []);

  const warnings = useMemo(
    () => ({
      regularKg: isSuspiciousWeight(regularKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.25"
        : "",
      dietKg: isSuspiciousWeight(dietKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.25"
        : "",
      ashtaAvocadoKg: isSuspiciousWeight(ashtaAvocadoKg)
        ? "⚠️ الوزن يبدو بدون فاصلة، مثال صحيح: 40.25"
        : "",
    }),
    [regularKg, dietKg, ashtaAvocadoKg]
  );

  const hasWarnings = Object.values(warnings).some(Boolean);

  const numbers = useMemo(() => {
    const regularKgNum = round2(parseNum(regularKg, true));
    const dietKgNum = round2(parseNum(dietKg, true));
    const ashtaAvocadoKgNum = round2(parseNum(ashtaAvocadoKg, true));
    const merryQtyNum = parseNum(merryQty, false);
    const merryKg = round2(merryQtyNum * MERRY_KG_PER_QTY);

    return {
      regularKgNum,
      dietKgNum,
      ashtaAvocadoKgNum,
      merryQtyNum,
      merryKg,
    };
  }, [regularKg, dietKg, ashtaAvocadoKg, merryQty]);

  const preview = useMemo(() => {
    return {
      regularKg: numbers.regularKgNum,
      dietKg: numbers.dietKgNum,
      ashtaAvocadoKg: numbers.ashtaAvocadoKgNum,
      merryQty: numbers.merryQtyNum,
      merryKg: numbers.merryKg,
      totalKg: round2(
        numbers.regularKgNum +
          numbers.dietKgNum +
          numbers.ashtaAvocadoKgNum +
          numbers.merryKg
      ),
    };
  }, [numbers]);

  const resetForm = () => {
    setDateStr(yyyy_mm_dd());
    setRegularKg("");
    setDietKg("");
    setAshtaAvocadoKg("");
    setMerryQty("");
    setStatus("");
  };

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

      if (!dateStr) {
        setStatus("❌ لازم تختار التاريخ");
        return;
      }

      if (hasWarnings) {
        setStatus("❌ يوجد أوزان تحتاج مراجعة قبل الإرسال");
        return;
      }

      if (
        hasNegative([
          numbers.regularKgNum,
          numbers.dietKgNum,
          numbers.ashtaAvocadoKgNum,
          numbers.merryQtyNum,
        ])
      ) {
        setStatus("❌ لا يمكن إدخال قيم سالبة");
        return;
      }

      if (
        numbers.regularKgNum === 0 &&
        numbers.dietKgNum === 0 &&
        numbers.ashtaAvocadoKgNum === 0 &&
        numbers.merryQtyNum === 0
      ) {
        setStatus("❌ لا يمكن حفظ وارد فارغ. أدخل قيمة واحدة على الأقل.");
        return;
      }

      const fingerprint = buildSubmissionFingerprint({
        dateStr,
        branch,
        numbers,
      });

      const now = Date.now();
      const isFastDuplicate =
        lastSubmitRef.current.fingerprint === fingerprint &&
        now - lastSubmitRef.current.at < DUPLICATE_SUBMIT_WINDOW_MS;

      if (isFastDuplicate) {
        setStatus("⚠️ نفس الوارد انبعت قبل شوي. إذا قصدك إدخال جديد غيّر القيم أو انتظر قليلاً.");
        return;
      }

      submitLockRef.current = true;
      setSaving(true);

      const dateTs = Timestamp.fromDate(new Date(`${dateStr}T00:00:00`));

      const payload = {
        type: "incoming",

        dateStr,
        dateTs,
        branchName: branch,

        weeklyIncomingRegularKg: numbers.regularKgNum,

        weeklyIncomingDietKg: numbers.dietKgNum,
        weeklyIncomingDietTotalKg: numbers.dietKgNum,

        weeklyIncomingAshtaKg: numbers.ashtaAvocadoKgNum,
        weeklyIncomingCreamKg: numbers.ashtaAvocadoKgNum,
        weeklyIncomingAvocadoKg: 0,

        weeklyIncomingMerryQty: numbers.merryQtyNum,
        weeklyIncomingMerryKg: numbers.merryKg,
        weeklyIncomingTotalKg: preview.totalKg,

        merryKgPerQty: MERRY_KG_PER_QTY,

        createdAt: serverTimestamp(),
        createdBy: uid,
      };

      await addDoc(collection(db, "inventory"), payload);

      lastSubmitRef.current = {
        fingerprint,
        at: now,
      };

      alert("✅ تم تسجيل الوارد");
      resetForm();
      setStatus("✅ تم حفظ الوارد بنجاح");
    } catch (e) {
      console.error(e);
      setStatus("❌ " + (e?.message || String(e)));
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="card wide incoming-page-card">
        <div className="incoming-form-header">
          <div>
            <h2 className="title">نموذج تسجيل الوارد</h2>
            <p className="muted">
              الفرع: <b>{branch || "..."}</b>
            </p>
          </div>
        </div>

        <div className="incoming-top-nav">
          <button
            className="btn ghost"
            type="button"
            onClick={() => (window.location.href = "/employee")}
          >
            📦 Inventory
          </button>

          <button
            className="btn ghost active"
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

        <div className="incoming-instructions">
          <h3>🚚 طريقة تسجيل الوارد</h3>

          <div className="instruction-step">
            <span>1</span>
            <p>
              <b>سجّل الوارد فقط:</b> أدخل الكمية الجديدة التي دخلت إلى الفرع.
            </p>
          </div>

          <div className="instruction-step">
            <span>2</span>
            <p>
              <b>بعدها الجردة:</b> عند نهاية الدورة سجّل الجردة من صفحة الجرد.
            </p>
          </div>

          <div className="instruction-step">
            <span>3</span>
            <p>
              <b>النظام يحسب تلقائياً:</b> يتم ضم الوارد بين الجردتين تلقائياً.
            </p>
          </div>

          <div className="instruction-warning">
            ⚠️ لا تترك وارد بدون تسجيل، ولا تسجّل نفس الوارد مرتين، وتأكد من الأوزان قبل الحفظ.
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
                type="date"
                dir="ltr"
              />
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">بيانات الوارد</h3>
            <div className="grid2">
              <Field
                label="وزن بوظة عادي (كغ)"
                value={regularKg}
                onChange={(e) => setRegularKg(normalizeNumberInput(e.target.value, true))}
                inputMode="decimal"
                warning={warnings.regularKg}
                dir="ltr"
              />
              <Field
                label="وزن بوظة دايت (كغ)"
                value={dietKg}
                onChange={(e) => setDietKg(normalizeNumberInput(e.target.value, true))}
                inputMode="decimal"
                warning={warnings.dietKg}
                dir="ltr"
              />
              <Field
                label="وزن قشطة + أفوكادو (كغ)"
                value={ashtaAvocadoKg}
                onChange={(e) => setAshtaAvocadoKg(normalizeNumberInput(e.target.value, true))}
                inputMode="decimal"
                warning={warnings.ashtaAvocadoKg}
                dir="ltr"
              />
              <Field
                label="Merry Cream (عدد)"
                value={merryQty}
                onChange={(e) => setMerryQty(normalizeNumberInput(e.target.value, false))}
                inputMode="numeric"
                dir="ltr"
              />
              <Field
                label="Merry Cream (Kg)"
                value={String(preview.merryKg)}
                inputMode="decimal"
                disabled
                readOnly
                dir="ltr"
              />
            </div>

            <div className="totals-preview">
              <PreviewPill label="عادي" value={`${preview.regularKg} كغ`} />
              <PreviewPill label="دايت" value={`${preview.dietKg} كغ`} />
              <PreviewPill label="قشطة + أفوكادو" value={`${preview.ashtaAvocadoKg} كغ`} />
              <PreviewPill label="Merry" value={`${preview.merryQty} عدد`} />
              <PreviewPill label="Merry وزن" value={`${preview.merryKg} كغ`} />
              <PreviewPill label="المجموع" value={`${preview.totalKg} كغ`} />
            </div>
          </div>

          <div className="actions incoming-form-actions">
            <button className="btn" type="submit" disabled={saving || !branch}>
              {saving ? "Saving..." : "Save Incoming"}
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