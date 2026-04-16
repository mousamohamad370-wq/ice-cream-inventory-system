import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

// يفضّل لاحقاً نقل القيم إلى .env
const firebaseConfig = {
  apiKey: "AIzaSyBgEKqFvVk5_WN8SgvGdT-s5XqrOd4r2VE",
  authDomain: "inventory-iceream.firebaseapp.com",
  projectId: "inventory-iceream",
  storageBucket: "inventory-iceream.firebasestorage.app",
  messagingSenderId: "458649469014",
  appId: "1:458649469014:web:378184ec5a9a407901fbf7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// =====================
// APP CONFIG
// =====================

export const APP_BRAND = {
  name: "Booza Bashir",
  nameAr: "بوظة بشير",
  publicMenuPath: "/menu",
  adminMenuPath: "/admin/menu",
};

export const BRANCHES = [
  "Aley",
  "Saida",
  "Sour",
  "Nabatieh",
  "Bhamdoun",
  "Abra",
  "Shiyeh",
  "Shweyfat",
  "Batroun",
  "Marwanieh",
];

export const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// =====================
// MENU CONFIG
// =====================

export const MENU_COLLECTIONS = {
  products: "menuProducts",
  categories: "menuCategories",
  settings: "menuSettings",
};

export const MENU_CATEGORY_IDS = {
  cups: "cups",
  cones: "cones",
  family: "family",
  ashta: "ashta",
  menu: "menu",
};

export const DEFAULT_MENU_CATEGORIES = [
  {
    id: MENU_CATEGORY_IDS.cups,
    name: "كبايات",
    nameEn: "Cups",
    description: "كبايات بوظة جاهزة للتقديم اليومي",
    sortOrder: 1,
    active: true,
  },
  {
    id: MENU_CATEGORY_IDS.cones,
    name: "كورنيه",
    nameEn: "Cones",
    description: "كورنيه وكون بنكهات وأحجام مختلفة",
    sortOrder: 2,
    active: true,
  },
  {
    id: MENU_CATEGORY_IDS.family,
    name: "عائلي",
    nameEn: "Family",
    description: "علب وتقديمات للمشاركة والتجمعات",
    sortOrder: 3,
    active: true,
  },
  {
    id: MENU_CATEGORY_IDS.ashta,
    name: "قشطة",
    nameEn: "Ashta",
    description: "منتجات القشطة العربية والتقديمات الخاصة فيها",
    sortOrder: 4,
    active: true,
  },
  {
    id: MENU_CATEGORY_IDS.menu,
    name: "مميز",
    nameEn: "Menu",
    description: "منتجات خاصة ومشروبات وتشكيلات إضافية",
    sortOrder: 5,
    active: true,
  },
];

export const DEFAULT_MENU_PRODUCTS = [
  {
    id: "cup-medium",
    name: "كباية وسط",
    category: MENU_CATEGORY_IDS.cups,
    description: "الحجم الأنسب للاستمتاع بطبقات غنية من الطعم والقوام.",
    prices: [{ label: "وسط", price: 350000, sortOrder: 1 }],
    flavors: ["بوظة", "مشكل"],
    available: true,
    featured: true,
    sortOrder: 1,
    imageUrl: "/PILjH-xC.webp",
    imageMode: "local",
    badge: "متوازن",
    tags: ["كبايات", "وسط"],
  },
  {
    id: "cup-large",
    name: "كباية كبيرة",
    category: MENU_CATEGORY_IDS.cups,
    description: "حجم كبير لمحبي البوظة الكريمية مع تجربة مشبعة وفاخرة.",
    prices: [{ label: "كبير", price: 450000, sortOrder: 1 }],
    flavors: ["بوظة", "مشكل"],
    available: true,
    featured: true,
    sortOrder: 2,
    imageUrl: "/PILjH-xC.webp",
    imageMode: "local",
    badge: "كبير",
    tags: ["كبايات", "كبير"],
  },
  {
    id: "cup-ashta-medium",
    name: "كباية وسط قشطة",
    category: MENU_CATEGORY_IDS.cups,
    description: "لمحبي البوظة الطبيعية مع تجربة مشبعة وفاخرة.",
    prices: [{ label: "وسط", price: 550000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: false,
    sortOrder: 3,
    imageUrl: "/0ZhDz0ua.webp",
    imageMode: "local",
    badge: "فاخر",
    tags: ["كبايات", "قشطة"],
  },
  {
    id: "cup-ashta-large",
    name: "كباية كبيرة قشطة",
    category: MENU_CATEGORY_IDS.cups,
    description: "حجم كبير لمحبي البوظة الكريمية مع تجربة مشبعة وفاخرة.",
    prices: [{ label: "كبير", price: 650000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: false,
    sortOrder: 4,
    imageUrl: "/0ZhDz0ua.webp",
    imageMode: "local",
    badge: "قشطة",
    tags: ["كبايات", "قشطة", "كبير"],
  },
  {
    id: "cone-regular",
    name: "كون مشكل",
    category: MENU_CATEGORY_IDS.cones,
    description: "بوظة مشكلة بنكهة ناعمة وتقديم أنيق يناسب كل الأذواق.",
    prices: [
      { label: "عادي", price: 200000, sortOrder: 1 },
      { label: "كبير", price: 300000, sortOrder: 2 },
    ],
    flavors: ["فانيلا", "فستق", "شوكولا"],
    available: true,
    featured: true,
    sortOrder: 5,
    imageUrl: "/n-1SRRIK.webp",
    imageMode: "local",
    badge: "كلاسيك",
    tags: ["كون", "مشكل"],
  },
  {
    id: "cornet-regular",
    name: "كورنيه مشكل",
    category: MENU_CATEGORY_IDS.cones,
    description: "مزيج فاخر من البوظة العربية بنكهات متنوعة داخل كورنيه مقرمش.",
    prices: [
      { label: "عادي", price: 200000, sortOrder: 1 },
      { label: "كبير", price: 300000, sortOrder: 2 },
    ],
    flavors: ["فستق", "فانيلا", "شوكولا"],
    available: true,
    featured: true,
    sortOrder: 6,
    imageUrl: "/KuzxDA7s.webp",
    imageMode: "local",
    badge: "الأكثر طلباً",
    tags: ["كورنيه", "مشكل"],
  },
  {
    id: "cone-ashta",
    name: "كون قشطة",
    category: MENU_CATEGORY_IDS.cones,
    description: "كون مقرمش محشو بقشطة عربية غنية وطعم فاخر لعشاق القشطة.",
    prices: [
      { label: "عادي", price: 300000, sortOrder: 1 },
      { label: "كبير", price: 450000, sortOrder: 2 },
    ],
    flavors: ["قشطة"],
    available: true,
    featured: false,
    sortOrder: 7,
    imageUrl: "/MI4JaLAQ.webp",
    imageMode: "local",
    badge: "قشطة",
    tags: ["كون", "قشطة"],
  },
  {
    id: "cornet-ashta",
    name: "كورنيه قشطة",
    category: MENU_CATEGORY_IDS.cones,
    description: "كورنيه فاخر مع قشطة عربية ناعمة وتقديم أنيق بطعم غني ومميز.",
    prices: [
      { label: "عادي", price: 300000, sortOrder: 1 },
      { label: "كبير", price: 450000, sortOrder: 2 },
    ],
    flavors: ["قشطة"],
    available: true,
    featured: false,
    sortOrder: 8,
    imageUrl: "/5GM5GIBT.webp",
    imageMode: "local",
    badge: "قشطة",
    tags: ["كورنيه", "قشطة"],
  },
  {
    id: "family-mix-half",
    name: "نص كيلو مشكل",
    category: MENU_CATEGORY_IDS.family,
    description: "تشكيلة مناسبة للمشاركة مع العائلة بطعم فاخر ومتنوّع.",
    prices: [{ label: "نص كيلو", price: 600000, sortOrder: 1 }],
    flavors: ["مشكل"],
    available: true,
    featured: false,
    sortOrder: 9,
    imageUrl: "/نض_كيلو-removebg-preview.png",
    imageMode: "local",
    badge: "عملي",
    tags: ["عائلي", "نص كيلو", "مشكل"],
  },
  {
    id: "family-box-blastic",
    name: "Box Blastic",
    category: MENU_CATEGORY_IDS.family,
    description: "خيار مثالي للمشاركة والتقديم بكمية مناسبة وطعم لذيذ ومنعش.",
    prices: [{ label: "كيلو وربع", price: 1600000, sortOrder: 1 }],
    flavors: ["مشكل"],
    available: true,
    featured: true,
    sortOrder: 10,
    imageUrl: "/OgeCrD5F.webp",
    imageMode: "local",
    badge: "ممتاز",
    tags: ["عائلي", "Box", "مشاركة"],
  },
  {
    id: "family-ashta-1kg",
    name: "كيلو قشطة",
    category: MENU_CATEGORY_IDS.family,
    description: "قشطة ممتازة بكمية كبيرة لعشاق الطعم العربي الأصيل.",
    prices: [{ label: "1 كيلو", price: 2000000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: true,
    sortOrder: 11,
    imageUrl: "/ashta_bachri-removebg-preview.png",
    imageMode: "local",
    badge: "فاخر",
    tags: ["عائلي", "قشطة"],
  },
  {
    id: "family-ashta-600",
    name: "600 غرام قشطة",
    category: MENU_CATEGORY_IDS.family,
    description: "قشطة عربية فاخرة بقوام غني وطعم أصيل لا يُنسى.",
    prices: [{ label: "600 غرام", price: 1350000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: false,
    sortOrder: 12,
    imageUrl: "/ashta_bachri-removebg-preview.png",
    imageMode: "local",
    badge: "قشطة",
    tags: ["عائلي", "قشطة", "600 غرام"],
  },
  {
    id: "family-mix-1kg",
    name: "كيلو مشكل",
    category: MENU_CATEGORY_IDS.family,
    description: "كمية كبيرة بتشكيلة مميزة تناسب التجمعات والمناسبات.",
    prices: [{ label: "1 كيلو", price: 1300000, sortOrder: 1 }],
    flavors: ["مشكل"],
    available: true,
    featured: false,
    sortOrder: 13,
    imageUrl: "/e14tFscY.webp",
    imageMode: "local",
    badge: "اقتصادي",
    tags: ["عائلي", "كيلو", "مشكل"],
  },
  {
    id: "family-mix-600",
    name: "600 غرام مشكل",
    category: MENU_CATEGORY_IDS.family,
    description: "خيار مثالي للتقديم العائلي مع تشكيلة غنية ومتوازنة.",
    prices: [{ label: "600 غرام", price: 800000, sortOrder: 1 }],
    flavors: ["مشكل"],
    available: true,
    featured: true,
    sortOrder: 14,
    imageUrl: "/e14tFscY.webp",
    imageMode: "local",
    badge: "شائع",
    tags: ["عائلي", "مشكل", "600 غرام"],
  },
  {
    id: "ashta-quarter",
    name: "فخارة القشطة كيلو وربع",
    category: MENU_CATEGORY_IDS.ashta,
    description: "أفخم خيار للتقديم الكبير مع قشطة غنية ولمسة ضيافة راقية.",
    prices: [{ label: "كيلو وربع", price: 3000000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: true,
    sortOrder: 15,
    imageUrl: "/l3ZejifL.webp",
    imageMode: "local",
    badge: "VIP",
    tags: ["قشطة", "فخارة"],
  },
  {
    id: "ashta-1kg",
    name: "فخارة القشطة كيلو",
    category: MENU_CATEGORY_IDS.ashta,
    description: "تقديم فاخر داخل فخارة أنيقة يليق بالمناسبات والضيافة.",
    prices: [{ label: "1 كيلو", price: 2500000, sortOrder: 1 }],
    flavors: ["قشطة"],
    available: true,
    featured: true,
    sortOrder: 16,
    imageUrl: "/l3ZejifL.webp",
    imageMode: "local",
    badge: "ضيافة مميزة",
    tags: ["قشطة", "فخارة"],
  },
  {
    id: "menu-frizzmo",
    name: "فريز مو",
    category: MENU_CATEGORY_IDS.menu,
    description: "نكهة فراولة منعشة بطابع صيفي فاخر ومذاق ناعم جداً.",
    prices: [
      { label: "عادي", price: 350000, sortOrder: 1 },
      { label: "كبير", price: 450000, sortOrder: 2 },
    ],
    flavors: ["فراولة"],
    available: true,
    featured: true,
    sortOrder: 17,
    imageUrl: "/MtSoutbn.webp",
    imageMode: "local",
    badge: "منعش",
    tags: ["المنيو", "مشروبات"],
  },
  {
    id: "menu-chocomo",
    name: "شوكولا مو",
    category: MENU_CATEGORY_IDS.menu,
    description: "نكهة شوكولا كثيفة بقوام بارد وحريري لعشاق الطعم الغني.",
    prices: [
      { label: "عادي", price: 350000, sortOrder: 1 },
      { label: "كبير", price: 450000, sortOrder: 2 },
    ],
    flavors: ["شوكولا"],
    available: true,
    featured: true,
    sortOrder: 18,
    imageUrl: "/3mYLAu30.webp",
    imageMode: "local",
    badge: "شوكولا",
    tags: ["المنيو", "مشروبات"],
  },
  {
    id: "menu-merry-cream",
    name: "ميري كريم",
    category: MENU_CATEGORY_IDS.menu,
    description: "تركيبة ناعمة وفاخرة بنكهات مختارة بعناية لعشاق التميز.",
    prices: [
      { label: "شوكولا", price: 0, sortOrder: 1 },
      { label: "شوكولا + حليب ميكس", price: 0, sortOrder: 2 },
    ],
    flavors: ["شوكولا", "فانيلا"],
    available: true,
    featured: false,
    sortOrder: 19,
    imageUrl: "/merry cream.webp",
    imageMode: "local",
    badge: "خصوصي",
    tags: ["المنيو", "خاص"],
  },
];

// =====================
// HELPERS
// =====================

export function isAdmin(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase().trim());
}

export function normalizeBranchName(name) {
  return (name || "Unknown").toString().trim();
}

export function normalizeText(value) {
  return (value || "").toString().trim();
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
}

export function normalizePrice(value) {
  const cleaned = String(value ?? "")
    .replace(/[^\d.]/g, "")
    .trim();

  if (!cleaned) return 0;

  const number = Number(cleaned);
  if (Number.isNaN(number) || number < 0) return 0;

  return number;
}

export function normalizeSortOrder(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return 0;
  return number;
}

export function normalizeFlavors(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeImageUrl(value) {
  return normalizeText(value);
}

export function normalizeCategory(value) {
  const category = normalizeText(value).toLowerCase();

  if (Object.values(MENU_CATEGORY_IDS).includes(category)) return category;
  return MENU_CATEGORY_IDS.menu;
}

export function normalizePriceItem(item = {}, index = 0) {
  if (typeof item === "number" || typeof item === "string") {
    return {
      label: index === 0 ? "السعر" : `خيار ${index + 1}`,
      price: normalizePrice(item),
      sortOrder: index + 1,
    };
  }

  return {
    label: normalizeText(item.label) || `خيار ${index + 1}`,
    price: normalizePrice(item.price),
    sortOrder: normalizeSortOrder(item.sortOrder ?? index + 1),
  };
}

export function normalizePrices(value, fallbackPrice = 0) {
  if (Array.isArray(value) && value.length > 0) {
    return value
      .map((item, index) => normalizePriceItem(item, index))
      .filter((item) => item.label || item.price > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return [
    {
      label: "السعر",
      price: normalizePrice(fallbackPrice),
      sortOrder: 1,
    },
  ];
}

export function buildMenuProductPayload(formData = {}) {
  const legacySinglePrice = normalizePrice(formData.price);

  return {
    name: normalizeText(formData.name),
    category: normalizeCategory(formData.category),
    description: normalizeText(formData.description),
    prices: normalizePrices(
      formData.prices || formData.priceOptions || [],
      legacySinglePrice
    ),
    price: legacySinglePrice,
    flavors: normalizeFlavors(formData.flavorsText || formData.flavors || []),
    tags: normalizeTags(formData.tagsText || formData.tags || []),
    badge: normalizeText(formData.badge),
    available: normalizeBoolean(formData.available, true),
    featured: normalizeBoolean(formData.featured, false),
    sortOrder: normalizeSortOrder(formData.sortOrder),
    imageUrl: normalizeImageUrl(formData.imageUrl || ""),
    imageMode: normalizeText(formData.imageMode) || "local",
    imageNote:
      normalizeText(formData.imageNote) ||
      "الصورة الأساسية تُرفع محلياً من المشروع، ويمكن لاحقاً استخدام رابط صورة من النت.",
    updatedAt: serverTimestamp(),
  };
}

export function buildNewMenuProductPayload(formData = {}) {
  return {
    ...buildMenuProductPayload(formData),
    createdAt: serverTimestamp(),
  };
}