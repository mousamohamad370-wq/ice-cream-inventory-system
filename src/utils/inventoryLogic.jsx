export function yyyy_mm_dd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function safeBranchName(name) {
  return (name || "غير معروف").toString().trim() || "غير معروف";
}

export function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

export function round2(x) {
  return Math.round((n(x) + Number.EPSILON) * 100) / 100;
}

export function formatKg(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${round2(value)} كغ`;
}

export function getMerryKgPerQty(it) {
  return "merryKgPerQty" in (it || {}) ? n(it.merryKgPerQty) : 0.22;
}

export function calcPct(part, total) {
  if (!total) return 0;
  return round2((part / total) * 100);
}

export function calcTheoreticalPricePerKilo({ ashtaPrice, regularPrice, pct }) {
  const _ashtaPrice = n(ashtaPrice);
  const _regularPrice = n(regularPrice);
  const _pct = n(pct);

  return round2(((_ashtaPrice * _pct) / 100) + _regularPrice);
}

export function getDocMillis(it) {
  if (!it) return 0;

  if (it?.createdAt?.toDate) {
    const ms = it.createdAt.toDate().getTime();
    if (Number.isFinite(ms)) return ms;
  }

  if (typeof it?.createdAt?.seconds === "number") {
    return it.createdAt.seconds * 1000;
  }

  if (it?.dateTs?.toDate) {
    const ms = it.dateTs.toDate().getTime();
    if (Number.isFinite(ms)) return ms;
  }

  if (typeof it?.dateTs?.seconds === "number") {
    return it.dateTs.seconds * 1000;
  }

  if (it?.dateStr) {
    const ms = new Date(`${it.dateStr}T00:00:00`).getTime();
    if (Number.isFinite(ms)) return ms;
  }

  return 0;
}

export function sortByDateAndTime(items = []) {
  return items.slice().sort((a, b) => {
    const byDate = (a.dateStr || "").localeCompare(b.dateStr || "");
    if (byDate !== 0) return byDate;

    const aTime = getDocMillis(a);
    const bTime = getDocMillis(b);

    if (aTime !== bTime) return aTime - bTime;

    return String(a?._docId || "").localeCompare(String(b?._docId || ""));
  });
}

export function formatDateTime(ts) {
  try {
    if (!ts) return "-";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleString("ar-LB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function isIncomingWithinCycle(incomingDoc, openingDoc, closingDoc) {
  const incomingDate = incomingDoc?.dateStr || "";
  const openDate = openingDoc?.dateStr || "";
  const closeDate = closingDoc?.dateStr || "";

  if (!incomingDate || !openDate || !closeDate) return false;
  if (incomingDate < openDate || incomingDate > closeDate) return false;

  const incomingMs = getDocMillis(incomingDoc);
  const openingMs = getDocMillis(openingDoc);
  const closingMs = getDocMillis(closingDoc);

  if (incomingDate === openDate && incomingMs && openingMs && incomingMs <= openingMs) {
    return false;
  }

  if (incomingDate === closeDate && incomingMs && closingMs && incomingMs > closingMs) {
    return false;
  }

  return true;
}

export function isIncomingAfterInventory(incomingDoc, inventoryDoc) {
  const incomingDate = incomingDoc?.dateStr || "";
  const inventoryDate = inventoryDoc?.dateStr || "";

  if (!incomingDate || !inventoryDate) return false;
  if (incomingDate < inventoryDate) return false;
  if (incomingDate > inventoryDate) return true;

  const incomingMs = getDocMillis(incomingDoc);
  const inventoryMs = getDocMillis(inventoryDoc);

  if (incomingMs && inventoryMs) {
    return incomingMs > inventoryMs;
  }

  return false;
}

export function getCurrentInventoryRow(it) {
  const merryQty = n(it?.merryQty);
  const merryKg = round2(merryQty * getMerryKgPerQty(it));

  const freeRegularKg = round2(n(it?.freeRegular));
  const freeAshtaAvocadoKg = round2(
    "freeAshtaAvocado" in (it || {})
      ? n(it?.freeAshtaAvocado)
      : "freeCream" in (it || {})
        ? n(it?.freeCream)
        : 0
  );
  const freeCreamKg = round2(
    "freeCream" in (it || {}) ? n(it?.freeCream) : freeAshtaAvocadoKg
  );

  const hasNewShape =
    "regularBigTotalKg" in (it || {}) ||
    "regularSmallTotalKg" in (it || {}) ||
    "dietTotalKg" in (it || {}) ||
    "dietBigTotalKg" in (it || {}) ||
    "creamTotalKg" in (it || {}) ||
    "avocadoTotalKg" in (it || {}) ||
    "ashtaTotalKg" in (it || {});

  if (hasNewShape) {
    const regularBaseKg = round2(n(it.regularBigTotalKg) + n(it.regularSmallTotalKg));
    const regularTotalKg = round2(regularBaseKg + merryKg);
    const dietOnlyKg = round2(n(it.dietTotalKg) + n(it.dietBigTotalKg));
    const ashtaOnlyKg = round2(
      "ashtaTotalKg" in (it || {}) ? n(it.ashtaTotalKg) : n(it.creamTotalKg)
    );
    const avocadoOnlyKg = round2(n(it.avocadoTotalKg));
    const ashtaAvocadoKg = round2(ashtaOnlyKg + avocadoOnlyKg);
    const totalKg = round2(regularBaseKg + dietOnlyKg + ashtaAvocadoKg + merryKg);
    const pctAshtaAvocado = calcPct(ashtaAvocadoKg, totalKg);

    return {
      date: it.dateStr || "",
      branch: safeBranchName(it.branchName),
      employee: it.employeeName || "",
      regularBaseKg,
      regularTotalKg,
      dietOnlyKg,
      ashtaOnlyKg,
      avocadoOnlyKg,
      ashtaAvocadoKg,
      merryQty,
      merryKg,
      totalKg,
      pctAshtaAvocado,
      freeRegularKg,
      freeAshtaAvocadoKg,
      freeCreamKg,
      notes: it.notes || "",
      createdAt: it.createdAt || null,
      dateTs: it.dateTs || null,
    };
  }

  const regularBaseKg = round2(n(it?.regular));
  const regularTotalKg = round2(regularBaseKg + merryKg);
  const dietOnlyKg = round2(n(it?.diet));
  const ashtaOnlyKg = round2("ashta" in (it || {}) ? n(it.ashta) : n(it.cream));
  const avocadoOnlyKg = round2(n(it?.avocado));
  const ashtaAvocadoKg = round2(ashtaOnlyKg + avocadoOnlyKg);
  const totalKg = round2(regularBaseKg + dietOnlyKg + ashtaAvocadoKg + merryKg);
  const pctAshtaAvocado = calcPct(ashtaAvocadoKg, totalKg);

  return {
    date: it.dateStr || "",
    branch: safeBranchName(it.branchName),
    employee: it.employeeName || "",
    regularBaseKg,
    regularTotalKg,
    dietOnlyKg,
    ashtaOnlyKg,
    avocadoOnlyKg,
    ashtaAvocadoKg,
    merryQty,
    merryKg,
    totalKg,
    pctAshtaAvocado,
    freeRegularKg,
    freeAshtaAvocadoKg,
    freeCreamKg,
    notes: it.notes || "",
    createdAt: it.createdAt || null,
    dateTs: it.dateTs || null,
  };
}

export function getIncomingRow(it) {
  const merryKgPerQty = getMerryKgPerQty(it);

  const regularKg = round2(n(it?.weeklyIncomingRegularKg));
  const dietKg = round2(
    "weeklyIncomingDietTotalKg" in (it || {})
      ? n(it.weeklyIncomingDietTotalKg)
      : n(it.weeklyIncomingDietKg)
  );

  const ashtaAvocadoKg = round2(
    ("weeklyIncomingAshtaKg" in (it || {})
      ? n(it.weeklyIncomingAshtaKg)
      : n(it.weeklyIncomingCreamKg)) + n(it?.weeklyIncomingAvocadoKg)
  );

  const merryQty = n(it?.weeklyIncomingMerryQty);
  const merryKg = round2(
    "weeklyIncomingMerryKg" in (it || {})
      ? n(it.weeklyIncomingMerryKg)
      : merryQty * merryKgPerQty
  );

  return {
    date: it.dateStr || "",
    branch: safeBranchName(it.branchName),
    regularKg,
    dietKg,
    ashtaAvocadoKg,
    merryQty,
    merryKg,
    totalKg: round2(regularKg + dietKg + ashtaAvocadoKg + merryKg),
    createdAt: it.createdAt || null,
    dateTs: it.dateTs || null,
  };
}

export function sumIncomingDocs(items = []) {
  return items.reduce(
    (acc, incomingDoc) => {
      const incoming = getIncomingRow(incomingDoc);

      return {
        regularKg: round2(acc.regularKg + incoming.regularKg),
        dietKg: round2(acc.dietKg + incoming.dietKg),
        ashtaAvocadoKg: round2(acc.ashtaAvocadoKg + incoming.ashtaAvocadoKg),
        merryQty: round2(acc.merryQty + incoming.merryQty),
        merryKg: round2(acc.merryKg + incoming.merryKg),
        totalKg: round2(acc.totalKg + incoming.totalKg),
      };
    },
    {
      regularKg: 0,
      dietKg: 0,
      ashtaAvocadoKg: 0,
      merryQty: 0,
      merryKg: 0,
      totalKg: 0,
    }
  );
}

export function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return round2(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (Array.isArray(value)) {
    if (!value.length) return "-";
    return value.map((v) => formatFieldValue(v)).join("، ");
  }

  if (value?.toDate) return formatDateTime(value);
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

export function humanizeKey(key) {
  const keyMap = {
    branchName: "اسم الفرع",
    employeeName: "اسم الموظف",
    dateStr: "التاريخ",
    type: "النوع",
    notes: "ملاحظات",
    regular: "عادي",
    diet: "دايت",
    ashta: "قشطة",
    cream: "قشطة",
    avocado: "أفوكادو",
    merryQty: "عدد ميري",
    merryKgPerQty: "وزن الميري",
    regularBigTotalKg: "إجمالي العادي الكبير",
    regularSmallTotalKg: "إجمالي العادي الصغير",
    dietTotalKg: "إجمالي الدايت",
    dietBigTotalKg: "إجمالي الدايت الكبير",
    creamTotalKg: "إجمالي القشطة",
    ashtaTotalKg: "إجمالي القشطة",
    avocadoTotalKg: "إجمالي الأفوكادو",
    freeRegular: "فري عادي",
    freeAshtaAvocado: "فري قشطة وأفوكادو",
    freeCream: "فري قشطة",
    weeklyIncomingRegularKg: "وارد عادي",
    weeklyIncomingDietKg: "وارد دايت",
    weeklyIncomingDietTotalKg: "وارد دايت",
    weeklyIncomingCreamKg: "وارد قشطة",
    weeklyIncomingAshtaKg: "وارد قشطة",
    weeklyIncomingAvocadoKg: "وارد أفوكادو",
    weeklyIncomingMerryQty: "عدد وارد ميري",
    weeklyIncomingMerryKg: "وزن وارد ميري",
  };

  if (keyMap[key]) return keyMap[key];

  return key
    .replace(/^_/, "")
    .replace(/cream/g, "ashta")
    .replace(/Cream/g, "Ashta")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildOriginalFields(item) {
  if (!item) return [];

  const hiddenKeys = new Set(["_docId", "dateTs", "createdAt"]);

  return Object.keys(item)
    .filter((key) => !hiddenKeys.has(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      label: humanizeKey(key),
      value: formatFieldValue(item[key]),
    }));
}

export function buildCycleRows(items = [], branch) {
  const sortedItems = sortByDateAndTime(items);
  const inventoryDocs = sortedItems.filter((it) => (it.type || "inventory") !== "incoming");
  const incomingDocs = sortedItems.filter((it) => (it.type || "inventory") === "incoming");

  const rows = [];
  const warnings = [];

  if (inventoryDocs.length === 0) {
    if (incomingDocs.length > 0) {
      warnings.push({
        type: "warning",
        title: "وارد بدون جردة",
        message:
          "يوجد واردات ضمن هذه الفترة لكن لا توجد أي جردة مرتبطة بها، لذلك لا يمكن احتساب المبيع.",
        count: incomingDocs.length,
      });
    }

    return {
      rows,
      warnings,
      inventoryDocsCount: 0,
      incomingDocsCount: incomingDocs.length,
      completedCyclesCount: 0,
      openCyclesCount: 0,
    };
  }

  const firstInventoryDate = inventoryDocs[0]?.dateStr || "";

  const incomingBeforeFirstInventory = incomingDocs.filter((it) => {
    const incomingDate = it.dateStr || "";
    if (incomingDate < firstInventoryDate) return true;

    if (incomingDate === firstInventoryDate) {
      return getDocMillis(it) < getDocMillis(inventoryDocs[0]);
    }

    return false;
  });

  if (incomingBeforeFirstInventory.length > 0) {
    warnings.push({
      type: "warning",
      title: "وارد قبل أول جردة",
      message:
        "يوجد واردات قبل أول جردة ضمن الفترة، وهذه الواردات لن تدخل في أي دورة مبيع.",
      count: incomingBeforeFirstInventory.length,
    });
  }

  if (inventoryDocs.length === 1) {
    const firstInventoryDoc = inventoryDocs[0];
    const current = getCurrentInventoryRow(firstInventoryDoc);

    const incomingAfterFirstInventory = incomingDocs.filter((incoming) =>
      isIncomingAfterInventory(incoming, firstInventoryDoc)
    );

    const pendingIncoming = sumIncomingDocs(incomingAfterFirstInventory);

    warnings.push({
      type: "info",
      title: "جردة واحدة فقط",
      message:
        incomingAfterFirstInventory.length > 0
          ? "يوجد جردة واحدة فقط ضمن الفترة المحددة، ويوجد واردات بعدها، لكن لا يمكن احتساب المبيع حتى تُسجل الجردة التالية."
          : "يوجد جردة واحدة فقط ضمن الفترة المحددة. هذه تعتبر الجردة الأولى، وفي انتظار الجردة التالية لاحتساب المبيع الكلي.",
      count: 1,
    });

    rows.push({
      id: `${branch}-${firstInventoryDoc._docId}-open-only`,
      docId: firstInventoryDoc._docId,
      branch,
      cycleKey: `${branch}-single-${firstInventoryDoc._docId}`,
      cycleLabel: "الجردة الأولى",
      cycleIndex: 1,
      openingDate: current.date,
      closingDate: "-",
      dateStr: current.date,
      employee: current.employee || "-",
      sentAt: formatDateTime(firstInventoryDoc.createdAt),
      previousTotalKg: null,
      incomingTotalKg: pendingIncoming.totalKg,
      currentTotalKg: current.totalKg,
      soldTotalKg: null,
      soldRegularKg: null,
      soldDietKg: null,
      soldAshtaAvocadoKg: null,
      soldMerryKg: null,
      regularTotalKg: current.regularTotalKg,
      regularBaseCurrentKg: current.regularBaseKg,
      dietTotalKg: current.dietOnlyKg,
      ashtaTotalKg: current.ashtaOnlyKg,
      avocadoTotalKg: current.avocadoOnlyKg,
      ashtaAvocadoTotalKg: current.ashtaAvocadoKg,
      merryQty: current.merryQty,
      merryKg: current.merryKg,
      pctAshtaAvocado: current.pctAshtaAvocado,
      freeRegularKg: current.freeRegularKg,
      freeAshtaAvocadoKg: current.freeAshtaAvocadoKg,
      freeCreamKg: current.freeCreamKg,
      incomingDocs: incomingAfterFirstInventory.length,
      inventoryDocsUsed: 1,
      notes: current.notes || "",
      isIncompleteCycle: true,
      cycleStatus: "first_only",
      managerNote:
        incomingAfterFirstInventory.length > 0
          ? "هذه أول جردة ضمن الفترة المحددة، ويوجد واردات بعدها، لكن لا يمكن احتساب المبيع بعد لأن الدورة تحتاج إلى جردة تالية لإغلاقها."
          : "هذه أول جردة ضمن الفترة المحددة. لا يمكن احتساب المبيع بعد، لأن الدورة تحتاج إلى جردة تالية لإغلاقها.",
      rawSource: firstInventoryDoc,
    });

    return {
      rows,
      warnings,
      inventoryDocsCount: inventoryDocs.length,
      incomingDocsCount: incomingDocs.length,
      completedCyclesCount: 0,
      openCyclesCount: 1,
    };
  }

  let completedCyclesCount = 0;

  for (let i = 1; i < inventoryDocs.length; i += 1) {
    const openingDoc = inventoryDocs[i - 1];
    const closingDoc = inventoryDocs[i];

    const opening = getCurrentInventoryRow(openingDoc);
    const closing = getCurrentInventoryRow(closingDoc);

    const betweenIncomingDocs = incomingDocs.filter((incoming) =>
      isIncomingWithinCycle(incoming, openingDoc, closingDoc)
    );

    const pendingIncoming = sumIncomingDocs(betweenIncomingDocs);

    const soldRegularKg = round2(
      opening.regularBaseKg + pendingIncoming.regularKg - closing.regularBaseKg
    );

    const soldDietKg = round2(
      opening.dietOnlyKg + pendingIncoming.dietKg - closing.dietOnlyKg
    );

    const soldAshtaAvocadoKg = round2(
      opening.ashtaAvocadoKg + pendingIncoming.ashtaAvocadoKg - closing.ashtaAvocadoKg
    );

    const soldMerryKg = round2(opening.merryKg + pendingIncoming.merryKg - closing.merryKg);

    const soldTotalKg = round2(
      n(soldRegularKg) + n(soldDietKg) + n(soldAshtaAvocadoKg) + n(soldMerryKg)
    );

    const pctAshtaAvocado = calcPct(n(soldAshtaAvocadoKg), n(soldTotalKg));

    const gapDays = daysBetween(opening.date, closing.date);
    if (gapDays > 10) {
      warnings.push({
        type: "warning",
        title: "فجوة طويلة بين الجردات",
        message: `يوجد فجوة ${gapDays} أيام بين جردتين متتاليتين في ${branch}.`,
        count: 1,
        cycleIndex: i,
      });
    }

    completedCyclesCount += 1;

    rows.push({
      id: `${branch}-${closingDoc._docId}-cycle-${i}`,
      docId: closingDoc._docId,
      branch,
      cycleKey: `${branch}-cycle-${i}-${closingDoc._docId}`,
      cycleLabel: `الدورة ${i}`,
      cycleIndex: i,
      openingDate: opening.date,
      closingDate: closing.date,
      dateStr: closing.date,
      employee: closing.employee || "-",
      sentAt: formatDateTime(closingDoc.createdAt),
      previousTotalKg: opening.totalKg,
      incomingTotalKg: pendingIncoming.totalKg,
      currentTotalKg: closing.totalKg,
      soldTotalKg,
      soldRegularKg,
      soldDietKg,
      soldAshtaAvocadoKg,
      soldMerryKg,
      regularTotalKg: closing.regularTotalKg,
      regularBaseCurrentKg: closing.regularBaseKg,
      dietTotalKg: closing.dietOnlyKg,
      ashtaTotalKg: closing.ashtaOnlyKg,
      avocadoTotalKg: closing.avocadoOnlyKg,
      ashtaAvocadoTotalKg: closing.ashtaAvocadoKg,
      merryQty: closing.merryQty,
      merryKg: closing.merryKg,
      pctAshtaAvocado,
      freeRegularKg: closing.freeRegularKg,
      freeAshtaAvocadoKg: closing.freeAshtaAvocadoKg,
      freeCreamKg: closing.freeCreamKg,
      incomingDocs: betweenIncomingDocs.length,
      inventoryDocsUsed: 2,
      notes: closing.notes || "",
      isIncompleteCycle: false,
      cycleStatus: "completed",
      managerNote: `هذه دورة مكتملة من ${opening.date} إلى ${closing.date}، والمبيع الظاهر هنا هو المبيع الكلي الناتج بين هاتين الجردتين مع احتساب الواردات المسجلة ضمن نفس الفترة.`,
      rawSource: closingDoc,
    });
  }

  const lastInventoryDoc = inventoryDocs[inventoryDocs.length - 1];
  const lastInventoryRow = getCurrentInventoryRow(lastInventoryDoc);

  const incomingAfterLastInventory = incomingDocs.filter((incoming) =>
    isIncomingAfterInventory(incoming, lastInventoryDoc)
  );

  const pendingIncomingAfterLastInventory = sumIncomingDocs(incomingAfterLastInventory);

  warnings.push({
    type: "info",
    title: "دورة مفتوحة",
    message:
      incomingAfterLastInventory.length > 0
        ? "آخر جردة ضمن الفترة تعتبر بداية دورة جديدة، ويوجد واردات بعدها، لكنها ما زالت مفتوحة بانتظار الجردة التالية لإتمام حساب المبيع."
        : "آخر جردة ضمن الفترة تعتبر بداية دورة جديدة وما زالت مفتوحة بانتظار الجردة التالية لإتمام حساب المبيع.",
      count: 1,
    });

  rows.push({
    id: `${branch}-${lastInventoryDoc._docId}-open-end`,
    docId: lastInventoryDoc._docId,
    branch,
    cycleKey: `${branch}-open-end-${lastInventoryDoc._docId}`,
    cycleLabel: "دورة مفتوحة",
    cycleIndex: inventoryDocs.length,
    openingDate: lastInventoryDoc.dateStr || "-",
    closingDate: "-",
    dateStr: lastInventoryDoc.dateStr || "-",
    employee: lastInventoryDoc.employeeName || "-",
    sentAt: formatDateTime(lastInventoryDoc.createdAt),
    previousTotalKg: null,
    incomingTotalKg: pendingIncomingAfterLastInventory.totalKg,
    currentTotalKg: lastInventoryRow.totalKg,
    soldTotalKg: null,
    soldRegularKg: null,
    soldDietKg: null,
    soldAshtaAvocadoKg: null,
    soldMerryKg: null,
    regularTotalKg: lastInventoryRow.regularTotalKg,
    regularBaseCurrentKg: lastInventoryRow.regularBaseKg,
    dietTotalKg: lastInventoryRow.dietOnlyKg,
    ashtaTotalKg: lastInventoryRow.ashtaOnlyKg,
    avocadoTotalKg: lastInventoryRow.avocadoOnlyKg,
    ashtaAvocadoTotalKg: lastInventoryRow.ashtaAvocadoKg,
    merryQty: lastInventoryRow.merryQty,
    merryKg: lastInventoryRow.merryKg,
    pctAshtaAvocado: lastInventoryRow.pctAshtaAvocado,
    freeRegularKg: lastInventoryRow.freeRegularKg,
    freeAshtaAvocadoKg: lastInventoryRow.freeAshtaAvocadoKg,
    freeCreamKg: lastInventoryRow.freeCreamKg,
    incomingDocs: incomingAfterLastInventory.length,
    inventoryDocsUsed: 1,
    notes: lastInventoryRow.notes || "",
    isIncompleteCycle: true,
    cycleStatus: "open_cycle",
    managerNote:
      incomingAfterLastInventory.length > 0
        ? "هذه الجردة هي آخر جردة ضمن الفترة المحددة، ويوجد واردات بعدها، لكن الدورة ما زالت مفتوحة وسيتم احتساب المبيع عند تسجيل الجردة التالية."
        : "هذه الجردة هي آخر جردة ضمن الفترة المحددة، وتُعتبر بداية دورة جديدة ما زالت مفتوحة. سيتم احتساب المبيع عند تسجيل الجردة التالية.",
    rawSource: lastInventoryDoc,
  });

  return {
    rows,
    warnings,
    inventoryDocsCount: inventoryDocs.length,
    incomingDocsCount: incomingDocs.length,
    completedCyclesCount,
    openCyclesCount: 1,
  };
}

export function getBranchStatus(item) {
  if (item.completedCyclesCount > 0 && item.openCyclesCount > 0) {
    return {
      rank: 1,
      label: "يحتاج متابعة",
      tone: "warning",
      note: "يوجد دورات مكتملة، وآخر جردة ما زالت مفتوحة بانتظار الإغلاق.",
    };
  }

  if (item.completedCyclesCount > 0) {
    return {
      rank: 4,
      label: "مكتمل",
      tone: "success",
      note: "هذا الفرع لديه دورة أو أكثر مكتملة، ويمكن قراءة المبيع الظاهر مباشرة.",
    };
  }

  if (item.inventoryDocsCount === 1) {
    return {
      rank: 2,
      label: "أول جردة",
      tone: "info",
      note: "يوجد جردة أولى فقط لهذا الفرع ضمن الفترة، والمبيع لم يكتمل بعد.",
    };
  }

  if (item.openCyclesCount > 0) {
    return {
      rank: 1,
      label: "مفتوح",
      tone: "warning",
      note: "الفرع لديه دورة مفتوحة بانتظار الجردة التالية لإتمام الحساب.",
    };
  }

  return {
    rank: 3,
    label: "مستقر",
    tone: "stable",
    note: "لا توجد ملاحظة",
  };
}