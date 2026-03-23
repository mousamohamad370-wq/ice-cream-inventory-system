import * as XLSX from "xlsx";

const COLS = [
  "Date",
  "Branch",
  "Employee",
  "Regular Total (Kg)",
  "Diet Total (Kg)",
  "Cream Total (Kg)",
  "Avocado Total (Kg)",
  "Merrycream (Qty)",
  "Merrycream (Kg)",
  "Free Regular (Kg)",
  "Free Cream (Kg)",
  "Net Regular (Kg)",
  "Net Cream/Avocado (Kg)",
  "Total KG",
  "% Achta",
  "Price per kilo theor",
  "Price per kilo act",
  "Notes",
];

function safeBranchName(name) {
  return (name || "Unknown").toString().trim() || "Unknown";
}

function safeSheetName(name) {
  return (
    safeBranchName(name)
      .replace(/[:\\/?*\[\]]/g, " ")
      .substring(0, 31)
      .trim() || "Unknown"
  );
}

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/**
 * يدعم النظام الجديد والقديم:
 * - الجديد: الحقول المحسوبة القادمة من EmployeeForm الجديد
 * - القديم: regular / diet / cream / avocado
 */
function normalizeInventoryRow(it) {
  const merryQty = n(it.merryQty);
  const merryKg = round2(merryQty * 0.22);

  const freeRegular = n(it.freeRegular);
  const freeCream = n(it.freeCream);

  // النظام الجديد
  const hasNewShape =
    "regularBigTotalKg" in (it || {}) ||
    "regularSmallTotalKg" in (it || {}) ||
    "dietTotalKg" in (it || {}) ||
    "dietBigTotalKg" in (it || {}) ||
    "creamTotalKg" in (it || {}) ||
    "avocadoTotalKg" in (it || {});

  if (hasNewShape) {
    const regularOnlyKg = round2(
      n(it.regularBigTotalKg) + n(it.regularSmallTotalKg)
    );

    const dietOnlyKg = round2(
      n(it.dietTotalKg) + n(it.dietBigTotalKg)
    );

    const creamOnlyKg = round2(n(it.creamTotalKg));
    const avocadoOnlyKg = round2(n(it.avocadoTotalKg));

    const netRegularKg = round2(regularOnlyKg + merryKg - freeRegular);
    const netCreamAvocadoKg = round2(creamOnlyKg + avocadoOnlyKg - freeCream);
    const totalKg = round2(netRegularKg + dietOnlyKg + netCreamAvocadoKg);
    const pctAchta = totalKg === 0 ? 0 : round2((creamOnlyKg / totalKg) * 100);

    return {
      date: it.dateStr || "",
      branch: safeBranchName(it.branchName),
      employee: it.employeeName || "",
      regularOnlyKg,
      dietOnlyKg,
      creamOnlyKg,
      avocadoOnlyKg,
      merryQty,
      merryKg,
      freeRegular,
      freeCream,
      netRegularKg,
      netCreamAvocadoKg,
      totalKg,
      pctAchta,
      notes: it.notes || "",
    };
  }

  // النظام القديم
  const regularOnlyKg = round2(n(it.regular));
  const dietOnlyKg = round2(n(it.diet));
  const creamOnlyKg = round2(n(it.cream));
  const avocadoOnlyKg = round2(n(it.avocado));

  const netRegularKg = round2(regularOnlyKg + merryKg - freeRegular);
  const netCreamAvocadoKg = round2(creamOnlyKg + avocadoOnlyKg - freeCream);
  const totalKg = round2(netRegularKg + dietOnlyKg + netCreamAvocadoKg);
  const pctAchta = totalKg === 0 ? 0 : round2((creamOnlyKg / totalKg) * 100);

  return {
    date: it.dateStr || "",
    branch: safeBranchName(it.branchName),
    employee: it.employeeName || "",
    regularOnlyKg,
    dietOnlyKg,
    creamOnlyKg,
    avocadoOnlyKg,
    merryQty,
    merryKg,
    freeRegular,
    freeCream,
    netRegularKg,
    netCreamAvocadoKg,
    totalKg,
    pctAchta,
    notes: it.notes || "",
  };
}

export function buildWorkbookFromInventory({ groupedByBranch, fromDate, toDate }) {
  const wb = XLSX.utils.book_new();

  const branches = Object.keys(groupedByBranch || {});
  if (branches.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([COLS]);
    ws["!rtl"] = false;
    XLSX.utils.book_append_sheet(wb, ws, "Empty");
    wb.Workbook = { CalcPr: { fullCalcOnLoad: true } };
    return wb;
  }

  branches.forEach((branchRaw) => {
    const branchName = safeBranchName(branchRaw);

    const items = (groupedByBranch[branchRaw] || [])
      .slice()
      .sort((a, b) => (a.dateStr || "").localeCompare(b.dateStr || ""));

    const aoa = [];

    // إعدادات قابلة للتعديل من المدير
    aoa.push(["Cream Price", 22.2]); // A1,B1
    aoa.push(["Regular Price", 15]); // A2,B2
    aoa.push([]);
    aoa.push(COLS); // الصف الرابع

    items.forEach((it, idx) => {
      const rowNum = idx + 5; // أول سطر بيانات

      const row = normalizeInventoryRow(it);

      aoa.push([
        row.date,               // A
        row.branch,             // B
        row.employee,           // C
        row.regularOnlyKg,      // D
        row.dietOnlyKg,         // E
        row.creamOnlyKg,        // F
        row.avocadoOnlyKg,      // G
        row.merryQty,           // H
        row.merryKg,            // I
        row.freeRegular,        // J
        row.freeCream,          // K
        row.netRegularKg,       // L
        row.netCreamAvocadoKg,  // M
        row.totalKg,            // N
        row.pctAchta,           // O
        { t: "n", f: `=(($B$1*O${rowNum})/100)+$B$2` }, // P
        "",                     // Q manual
        row.notes,              // R
      ]);
    });

    // سطر مجموع في النهاية
    const firstDataRow = 5;
    const lastDataRow = items.length + 4;

  

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!rtl"] = false;

    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 16 }, // Branch
      { wch: 18 }, // Employee
      { wch: 18 }, // Regular Total
      { wch: 16 }, // Diet Total
      { wch: 16 }, // Cream Total
      { wch: 16 }, // Avocado Total
      { wch: 18 }, // Merry Qty
      { wch: 16 }, // Merry Kg
      { wch: 18 }, // Free Regular
      { wch: 16 }, // Free Cream
      { wch: 18 }, // Net Regular
      { wch: 22 }, // Net Cream/Avocado
      { wch: 14 }, // Total KG
      { wch: 10 }, // % Achta
      { wch: 20 }, // Price theor
      { wch: 18 }, // Price act
      { wch: 30 }, // Notes
    ];

    // تنسيق الأرقام
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      ["D", "E", "F", "G", "I", "J", "K", "L", "M", "N", "O", "P"].forEach((col) => {
        const cell = ws[`${col}${R + 1}`];
        if (cell && (cell.t === "n" || cell.f)) {
          cell.z = "0.00";
        }
      });
    }

    // H = qty
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[`H${R + 1}`];
      if (cell && cell.t === "n") {
        cell.z = "0";
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(branchName));
  });

  wb.Workbook = { CalcPr: { fullCalcOnLoad: true } };

  wb.Props = {
    Title: "IceCream Inventory",
    Subject: `From ${fromDate} to ${toDate}`,
    Author: "IceCream System",
    CreatedDate: new Date(),
  };

  return wb;
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}