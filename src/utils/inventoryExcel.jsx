import * as XLSX from "xlsx";
import {
  safeBranchName,
  buildCycleRows,
  calcTheoreticalPricePerKilo,
} from "./inventoryLogic";

const COLS = [
  "Cycle Label",
  "Cycle Status",
  "Manager Note",
  "From Date",
  "To Date",
  "Branch",
  "Employee",
  "Inventory Docs Used",
  "Incoming Docs Used",
  "Previous Total (Kg)",
  "Incoming Total (Kg)",
  "Current Total (Kg)",
  "Sold Total (Kg)",
  "Regular Sold (Kg)",
  "Diet Sold (Kg)",
  "Ashta+Avocado Sold (Kg)",
  "Merry Cream Sold (Kg)",
  "Regular Current (Kg)",
  "Diet Current (Kg)",
  "Ashta+Avocado Current (Kg)",
  "Merry Cream Current (Kg)",
  "% Ashta+Avocado",
  "Price per kilo theor",
  "Free Regular (Kg)",
  "Free Ashta+Avocado (Kg)",
  "Notes",
];

function safeSheetName(name) {
  return (
    safeBranchName(name)
      .replace(/[:\\/?*\[\]]/g, " ")
      .substring(0, 31)
      .trim() || "Unknown"
  );
}

function excelCycleStatus(row) {
  if (row?.cycleStatus === "completed") return "COMPLETED";
  if (row?.cycleStatus === "open_cycle") return "OPEN";
  if (row?.cycleStatus === "first_only") return "FIRST_ONLY";
  return String(row?.cycleStatus || "").toUpperCase() || "UNKNOWN";
}

function normalizeExcelRow(row) {
  return {
    cycleLabel: row.cycleLabel || "",
    cycleStatus: excelCycleStatus(row),
    managerNote: row.managerNote || "",
    fromDate: row.openingDate || row.dateStr || "-",
    toDate: row.closingDate || "-",
    branch: row.branch || "",
    employee: row.employee || "",
    inventoryDocsUsed: row.inventoryDocsUsed ?? "",
    incomingDocsUsed: row.incomingDocs ?? "",
    previousTotalKg: row.previousTotalKg,
    incomingTotalKg: row.incomingTotalKg,
    currentTotalKg: row.currentTotalKg,
    soldTotalKg: row.soldTotalKg,
    soldRegularKg: row.soldRegularKg,
    soldDietKg: row.soldDietKg,
    soldAshtaAvocadoKg: row.soldAshtaAvocadoKg,
    soldMerryKg: row.soldMerryKg,
    regularCurrentKg: row.regularBaseCurrentKg,
    dietCurrentKg: row.dietTotalKg,
    ashtaAvocadoCurrentKg: row.ashtaAvocadoTotalKg,
    merryCurrentKg: row.merryKg,
    pctAshtaAvocado: row.pctAshtaAvocado,
    freeRegularKg: row.freeRegularKg,
    freeAshtaAvocadoKg: row.freeAshtaAvocadoKg,
    notes: row.notes || "",
  };
}

function applyNumberFormats(ws) {
  const numericColumns = [
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  const ref = ws["!ref"];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    numericColumns.forEach((col) => {
      const cell = ws[`${col}${rowIndex + 1}`];
      if (cell && cell.t === "n") {
        cell.z = "0.00";
      }
    });
  }
}

export function buildWorkbookFromInventory({
  groupedByBranch,
  fromDate,
  toDate,
  ashtaPrice = 22.2,
  regularPrice = 15,
}) {
  const wb = XLSX.utils.book_new();
  const branchKeys = Object.keys(groupedByBranch || {});

  if (branchKeys.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([COLS]);
    ws["!rtl"] = true;
    XLSX.utils.book_append_sheet(wb, ws, "Empty");
    return wb;
  }

  branchKeys.forEach((branchRaw) => {
    const branchName = safeBranchName(branchRaw);
    const cycleRows = buildCycleRows(groupedByBranch[branchRaw] || [], branchName).rows.map(
      normalizeExcelRow
    );

    const aoa = [
      ["Ashta+Avocado Price", ashtaPrice],
      ["Regular Price", regularPrice],
      ["Branch", branchName],
      ["Date Range", `${fromDate} -> ${toDate}`],
      [],
      COLS,
    ];

    cycleRows.forEach((row) => {
      const price =
        row.soldTotalKg != null
          ? calcTheoreticalPricePerKilo({
              ashtaPrice,
              regularPrice,
              pct: row.pctAshtaAvocado,
            })
          : "";

      aoa.push([
        row.cycleLabel,
        row.cycleStatus,
        row.managerNote,
        row.fromDate,
        row.toDate,
        row.branch,
        row.employee,
        row.inventoryDocsUsed,
        row.incomingDocsUsed,
        row.previousTotalKg,
        row.incomingTotalKg,
        row.currentTotalKg,
        row.soldTotalKg,
        row.soldRegularKg,
        row.soldDietKg,
        row.soldAshtaAvocadoKg,
        row.soldMerryKg,
        row.regularCurrentKg,
        row.dietCurrentKg,
        row.ashtaAvocadoCurrentKg,
        row.merryCurrentKg,
        row.pctAshtaAvocado,
        price,
        row.freeRegularKg,
        row.freeAshtaAvocadoKg,
        row.notes,
      ]);
    });

    if (aoa.length === 6) {
      aoa.push(["لا توجد بيانات كافية ضمن الفترة المحددة"]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!rtl"] = true;

    ws["!cols"] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 55 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
      { wch: 30 },
    ];

    applyNumberFormats(ws);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(branchName));
  });

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