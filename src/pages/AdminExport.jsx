import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebaseConfig";
import { buildWorkbookFromInventory, downloadWorkbook } from "../utils/inventoryExcel";
import {
  yyyy_mm_dd,
  daysBetween,
  safeBranchName,
  n,
  round2,
  formatKg,
  getIncomingRow,
  buildOriginalFields,
  buildCycleRows,
  getBranchStatus,
  calcTheoreticalPricePerKilo,
} from "../utils/inventoryLogic";
import "../style/AdminExport.css";

function startOfDayTimestamp(dateStr) {
  return Timestamp.fromDate(new Date(`${dateStr}T00:00:00`));
}

function endOfDayTimestamp(dateStr) {
  return Timestamp.fromDate(new Date(`${dateStr}T23:59:59`));
}

function DashboardNavLinks() {
  return (
    <div className="admin-dashboard-nav-links">
      <a
        className="btn"
        href="/admin/menu"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        🍨 إدارة المنيو
      </a>

      <a
        className="btn ghost"
        href="/admin/assign"
        style={{ textDecoration: "none", textAlign: "center" }}
      >
        👤 إدارة المستخدمين
      </a>
    </div>
  );
}

function BreadcrumbTrail({ items = [] }) {
  return (
    <div className="admin-breadcrumb">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="admin-breadcrumb-item">
          {index > 0 ? <span className="admin-breadcrumb-sep">/</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="admin-summary-pill">
      <span className="admin-summary-pill-label">{label}</span>
      <strong className="admin-summary-pill-value">{value}</strong>
    </div>
  );
}

function MobileMetric({ label, value }) {
  return (
    <div className="admin-mobile-metric">
      <span className="admin-mobile-metric-label">{label}</span>
      <strong className="admin-mobile-metric-value">{value ?? "-"}</strong>
    </div>
  );
}

function StatCard({ label, value, hint, variant = "soft", onClick }) {
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      className={`admin-stat-card admin-stat-card--${variant} ${
        clickable ? "admin-stat-card--clickable" : ""
      }`}
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={!clickable ? { cursor: "default" } : undefined}
    >
      <div className="admin-stat-card-label">{label}</div>
      <div className="admin-stat-card-value">{value}</div>
      <div className="admin-stat-card-hint">{hint}</div>
    </button>
  );
}

export default function AdminExport() {
  const [fromDate, setFromDate] = useState(yyyy_mm_dd());
  const [toDate, setToDate] = useState(yyyy_mm_dd());
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rawItems, setRawItems] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [branchViewFilter, setBranchViewFilter] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedCycleKey, setSelectedCycleKey] = useState(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [ashtaPrice, setAshtaPrice] = useState(22.2);
  const [regularPrice, setRegularPrice] = useState(15);

  const dateError = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate > toDate) return "❌ تاريخ البداية يجب أن يكون قبل تاريخ النهاية";

    const diff = daysBetween(fromDate, toDate);
    if (diff > 62) return "❌ المدة كبيرة جداً، الرجاء اختيار مدة لا تتجاوز شهرين";

    return "";
  }, [fromDate, toDate]);

  useEffect(() => {
    setSelectedBranch(null);
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
    setBranchViewFilter("all");
  }, [fromDate, toDate, branchFilter]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!fromDate || !toDate || dateError) {
        setRawItems([]);
        return;
      }

      try {
        setDashboardLoading(true);

        const qy = query(
          collection(db, "inventory"),
          where("dateTs", ">=", startOfDayTimestamp(fromDate)),
          where("dateTs", "<=", endOfDayTimestamp(toDate))
        );

        const snap = await getDocs(qy);
        const items = [];

        snap.forEach((docu) => {
          items.push({
            _docId: docu.id,
            ...docu.data(),
          });
        });

        setRawItems(items);
      } catch (e) {
        console.error("DASHBOARD ERROR:", e);
        setRawItems([]);
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboard();
  }, [fromDate, toDate, dateError]);

  const filteredRawItems = useMemo(() => {
    return rawItems.filter((it) => {
      const branch = safeBranchName(it.branchName);
      return branchFilter === "all" || branch === branchFilter;
    });
  }, [rawItems, branchFilter]);

  const branchOptions = useMemo(() => {
    return Array.from(new Set(rawItems.map((it) => safeBranchName(it.branchName)))).sort((a, b) =>
      a.localeCompare(b, "ar")
    );
  }, [rawItems]);

  const sourceStats = useMemo(() => {
    const inventoryDocs = filteredRawItems.filter((it) => (it.type || "inventory") !== "incoming");
    const incomingDocs = filteredRawItems.filter((it) => (it.type || "inventory") === "incoming");

    return {
      branches: new Set(filteredRawItems.map((it) => safeBranchName(it.branchName))).size,
      inventoryDocsCount: inventoryDocs.length,
      incomingDocsCount: incomingDocs.length,
      incomingTotalKg: round2(
        incomingDocs.reduce((sum, it) => sum + n(getIncomingRow(it).totalKg), 0)
      ),
    };
  }, [filteredRawItems]);

  const branchCycleData = useMemo(() => {
    const grouped = {};

    filteredRawItems.forEach((it) => {
      const branch = safeBranchName(it.branchName);
      if (!grouped[branch]) grouped[branch] = [];
      grouped[branch].push(it);
    });

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b, "ar"))
      .map((branch) => {
        const result = buildCycleRows(grouped[branch], branch);
        return {
          branch,
          rows: result.rows,
          warnings: result.warnings,
          inventoryDocsCount: result.inventoryDocsCount,
          incomingDocsCount: result.incomingDocsCount,
          completedCyclesCount: result.completedCyclesCount,
          openCyclesCount: result.openCyclesCount,
        };
      });
  }, [filteredRawItems]);

  const dashboardRows = useMemo(() => {
    return branchCycleData.flatMap((item) =>
      item.rows.map((row) => ({
        ...row,
        theoreticalPrice:
          row.soldTotalKg != null
            ? calcTheoreticalPricePerKilo({
                ashtaPrice,
                regularPrice,
                pct: row.pctAshtaAvocado,
              })
            : null,
      }))
    );
  }, [branchCycleData, ashtaPrice, regularPrice]);

  const completedBranchesCount = useMemo(() => {
    return branchCycleData.filter((item) => item.completedCyclesCount > 0).length;
  }, [branchCycleData]);

  const openOnlyBranchesCount = useMemo(() => {
    return branchCycleData.filter(
      (item) => item.completedCyclesCount === 0 && item.inventoryDocsCount > 0
    ).length;
  }, [branchCycleData]);

  const periodInsight = useMemo(() => {
    if (!fromDate || !toDate || filteredRawItems.length === 0) return "";

    if (completedBranchesCount === 0 && openOnlyBranchesCount > 0) {
      return `ضمن الفترة من ${fromDate} إلى ${toDate}: لا توجد دورات مكتملة بعد، والموجود حالياً جردات أولى أو دورات مفتوحة بانتظار الإغلاق.`;
    }

    if (completedBranchesCount > 0 && openOnlyBranchesCount > 0) {
      return `ضمن الفترة من ${fromDate} إلى ${toDate}: يوجد ${completedBranchesCount} فروع مكتملة و${openOnlyBranchesCount} فروع تحتاج متابعة لإتمام الحساب الكامل.`;
    }

    if (completedBranchesCount > 0 && openOnlyBranchesCount === 0) {
      return `ضمن الفترة من ${fromDate} إلى ${toDate}: يوجد ${completedBranchesCount} فروع عندها دورات مكتملة ويمكن اعتماد أرقام المبيع الظاهرة.`;
    }

    return "";
  }, [fromDate, toDate, filteredRawItems.length, completedBranchesCount, openOnlyBranchesCount]);

  const summary = useMemo(() => {
    return {
      branches: sourceStats.branches,
      completedBranches: completedBranchesCount,
      openBranches: openOnlyBranchesCount,
      cycles: dashboardRows.filter((r) => !r.isIncompleteCycle).length,
      inventories: sourceStats.inventoryDocsCount,
      incomingDocs: sourceStats.incomingDocsCount,
      incomingTotalKg: sourceStats.incomingTotalKg,
      soldTotalKg: round2(dashboardRows.reduce((sum, row) => sum + n(row.soldTotalKg), 0)),
    };
  }, [sourceStats, completedBranchesCount, openOnlyBranchesCount, dashboardRows]);

  const topSellingBranch = useMemo(() => {
    const completedRows = dashboardRows.filter((row) => !row.isIncompleteCycle);

    if (!completedRows.length) return null;

    const branchTotals = completedRows.reduce((acc, row) => {
      const branch = safeBranchName(row.branch);
      acc[branch] = round2((acc[branch] || 0) + n(row.soldTotalKg));
      return acc;
    }, {});

    const sorted = Object.entries(branchTotals).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;

    return {
      branch: sorted[0][0],
      soldTotalKg: round2(sorted[0][1]),
    };
  }, [dashboardRows]);

  const branchGroups = useMemo(() => {
    const grouped = {};

    branchCycleData.forEach((item) => {
      grouped[item.branch] = item;
    });

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b, "ar"))
      .map((branch) => {
        const branchItem = grouped[branch];
        const branchRows = branchItem.rows
          .slice()
          .sort((a, b) => {
            const byCycle = n(a.cycleIndex) - n(b.cycleIndex);
            if (byCycle !== 0) return byCycle;
            return (a.dateStr || "").localeCompare(b.dateStr || "");
          })
          .map((row) => ({
            ...row,
            theoreticalPrice:
              row.soldTotalKg != null
                ? calcTheoreticalPricePerKilo({
                    ashtaPrice,
                    regularPrice,
                    pct: row.pctAshtaAvocado,
                  })
                : null,
          }));

        const statusInfo = getBranchStatus(branchItem);

        return {
          branch,
          cycles: branchRows,
          count: branchRows.length,
          inventoryDocsCount: branchItem.inventoryDocsCount,
          incomingDocsCount: branchItem.incomingDocsCount,
          completedCyclesCount: branchItem.completedCyclesCount,
          openCyclesCount: branchItem.openCyclesCount,
          soldTotalKg: round2(branchRows.reduce((sum, row) => sum + n(row.soldTotalKg), 0)),
          latestDate: branchRows[branchRows.length - 1]?.dateStr || "-",
          branchNote: statusInfo.note,
          statusRank: statusInfo.rank,
          statusLabel: statusInfo.label,
          statusTone: statusInfo.tone,
        };
      })
      .sort((a, b) => {
        if (a.statusRank !== b.statusRank) return a.statusRank - b.statusRank;
        if (b.soldTotalKg !== a.soldTotalKg) return b.soldTotalKg - a.soldTotalKg;
        return a.branch.localeCompare(b.branch, "ar");
      });
  }, [branchCycleData, ashtaPrice, regularPrice]);

  const visibleBranchGroups = useMemo(() => {
    if (branchViewFilter === "completed") {
      return branchGroups.filter((group) => group.completedCyclesCount > 0);
    }

    if (branchViewFilter === "open") {
      return branchGroups.filter((group) => group.openCyclesCount > 0);
    }

    return branchGroups;
  }, [branchGroups, branchViewFilter]);

  const selectedBranchGroup = useMemo(() => {
    if (!selectedBranch) return null;
    return branchGroups.find((group) => group.branch === selectedBranch) || null;
  }, [branchGroups, selectedBranch]);

  const selectedCycleGroup = useMemo(() => {
    if (!selectedBranchGroup || !selectedCycleKey) return null;
    return selectedBranchGroup.cycles.find((cycle) => cycle.cycleKey === selectedCycleKey) || null;
  }, [selectedBranchGroup, selectedCycleKey]);

  const selectedInventory = useMemo(() => {
    if (!selectedInventoryId || !selectedCycleGroup) return null;
    if (selectedCycleGroup.id === selectedInventoryId) return selectedCycleGroup;
    return null;
  }, [selectedInventoryId, selectedCycleGroup]);

  const originalFields = useMemo(() => {
    return buildOriginalFields(selectedInventory?.rawSource);
  }, [selectedInventory]);

  const exportExcel = async () => {
    setStatus("");

    try {
      if (!fromDate || !toDate) {
        setStatus("❌ اختر تاريخ البداية والنهاية");
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
        setStatus("❌ لا توجد بيانات ضمن هذه الفترة");
        return;
      }

      const groupedByBranch = {};

      snap.forEach((docu) => {
        const it = docu.data();
        const branchName = safeBranchName(it.branchName);

        if (branchFilter !== "all" && branchName !== branchFilter) return;

        if (!groupedByBranch[branchName]) groupedByBranch[branchName] = [];
        groupedByBranch[branchName].push({
          ...it,
          _docId: docu.id,
        });
      });

      if (Object.keys(groupedByBranch).length === 0) {
        setStatus("❌ لا توجد بيانات للفرع المحدد");
        return;
      }

      const wb = buildWorkbookFromInventory({
        groupedByBranch,
        fromDate,
        toDate,
        ashtaPrice,
        regularPrice,
      });

      const branchPart = branchFilter === "all" ? "All" : branchFilter;
      downloadWorkbook(wb, `IceCream_Dashboard_${branchPart}_${fromDate}_to_${toDate}.xlsx`);

      setStatus("✅ تم تنزيل ملف Excel بنجاح");
    } catch (e) {
      console.error(e);
      setStatus("❌ فشل التصدير: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const goToBranches = () => {
    setSelectedBranch(null);
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
    setBranchViewFilter("all");
  };

  const goToCycles = () => {
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
  };

  const goToInventory = () => {
    setSelectedInventoryId(null);
  };

  const currentLevelTitle = !selectedBranch
    ? "الفروع"
    : !selectedCycleKey
      ? `دورات ${selectedBranch}`
      : !selectedInventory
        ? `${selectedBranch} / ${selectedCycleGroup?.cycleLabel || ""}`
        : `التفاصيل الكاملة - ${selectedBranch}`;

  const breadcrumbItems = !selectedBranch
    ? ["لوحة الإدارة", "الفروع"]
    : !selectedCycleKey
      ? ["لوحة الإدارة", "الفروع", selectedBranch]
      : !selectedInventory
        ? ["لوحة الإدارة", "الفروع", selectedBranch, selectedCycleGroup?.cycleLabel || "الدورة"]
        : [
            "لوحة الإدارة",
            "الفروع",
            selectedBranch,
            selectedCycleGroup?.cycleLabel || "الدورة",
            "التفاصيل",
          ];

  const handleShowCompletedBranches = () => {
    setSelectedBranch(null);
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
    setBranchViewFilter("completed");
  };

  const handleShowOpenBranches = () => {
    setSelectedBranch(null);
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
    setBranchViewFilter("open");
  };

  const handleShowTopSellingBranch = () => {
    if (!topSellingBranch) return;

    setBranchViewFilter("all");
    setSelectedBranch(topSellingBranch.branch);
    setSelectedCycleKey(null);
    setSelectedInventoryId(null);
  };

  return (
    <div className="page" dir="rtl">
      <div className="card wide admin-dashboard-card">
        <div className="admin-dashboard-header">
          <div>
            <h2 className="title">لوحة متابعة الجرد والمبيع</h2>
            <p className="muted admin-dashboard-subtitle">
              تحكم أسرع بالفروع والدورات مع قراءة أوضح للمدير
            </p>
          </div>

          <DashboardNavLinks />
        </div>

        <div className="form">
          <div className="admin-toolbar-shell">
            <div className="admin-filters-grid">
              <div>
                <label className="label">من تاريخ</label>
                <input
                  className="input"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">إلى تاريخ</label>
                <input
                  className="input"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">الفرع</label>
                <select
                  className="input"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="all">كل الفروع</option>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">سعر القشطة + الأفوكادو</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={ashtaPrice}
                  onChange={(e) => setAshtaPrice(Number(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="label">سعر العادي</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="admin-toolbar-actions">
              <button className="btn" onClick={exportExcel} disabled={loading || !!dateError}>
                {loading ? "جاري تجهيز ملف Excel..." : "تحميل التقرير Excel"}
              </button>

              <button
                className="btn ghost logout-btn"
                type="button"
                onClick={async () => {
                  await signOut(auth);
                }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

          {dateError ? <div className="alert">{dateError}</div> : null}

          {!dateError ? (
            <>
              {periodInsight ? (
                <div className="alert" style={{ marginBottom: "14px" }}>
                  {periodInsight}
                </div>
              ) : null}

              <BreadcrumbTrail items={breadcrumbItems} />

              <div className="admin-kpi-grid">
                <StatCard
                  label="إجمالي المبيع"
                  value={formatKg(summary.soldTotalKg)}
                  hint="ضمن الفترة المحددة"
                  variant="highlight"
                />
                <StatCard
                  label="إجمالي الوارد"
                  value={formatKg(summary.incomingTotalKg)}
                  hint={`${summary.incomingDocs} واردات`}
                  variant="soft"
                />
                <StatCard
                  label="فروع مكتملة"
                  value={summary.completedBranches}
                  hint="جاهزة للقراءة المباشرة"
                  variant="success"
                  onClick={handleShowCompletedBranches}
                />
                <StatCard
                  label="فروع مفتوحة"
                  value={summary.openBranches}
                  hint="تحتاج جردة أو إغلاق"
                  variant="warning"
                  onClick={handleShowOpenBranches}
                />
                <StatCard
                  label="أعلى فرع مبيعاً"
                  value={topSellingBranch ? topSellingBranch.branch : "-"}
                  hint={
                    topSellingBranch
                      ? formatKg(topSellingBranch.soldTotalKg)
                      : "لا توجد دورة مكتملة حالياً"
                  }
                  variant="highlight"
                  onClick={handleShowTopSellingBranch}
                />
              </div>

              <div className="section">
                <h3 className="section-title">الملخص</h3>
                <div className="admin-summary-row">
                  <SummaryPill label="الفروع" value={summary.branches} />
                  <SummaryPill label="فروع مكتملة" value={summary.completedBranches} />
                  <SummaryPill label="فروع بانتظار الإغلاق" value={summary.openBranches} />
                  <SummaryPill label="الدورات المكتملة" value={summary.cycles} />
                  <SummaryPill label="عدد الجردات" value={summary.inventories} />
                  <SummaryPill label="عدد الواردات" value={summary.incomingDocs} />
                  <SummaryPill label="إجمالي الوارد" value={formatKg(summary.incomingTotalKg)} />
                  <SummaryPill label="إجمالي المبيع" value={formatKg(summary.soldTotalKg)} />
                </div>
              </div>

              <div className="section">
                <div className="admin-level-header">
                  <div>
                    <h3 className="section-title">{currentLevelTitle}</h3>
                    {!selectedBranch ? (
                      <p className="muted admin-branches-subtitle">
                        الفروع مرتبة حسب الأولوية والحاجة للمتابعة
                      </p>
                    ) : null}
                  </div>

                  <div className="admin-level-actions">
                    {selectedBranch ? (
                      <button className="btn ghost" onClick={goToBranches} type="button">
                        كل الفروع
                      </button>
                    ) : null}

                    {selectedCycleKey ? (
                      <button className="btn ghost" onClick={goToCycles} type="button">
                        رجوع للدورات
                      </button>
                    ) : null}

                    {selectedInventory ? (
                      <button className="btn ghost" onClick={goToInventory} type="button">
                        رجوع للمعاينة
                      </button>
                    ) : null}
                  </div>
                </div>

                {dashboardLoading ? (
                  <div className="muted">جاري التحميل...</div>
                ) : filteredRawItems.length === 0 ? (
                  <div className="alert">لا توجد بيانات ضمن الفترة المحددة</div>
                ) : !selectedBranch ? (
                  <div className="admin-branch-list-grid">
                    {visibleBranchGroups.map((group) => (
                      <button
                        key={group.branch}
                        type="button"
                        className={`admin-branch-list-card admin-branch-list-card--${group.statusTone}`}
                        onClick={() => {
                          setSelectedBranch(group.branch);
                          setSelectedCycleKey(null);
                          setSelectedInventoryId(null);
                        }}
                      >
                        <div className="admin-branch-list-top">
                          <div>
                            <h3 className="admin-branch-title">{group.branch}</h3>
                            <div className="muted admin-branch-meta">الحالة: {group.statusLabel}</div>
                          </div>
                          <span className="admin-badge">{group.count} دورات</span>
                        </div>

                        <div className="admin-branch-metrics-grid">
                          <MobileMetric label="الجردات" value={group.inventoryDocsCount} />
                          <MobileMetric label="الواردات" value={group.incomingDocsCount} />
                          <MobileMetric label="مكتملة" value={group.completedCyclesCount} />
                          <MobileMetric label="مفتوحة" value={group.openCyclesCount} />
                        </div>

                        <div className="totals-preview">
                          <span>آخر تاريخ: {group.latestDate}</span>
                          <span>المبيع: {formatKg(group.soldTotalKg)}</span>
                        </div>

                        <div className="alert admin-branch-note" style={{ marginTop: "10px" }}>
                          {group.branchNote}
                        </div>
                      </button>
                    ))}

                    {visibleBranchGroups.length === 0 ? (
                      <div className="alert">لا توجد فروع مطابقة لهذا الكرت حالياً</div>
                    ) : null}
                  </div>
                ) : !selectedCycleKey ? (
                  <div className="admin-compact-grid">
                    {selectedBranchGroup?.cycles.map((cycle) => (
                      <button
                        key={cycle.cycleKey}
                        type="button"
                        className={`admin-compact-card ${
                          cycle.isIncompleteCycle
                            ? "admin-compact-card--warning"
                            : "admin-compact-card--success"
                        }`}
                        onClick={() => {
                          setSelectedCycleKey(cycle.cycleKey);
                          setSelectedInventoryId(null);
                        }}
                      >
                        <div className="admin-compact-head">
                          <div>
                            <h3 className="admin-branch-title">{cycle.cycleLabel}</h3>
                            <div className="muted admin-branch-meta">
                              {cycle.openingDate} ← إلى ← {cycle.closingDate}
                            </div>
                            <div className="muted admin-branch-meta">
                              {cycle.employee} — {cycle.sentAt}
                            </div>
                          </div>
                          <span className="admin-badge">
                            {cycle.isIncompleteCycle ? "مفتوحة" : "مكتملة"}
                          </span>
                        </div>

                        <div className="totals-preview">
                          <span>عدد الجردات: {cycle.inventoryDocsUsed}</span>
                          <span>عدد الواردات: {cycle.incomingDocs}</span>
                        </div>

                        <div className="admin-flow-strip">
                          <span>السابق: {formatKg(cycle.previousTotalKg)}</span>
                          <span>+ الوارد: {formatKg(cycle.incomingTotalKg)}</span>
                          <span>→ الحالي: {formatKg(cycle.currentTotalKg)}</span>
                          <span>⇒ المبيع: {formatKg(cycle.soldTotalKg)}</span>
                        </div>

                        <div className="admin-detail-grid">
                          <MobileMetric label="الرصيد السابق" value={formatKg(cycle.previousTotalKg)} />
                          <MobileMetric label="الوارد" value={formatKg(cycle.incomingTotalKg)} />
                          <MobileMetric label="الرصيد الحالي" value={formatKg(cycle.currentTotalKg)} />
                          <MobileMetric label="المبيع الكلي" value={formatKg(cycle.soldTotalKg)} />
                          <MobileMetric
                            label="نسبة القشطة والأفوكادو"
                            value={`${cycle.pctAshtaAvocado ?? 0}%`}
                          />
                          <MobileMetric
                            label="السعر النظري للكيلو"
                            value={
                              cycle.theoreticalPrice != null ? `${cycle.theoreticalPrice}` : "-"
                            }
                          />
                        </div>

                        <div className="admin-detail-grid">
                          <MobileMetric label="مبيع عادي" value={formatKg(cycle.soldRegularKg)} />
                          <MobileMetric label="مبيع دايت" value={formatKg(cycle.soldDietKg)} />
                          <MobileMetric
                            label="مبيع قشطة وأفوكادو"
                            value={formatKg(cycle.soldAshtaAvocadoKg)}
                          />
                          <MobileMetric label="مبيع ميري" value={formatKg(cycle.soldMerryKg)} />
                        </div>

                        <div className="admin-detail-grid">
                          <MobileMetric label="فري عادي" value={formatKg(cycle.freeRegularKg)} />
                          <MobileMetric
                            label="فري قشطة وأفوكادو"
                            value={formatKg(cycle.freeAshtaAvocadoKg)}
                          />
                        </div>

                        <div className="alert admin-branch-note" style={{ marginTop: "10px" }}>
                          {cycle.managerNote}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !selectedInventory ? (
                  <div className="admin-compact-grid">
                    <button
                      type="button"
                      className="admin-compact-card admin-compact-card--detail"
                      onClick={() => setSelectedInventoryId(selectedCycleGroup.id)}
                    >
                      <div className="admin-compact-head">
                        <div>
                          <h3 className="admin-branch-title">{selectedCycleGroup.cycleLabel}</h3>
                          <div className="muted admin-branch-meta">
                            {selectedCycleGroup.openingDate} ← إلى ← {selectedCycleGroup.closingDate}
                          </div>
                          <div className="muted admin-branch-meta">
                            {selectedCycleGroup.employee} — {selectedCycleGroup.sentAt}
                          </div>
                        </div>
                        <span className="admin-badge">تفاصيل</span>
                      </div>

                      <div className="totals-preview">
                        <span>عدد الجردات: {selectedCycleGroup.inventoryDocsUsed}</span>
                        <span>عدد الواردات: {selectedCycleGroup.incomingDocs}</span>
                      </div>

                      <div className="admin-flow-strip">
                        <span>السابق: {formatKg(selectedCycleGroup.previousTotalKg)}</span>
                        <span>+ الوارد: {formatKg(selectedCycleGroup.incomingTotalKg)}</span>
                        <span>→ الحالي: {formatKg(selectedCycleGroup.currentTotalKg)}</span>
                        <span>⇒ المبيع: {formatKg(selectedCycleGroup.soldTotalKg)}</span>
                      </div>

                      <div className="admin-detail-grid">
                        <MobileMetric
                          label="الرصيد السابق"
                          value={formatKg(selectedCycleGroup.previousTotalKg)}
                        />
                        <MobileMetric
                          label="الوارد"
                          value={formatKg(selectedCycleGroup.incomingTotalKg)}
                        />
                        <MobileMetric
                          label="الرصيد الحالي"
                          value={formatKg(selectedCycleGroup.currentTotalKg)}
                        />
                        <MobileMetric
                          label="المبيع الكلي"
                          value={formatKg(selectedCycleGroup.soldTotalKg)}
                        />
                        <MobileMetric
                          label="نسبة القشطة والأفوكادو"
                          value={`${selectedCycleGroup.pctAshtaAvocado ?? 0}%`}
                        />
                        <MobileMetric
                          label="السعر النظري للكيلو"
                          value={
                            selectedCycleGroup.theoreticalPrice != null
                              ? `${selectedCycleGroup.theoreticalPrice}`
                              : "-"
                          }
                        />
                      </div>

                      <div className="admin-detail-grid">
                        <MobileMetric
                          label="مبيع عادي"
                          value={formatKg(selectedCycleGroup.soldRegularKg)}
                        />
                        <MobileMetric
                          label="مبيع دايت"
                          value={formatKg(selectedCycleGroup.soldDietKg)}
                        />
                        <MobileMetric
                          label="مبيع قشطة وأفوكادو"
                          value={formatKg(selectedCycleGroup.soldAshtaAvocadoKg)}
                        />
                        <MobileMetric
                          label="مبيع ميري"
                          value={formatKg(selectedCycleGroup.soldMerryKg)}
                        />
                      </div>

                      <div className="admin-detail-grid">
                        <MobileMetric
                          label="فري عادي"
                          value={formatKg(selectedCycleGroup.freeRegularKg)}
                        />
                        <MobileMetric
                          label="فري قشطة وأفوكادو"
                          value={formatKg(selectedCycleGroup.freeAshtaAvocadoKg)}
                        />
                      </div>

                      <div className="alert admin-branch-note" style={{ marginTop: "10px" }}>
                        {selectedCycleGroup.managerNote}
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="admin-detail-layout">
                    <div className="admin-detail-card">
                      <div className="admin-detail-top">
                        <div>
                          <h3 className="admin-branch-title">{selectedInventory.branch}</h3>
                          <div className="muted admin-branch-meta">{selectedInventory.cycleLabel}</div>
                          <div className="muted admin-branch-meta">
                            {selectedInventory.openingDate} ← إلى ← {selectedInventory.closingDate}
                          </div>
                          <div className="muted admin-branch-meta">
                            {selectedInventory.dateStr} — {selectedInventory.employee}
                          </div>
                          <div className="muted admin-branch-meta">
                            وقت الإرسال: {selectedInventory.sentAt}
                          </div>
                        </div>
                        <span className="admin-badge">تفاصيل كاملة</span>
                      </div>

                      <div className="alert admin-branch-note" style={{ marginBottom: "14px" }}>
                        {selectedInventory.managerNote}
                      </div>

                      <div className="admin-flow-strip admin-flow-strip--detail">
                        <span>الرصيد السابق: {formatKg(selectedInventory.previousTotalKg)}</span>
                        <span>الوارد: {formatKg(selectedInventory.incomingTotalKg)}</span>
                        <span>الرصيد الحالي: {formatKg(selectedInventory.currentTotalKg)}</span>
                        <span>المبيع الكلي: {formatKg(selectedInventory.soldTotalKg)}</span>
                      </div>

                      <div className="section">
                        <h4 className="section-title">المستندات المستخدمة في هذه الدورة</h4>
                        <div className="admin-detail-grid">
                          <div className="admin-mini-card">
                            <strong>عدد الجردات</strong>
                            <span>{selectedInventory.inventoryDocsUsed}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>عدد الواردات</strong>
                            <span>{selectedInventory.incomingDocs}</span>
                          </div>
                        </div>
                      </div>

                      <div className="section">
                        <h4 className="section-title">الحساب النهائي</h4>
                        <div className="admin-detail-grid">
                          <div className="admin-mini-card">
                            <strong>الرصيد السابق</strong>
                            <span>{formatKg(selectedInventory.previousTotalKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>الوارد</strong>
                            <span>{formatKg(selectedInventory.incomingTotalKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>الرصيد الحالي</strong>
                            <span>{formatKg(selectedInventory.currentTotalKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>المبيع الكلي</strong>
                            <span>{formatKg(selectedInventory.soldTotalKg)}</span>
                          </div>

                          <div className="admin-mini-card">
                            <strong>مبيع عادي</strong>
                            <span>{formatKg(selectedInventory.soldRegularKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>مبيع دايت</strong>
                            <span>{formatKg(selectedInventory.soldDietKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>مبيع قشطة وأفوكادو</strong>
                            <span>{formatKg(selectedInventory.soldAshtaAvocadoKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>مبيع ميري</strong>
                            <span>{formatKg(selectedInventory.soldMerryKg)}</span>
                          </div>

                          <div className="admin-mini-card">
                            <strong>نسبة القشطة والأفوكادو</strong>
                            <span>{selectedInventory.pctAshtaAvocado}%</span>
                          </div>

                          <div className="admin-mini-card">
                            <strong>السعر النظري للكيلو</strong>
                            <span>
                              {selectedInventory.theoreticalPrice != null
                                ? selectedInventory.theoreticalPrice
                                : "-"}
                            </span>
                          </div>

                          <div className="admin-mini-card">
                            <strong>الرصيد الحالي عادي</strong>
                            <span>{formatKg(selectedInventory.regularBaseCurrentKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>الرصيد الحالي دايت</strong>
                            <span>{formatKg(selectedInventory.dietTotalKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>الرصيد الحالي قشطة وأفوكادو</strong>
                            <span>{formatKg(selectedInventory.ashtaAvocadoTotalKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>عدد ميري</strong>
                            <span>{selectedInventory.merryQty}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>الرصيد الحالي ميري</strong>
                            <span>{formatKg(selectedInventory.merryKg)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="section">
                        <h4 className="section-title">الفري المسجل خارج الحسابات</h4>
                        <div className="admin-detail-grid">
                          <div className="admin-mini-card">
                            <strong>فري عادي</strong>
                            <span>{formatKg(selectedInventory.freeRegularKg)}</span>
                          </div>
                          <div className="admin-mini-card">
                            <strong>فري قشطة وأفوكادو</strong>
                            <span>{formatKg(selectedInventory.freeAshtaAvocadoKg)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="section">
                        <h4 className="section-title">بيانات الجرد الأصلية المرسلة من الموظف</h4>
                        <div className="admin-original-grid">
                          {originalFields.map((field) => (
                            <div key={field.key} className="admin-original-item">
                              <strong>{field.label}</strong>
                              <span>{field.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedInventory.notes ? (
                        <div className="section">
                          <h4 className="section-title">ملاحظة</h4>
                          <div className="admin-note-card">{selectedInventory.notes}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {status ? <div className="alert">{status}</div> : null}
        </div>
      </div>
    </div>
  );
}