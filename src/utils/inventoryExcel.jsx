import * as XLSX from "xlsx";

const COLS = [
  "Date",
  "Branch",
  "Employee",
  "Regular (Kg)",
  "Diet (Kg)",
  "Cream (Kg)",
  "Avocado (Kg)",
  "Merrycream (Qty)",
  "Merrycream (Kg)",
  "Free Regular (Kg)",
  "Free Cream (Kg)",
  "Total Reg (Kg)",
  "Total Ach/Avo (Kg)",
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
  return safeBranchName(name)
    .replace(/[:\\/?*\[\]]/g, " ")
    .substring(0, 31)
    .trim() || "Unknown";
}

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
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

    // Row 1-2: Parameters editable by manager
    aoa.push(["Cream Price", 22.2]);   // A1,B1
    aoa.push(["Regular Price", 15]);  // A2,B2
    aoa.push([]);                     // spacer
    aoa.push(COLS);                   // header row (row 4)

    items.forEach((it, idx) => {
      const rowNum = idx + 5; // first data row = 5

      const date = it.dateStr || "";
      const branch = safeBranchName(it.branchName);
      const employee = it.employeeName || "";

      const regular = n(it.regular);
      const diet = n(it.diet);
      const cream = n(it.cream);
      const avocado = n(it.avocado);
      const merryQty = n(it.merryQty);

      const freeRegular = n(it.freeRegular);
      const freeCream = n(it.freeCream);

      const notes = it.notes || "";

      // Values (not formulas) - 2 decimals
      const merryKg = round2(merryQty * 0.22);

      // ✅ التعديل المطلوب:
      // Total Reg = Regular + MerryKg - FreeRegular
      const totalReg = round2(regular + merryKg - freeRegular);

      const totalAchAvo = round2(cream + avocado - freeCream);
      const totalKg = round2(totalReg + diet + totalAchAvo);
      const pctAchta = totalKg === 0 ? 0 : round2((cream / totalKg) * 100);

      aoa.push([
        date,         // A
        branch,       // B
        employee,     // C
        regular,      // D
        diet,         // E
        cream,        // F
        avocado,      // G
        merryQty,     // H
        merryKg,      // I
        freeRegular,  // J
        freeCream,    // K
        totalReg,     // L
        totalAchAvo,  // M
        totalKg,      // N
        pctAchta,     // O

        // P Price theor (formula uses editable params B1 and B2)
        { t: "n", f: `=(($B$1*O${rowNum})/100)+$B$2` },

        "",           // Q Price act (manual)
        notes,        // R Notes
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // LTR (left-to-right)
    ws["!rtl"] = false;

    // column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 14 }, // Branch
      { wch: 18 }, // Employee
      { wch: 14 }, // Regular
      { wch: 12 }, // Diet
      { wch: 12 }, // Cream
      { wch: 12 }, // Avocado
      { wch: 16 }, // Merry Qty
      { wch: 16 }, // Merry Kg
      { wch: 18 }, // Free Regular
      { wch: 16 }, // Free Cream
      { wch: 14 }, // Total Reg
      { wch: 18 }, // Total Ach/Avo
      { wch: 12 }, // Total KG
      { wch: 10 }, // % Achta
      { wch: 20 }, // Price theor
      { wch: 18 }, // Price act
      { wch: 30 }, // Notes
    ];

    // ✅ Format 2 decimals for numeric result columns
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      ["D","E","F","G","I","J","K","L","M","N","O","P"].forEach((col) => {
        const cell = ws[`${col}${R + 1}`];
        if (cell && (cell.t === "n" || cell.f)) cell.z = "0.00";
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(branchName));
  });

  // Force recalculation on open
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