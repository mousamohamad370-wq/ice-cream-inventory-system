import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { ORDER_DEFAULTS } from "../config/orderDefaults";
import { signOut } from "firebase/auth";
import "../style/TalabiyahHelper.css";

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

function isKgUnit(unit) {
  const u = String(unit || "").toLowerCase();
  return u.includes("kg") || u.includes("كغ") || u.includes("كيلو");
}

function normalizeNumberInput(value, allowDecimal = false) {
  if (value === null || value === undefined) return "";

  let v = convertArabicDigits(String(value).trim());
  v = v.replace(/,/g, ".");
  v = v.replace(/،/g, ".");
  v = v.replace(/[^\d.]/g, "");

  if (allowDecimal) {
    if (v.startsWith(".")) v = `0${v}`;

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

function toNum(v, allowDecimal = false) {
  if (v === null || v === undefined || v === "") return 0;

  const cleaned = normalizeNumberInput(v, allowDecimal);
  if (!cleaned || cleaned === ".") return 0;

  const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function formatValue(value, allowDecimal = false) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return allowDecimal ? String(round2(num)) : String(Math.round(num));
}

function buildInitialStandards(items) {
  const out = {};
  items.forEach((item) => {
    out[item.key] = item.standard ?? "";
  });
  return out;
}

function buildInitialStock(items) {
  const out = {};
  items.forEach((item) => {
    out[item.key] = "";
  });
  return out;
}

const SECTION_ORDER = ["big", "small", "mc", "extra", "result"];

const SECTION_META = {
  big: { title: "بوظة كبير", subtitle: "Large Ice Cream" },
  small: { title: "بوظة صغير", subtitle: "Small Ice Cream" },
  mc: { title: "ميري كريم", subtitle: "Merry Cream" },
  extra: { title: "إضافات", subtitle: "Extras" },
  result: { title: "النتيجة", subtitle: "Result" },
};

function OrderItemCard({ row, value, onChange, standardsMode = false }) {
  const allowDecimal = isKgUnit(row.unit);

  return (
    <div
      className="order-result-row"
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>
            {row.label}
            {row.size ? ` (${row.size})` : ""}
          </div>
          <div className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
            {standardsMode
              ? `الستاندر الحالي / Current Standard: ${formatValue(row.standard, allowDecimal)} ${row.unit}`
              : `الستاندر / Standard: ${formatValue(row.standard, allowDecimal)} ${row.unit}`}
          </div>
        </div>

        {!standardsMode ? (
          <div
            className="admin-badge"
            style={{
              background:
                row.needed > 0
                  ? "rgba(254, 226, 226, 0.9)"
                  : "rgba(220, 252, 231, 0.9)",
              color: row.needed > 0 ? "#991b1b" : "#166534",
            }}
          >
            {row.needed > 0
              ? `ناقص / Needed: ${formatValue(row.needed, allowDecimal)} ${row.unit}`
              : "مكتمل / OK"}
          </div>
        ) : null}
      </div>

      <input
        className="input"
        value={value}
        onChange={onChange}
        placeholder={standardsMode ? "الستاندر / Standard" : "الموجود / Current stock"}
        inputMode={allowDecimal ? "decimal" : "numeric"}
        dir="ltr"
      />
    </div>
  );
}

export default function TalabiyahHelper() {
  const navigate = useNavigate();

  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStandards, setSavingStandards] = useState(false);

  const [activeSection, setActiveSection] = useState("big");
  const [showStandardsEditor, setShowStandardsEditor] = useState(false);

  const [standards, setStandards] = useState(buildInitialStandards(ORDER_DEFAULTS));
  const [currentStock, setCurrentStock] = useState(buildInitialStock(ORDER_DEFAULTS));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const uid = auth.currentUser?.uid;
        if (!uid) {
          setStatus("❌ Not logged in");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.exists() ? userSnap.data() : null;

        if (!userData?.branchName || userData?.role !== "employee") {
          setStatus("❌ هذا الحساب غير مربوط بفرع");
          return;
        }

        const branchName = userData.branchName;
        setBranch(branchName);

        const standardSnap = await getDoc(doc(db, "branchOrderStandards", branchName));

        if (standardSnap.exists()) {
          const saved = standardSnap.data()?.items || {};
          setStandards({
            ...buildInitialStandards(ORDER_DEFAULTS),
            ...saved,
          });
        } else {
          setStandards(buildInitialStandards(ORDER_DEFAULTS));
        }
      } catch (e) {
        console.error(e);
        setStatus("❌ Failed to load standards: " + (e?.message || String(e)));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const rows = useMemo(() => {
    return ORDER_DEFAULTS.map((item) => {
      const allowDecimal = isKgUnit(item.unit);
      const standard = toNum(standards[item.key], allowDecimal);
      const available = toNum(currentStock[item.key], allowDecimal);
      const needed = round2(Math.max(standard - available, 0));

      return {
        ...item,
        allowDecimal,
        standard,
        available,
        needed,
      };
    });
  }, [standards, currentStock]);

  const groupedRows = useMemo(() => {
    return {
      big: rows.filter((r) => r.category === "big"),
      small: rows.filter((r) => r.category === "small"),
      mc: rows.filter((r) => r.category === "mc"),
      extra: rows.filter((r) => r.category === "extra"),
    };
  }, [rows]);

  const missingRows = useMemo(() => rows.filter((r) => r.needed > 0), [rows]);
  const missingCount = useMemo(() => missingRows.length, [missingRows]);

  const totalsByUnit = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.needed <= 0) return acc;

        if (row.allowDecimal) {
          acc.kg = round2(acc.kg + row.needed);
        } else {
          acc.qty += row.needed;
        }

        return acc;
      },
      { kg: 0, qty: 0 }
    );
  }, [rows]);

  const currentStepIndex = useMemo(
    () => SECTION_ORDER.indexOf(activeSection),
    [activeSection]
  );

  const saveStandards = async () => {
    try {
      if (!branch) return;

      setSavingStandards(true);
      setStatus("");

      const cleanedStandards = {};
      ORDER_DEFAULTS.forEach((item) => {
        cleanedStandards[item.key] = normalizeNumberInput(
          standards[item.key],
          isKgUnit(item.unit)
        );
      });

      await setDoc(
        doc(db, "branchOrderStandards", branch),
        {
          branchName: branch,
          items: cleanedStandards,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || "",
        },
        { merge: true }
      );

      setStandards((prev) => ({
        ...prev,
        ...cleanedStandards,
      }));

      setShowStandardsEditor(false);
      setStatus("✅ تم حفظ الستاندر لهذا الفرع");
    } catch (e) {
      console.error(e);
      setStatus("❌ فشل حفظ الستاندر: " + (e?.message || String(e)));
    } finally {
      setSavingStandards(false);
    }
  };

  const resetStock = () => {
    setCurrentStock(buildInitialStock(ORDER_DEFAULTS));
    setActiveSection("big");
    setStatus("");
  };

  const goNext = () => {
    const nextIndex = Math.min(currentStepIndex + 1, SECTION_ORDER.length - 1);
    setActiveSection(SECTION_ORDER[nextIndex]);
  };

  const goBack = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setActiveSection(SECTION_ORDER[prevIndex]);
  };

  const renderSectionCards = (sectionKey) => {
    const items = groupedRows[sectionKey] || [];
    if (!items.length) return null;

    return (
      <div className="section order-result-section">
        <h3 className="section-title">
          {SECTION_META[sectionKey].title} / {SECTION_META[sectionKey].subtitle}
        </h3>

        <div className="order-result-list">
          {items.map((row) => (
            <OrderItemCard
              key={row.key}
              row={row}
              value={currentStock[row.key]}
              onChange={(e) =>
                setCurrentStock((prev) => ({
                  ...prev,
                  [row.key]: normalizeNumberInput(e.target.value, row.allowDecimal),
                }))
              }
            />
          ))}
        </div>
      </div>
    );
  };

  const renderStandardsEditor = () => {
    if (!showStandardsEditor) return null;

    return (
      <div className="section">
        <h3 className="section-title">تعديل الستاندر / Edit Standard</h3>

        <div className="order-result-list">
          {rows.map((row) => (
            <OrderItemCard
              key={row.key}
              row={row}
              value={standards[row.key]}
              onChange={(e) =>
                setStandards((prev) => ({
                  ...prev,
                  [row.key]: normalizeNumberInput(e.target.value, row.allowDecimal),
                }))
              }
              standardsMode
            />
          ))}
        </div>

        <div className="actions" style={{ marginTop: "14px" }}>
          <button
            className="btn"
            type="button"
            onClick={saveStandards}
            disabled={savingStandards}
          >
            {savingStandards ? "Saving..." : "حفظ الستاندر / Save Standard"}
          </button>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    return (
      <div className="section">
        <h3 className="section-title">نتيجة الطلبية / Order Result</h3>

        <div className="totals-preview">
          <span>عدد الأصناف الناقصة / Missing Items: {missingCount}</span>
          <span>إجمالي الناقص بالكيلو / Missing Kg: {totalsByUnit.kg}</span>
          <span>إجمالي الناقص بالعدد / Missing Qty: {totalsByUnit.qty}</span>
        </div>

        {missingCount === 0 ? (
          <div className="alert">لا يوجد نقص حاليًا / No shortage right now</div>
        ) : (
          <div className="order-result-list" style={{ marginTop: "14px" }}>
            {missingRows.map((row) => (
              <div key={row.key} className="order-result-row">
                <span>
                  {row.label}
                  {row.size ? ` (${row.size})` : ""}
                </span>
                <b>
                  {formatValue(row.needed, row.allowDecimal)} {row.unit}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <h2 className="title">مساعد الطلبية | Order Helper</h2>
          <p className="muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page order-page">
      <div className="card wide order-page-card">
        <h2 className="title">مساعد الطلبية | Order Helper</h2>
        <p className="muted">
          Branch / الفرع: <b>{branch || "..."}</b>
        </p>

        <div className="order-top-nav">
          <button
            className="btn ghost"
            type="button"
            onClick={() => navigate("/employee")}
          >
            📦 Inventory
          </button>

          <button
            className="btn ghost"
            type="button"
            onClick={() => navigate("/employee/incoming")}
          >
            🚚 Incoming
          </button>

          <button
            className="btn ghost active"
            type="button"
            onClick={() => navigate("/employee/order")}
          >
            🧾 مساعد الطلبية
          </button>
        </div>

        <div className="actions order-header-actions">
          <button className="btn ghost" type="button" onClick={() => navigate("/employee")}>
            ← رجوع / Back
          </button>

          <button className="btn ghost" type="button" onClick={resetStock}>
            Clear
          </button>

          <button
            className="btn ghost"
            type="button"
            onClick={() => setShowStandardsEditor((prev) => !prev)}
          >
            {showStandardsEditor
              ? "إخفاء الستاندر / Hide Standard"
              : "تعديل الستاندر / Edit Standard"}
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

        <div className="section">
          <h3 className="section-title">الموجود الحالي / Current Stock</h3>
          <p className="muted">
            عبّي الموجود عندك فقط، والناقص يطلع مباشرة.
            Fill only current stock, and needed quantity will appear directly.
          </p>
        </div>

        <div className="totals-preview">
          {SECTION_ORDER.map((sectionKey) => (
            <button
              key={sectionKey}
              type="button"
              className={`btn ${activeSection === sectionKey ? "" : "ghost"}`}
              onClick={() => setActiveSection(sectionKey)}
            >
              {SECTION_META[sectionKey].title}
            </button>
          ))}
        </div>

        {activeSection === "big" && renderSectionCards("big")}
        {activeSection === "small" && renderSectionCards("small")}
        {activeSection === "mc" && renderSectionCards("mc")}
        {activeSection === "extra" && renderSectionCards("extra")}
        {activeSection === "result" && renderResult()}

        <div className="actions" style={{ marginTop: "16px" }}>
          <button
            className="btn ghost"
            type="button"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            السابق / Back
          </button>

          <button
            className="btn"
            type="button"
            onClick={goNext}
            disabled={currentStepIndex === SECTION_ORDER.length - 1}
          >
            التالي / Next
          </button>

          <button
            className="btn ghost"
            type="button"
            onClick={() => setActiveSection("result")}
          >
            النتيجة / Result
          </button>
        </div>

        {renderStandardsEditor()}

        {status && <div className="alert">{status}</div>}
      </div>
    </div>
  );
}