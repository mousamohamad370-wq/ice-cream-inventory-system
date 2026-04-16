import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  db,
  MENU_COLLECTIONS,
  DEFAULT_MENU_CATEGORIES,
  DEFAULT_MENU_PRODUCTS,
  buildMenuProductPayload,
  buildNewMenuProductPayload,
  MENU_CATEGORY_IDS,
} from "../firebaseConfig";
import "../style/MenuManager.css";

const EMPTY_PRICE_ROW = { label: "", price: "", sortOrder: 1 };

const EMPTY_FORM = {
  id: null,
  name: "",
  category: MENU_CATEGORY_IDS.cups,
  description: "",
  flavorsText: "",
  tagsText: "",
  badge: "",
  available: true,
  featured: false,
  sortOrder: "",
  imageUrl: "",
  imageMode: "local",
  imageNote:
    "الصورة الأساسية تُرفع محلياً من اللابتوب، ويمكن لاحقاً استخدام رابط صورة من النت.",
  prices: [{ ...EMPTY_PRICE_ROW }],
};

function normalizeImagePath(path = "") {
  const value = String(path || "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;

  return `/${value.replace(/^(\.\.\/)+/, "").replace(/^(\.\/)+/, "")}`;
}

function normalizeCategoryDoc(docItem) {
  const data = docItem.data();
  return {
    id: docItem.id,
    name: data?.name || docItem.id,
    nameEn: data?.nameEn || "",
    description: data?.description || "",
    sortOrder: Number(data?.sortOrder || 0),
    active: data?.active !== false,
  };
}

function normalizePriceRow(item, index = 0) {
  return {
    label: item?.label || "",
    price: item?.price ?? "",
    sortOrder: Number(item?.sortOrder || index + 1),
  };
}

function normalizeProductDoc(docItem) {
  const data = docItem.data();
  const prices =
    Array.isArray(data?.prices) && data.prices.length
      ? data.prices.map((item, index) => normalizePriceRow(item, index))
      : [
          {
            label: "السعر",
            price: Number(data?.price || 0),
            sortOrder: 1,
          },
        ];

  return {
    id: docItem.id,
    name: data?.name || "",
    category: data?.category || MENU_CATEGORY_IDS.menu,
    description: data?.description || "",
    prices,
    price: Number(data?.price || prices?.[0]?.price || 0),
    flavors: Array.isArray(data?.flavors) ? data.flavors : [],
    tags: Array.isArray(data?.tags) ? data.tags : [],
    badge: data?.badge || "",
    available: data?.available !== false,
    featured: Boolean(data?.featured),
    sortOrder: Number(data?.sortOrder || 0),
    imageUrl: normalizeImagePath(data?.imageUrl || ""),
    imageMode: data?.imageMode || "local",
    imageNote:
      data?.imageNote ||
      "الصورة الأساسية تُرفع محلياً من اللابتوب، ويمكن لاحقاً استخدام رابط صورة من النت.",
    createdAt: data?.createdAt || null,
    updatedAt: data?.updatedAt || null,
    source: "firestore",
  };
}

function normalizeDefaultProduct(product = {}) {
  const prices =
    Array.isArray(product?.prices) && product.prices.length
      ? product.prices.map((item, index) => normalizePriceRow(item, index))
      : [
          {
            label: "السعر",
            price: Number(product?.price || 0),
            sortOrder: 1,
          },
        ];

  return {
    id: product.id,
    name: product.name || "",
    category: product.category || MENU_CATEGORY_IDS.menu,
    description: product.description || "",
    prices,
    price: Number(product?.price || prices?.[0]?.price || 0),
    flavors: Array.isArray(product?.flavors) ? product.flavors : [],
    tags: Array.isArray(product?.tags) ? product.tags : [],
    badge: product.badge || "",
    available: product.available !== false,
    featured: Boolean(product.featured),
    sortOrder: Number(product.sortOrder || 0),
    imageUrl: normalizeImagePath(product.imageUrl || ""),
    imageMode: product.imageMode || "local",
    imageNote:
      product.imageNote ||
      "الصورة الأساسية تُرفع محلياً من اللابتوب، ويمكن لاحقاً استخدام رابط صورة من النت.",
    createdAt: null,
    updatedAt: null,
    source: "default",
  };
}

function mergeProductsWithDefaults(dbProducts = [], defaultProducts = []) {
  const normalizedDefaults = defaultProducts.map(normalizeDefaultProduct);
  const productMap = new Map();

  normalizedDefaults.forEach((item) => {
    productMap.set(item.id, item);
  });

  dbProducts.forEach((item) => {
    productMap.set(item.id, item);
  });

  return Array.from(productMap.values()).sort((a, b) => {
    const byOrder = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (byOrder !== 0) return byOrder;
    return (a.name || "").localeCompare(b.name || "", "ar");
  });
}

function slugifyFileName(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/أ|إ|آ/g, "a")
    .replace(/ة/g, "h")
    .replace(/ى/g, "a")
    .replace(/ؤ/g, "w")
    .replace(/ئ/g, "y")
    .replace(/خ/g, "kh")
    .replace(/غ/g, "gh")
    .replace(/ش/g, "sh")
    .replace(/ث/g, "th")
    .replace(/ذ/g, "dh")
    .replace(/ظ/g, "z")
    .replace(/ض/g, "d")
    .replace(/ص/g, "s")
    .replace(/ط/g, "t")
    .replace(/ق/g, "q")
    .replace(/ج/g, "j")
    .replace(/ح/g, "h")
    .replace(/ع/g, "a")
    .replace(/ب/g, "b")
    .replace(/ت/g, "t")
    .replace(/س/g, "s")
    .replace(/م/g, "m")
    .replace(/ن/g, "n")
    .replace(/ل/g, "l")
    .replace(/ك/g, "k")
    .replace(/ف/g, "f")
    .replace(/ر/g, "r")
    .replace(/ز/g, "z")
    .replace(/و/g, "w")
    .replace(/ي/g, "y")
    .replace(/ه/g, "h")
    .replace(/د/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function buildSuggestedImagePath(category, name) {
  const fileName = slugifyFileName(name || "item") || "item";
  const folder = category || "menu";
  return `/images/menu/${folder}/${fileName}.png`;
}

function sortProducts(items = []) {
  return [...items].sort((a, b) => {
    const byOrder = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (byOrder !== 0) return byOrder;
    return (a.name || "").localeCompare(b.name || "", "ar");
  });
}

export default function AdminMenu() {
  const formPanelRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [firestoreProductsCount, setFirestoreProductsCount] = useState(0);
  const [defaultProductsCount] = useState(DEFAULT_MENU_PRODUCTS.length);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const publicMenuPath = "/menu";

  const suggestedImagePath = useMemo(() => {
    return buildSuggestedImagePath(form.category, form.name);
  }, [form.category, form.name]);

  const publicMenuUrl = useMemo(() => {
    if (typeof window === "undefined") return publicMenuPath;
    return `${window.location.origin}${publicMenuPath}`;
  }, [publicMenuPath]);

  const qrMenuUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
      publicMenuUrl
    )}`;
  }, [publicMenuUrl]);

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const loadCategories = async () => {
    const categoriesRef = collection(db, MENU_COLLECTIONS.categories);
    const snap = await getDocs(categoriesRef);

    if (snap.empty) {
      return DEFAULT_MENU_CATEGORIES.map((item) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || "",
        description: item.description || "",
        sortOrder: item.sortOrder,
        active: item.active !== false,
      }));
    }

    return snap.docs
      .map(normalizeCategoryDoc)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  };

  const loadProducts = async () => {
    const productsRef = collection(db, MENU_COLLECTIONS.products);
    const qy = query(productsRef, orderBy("sortOrder", "asc"));
    const snap = await getDocs(qy);

    const firestoreProducts = snap.docs.map(normalizeProductDoc);
    setFirestoreProductsCount(firestoreProducts.length);

    return mergeProductsWithDefaults(firestoreProducts, DEFAULT_MENU_PRODUCTS);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [loadedCategories, loadedProducts] = await Promise.all([
        loadCategories(),
        loadProducts(),
      ]);

      setCategories(loadedCategories);
      setProducts(loadedProducts);
    } catch (error) {
      console.error("MENU LOAD ERROR:", error);
      setCategories(
        DEFAULT_MENU_CATEGORIES.map((item) => ({
          id: item.id,
          name: item.name,
          nameEn: item.nameEn || "",
          description: item.description || "",
          sortOrder: item.sortOrder,
          active: item.active !== false,
        }))
      );
      setProducts(DEFAULT_MENU_PRODUCTS.map(normalizeDefaultProduct));
      setFirestoreProductsCount(0);
      setMessage("❌ فشل تحميل بيانات المنيو");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter((item) => item.available).length;
    const hidden = products.filter((item) => !item.available).length;
    const featured = products.filter((item) => item.featured).length;
    return { total, available, hidden, featured };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        const haystack = [
          item.name,
          item.description,
          item.category,
          item.badge,
          ...(item.flavors || []),
          ...(item.tags || []),
          ...(item.prices || []).map((priceRow) => priceRow.label),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category === categoryFilter);
    }

    if (statusFilter === "available") {
      result = result.filter((item) => item.available);
    }

    if (statusFilter === "hidden") {
      result = result.filter((item) => !item.available);
    }

    return sortProducts(result);
  }, [products, search, categoryFilter, statusFilter]);

  const uniqueFlavors = useMemo(() => {
    return Array.from(new Set(filteredProducts.flatMap((item) => item.flavors || []))).sort(
      (a, b) => a.localeCompare(b, "ar")
    );
  }, [filteredProducts]);

  const categoryName = (categoryId) => {
    return categories.find((cat) => cat.id === categoryId)?.name || "غير محدد";
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      prices: [{ ...EMPTY_PRICE_ROW }],
    });
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setSelectedProduct(null);
    setMessage("");
    scrollToForm();
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setForm({
      id: product.id,
      name: product.name || "",
      category: product.category || MENU_CATEGORY_IDS.cups,
      description: product.description || "",
      flavorsText: (product.flavors || []).join(", "),
      tagsText: (product.tags || []).join(", "),
      badge: product.badge || "",
      available: !!product.available,
      featured: !!product.featured,
      sortOrder: product.sortOrder ?? "",
      imageUrl: product.imageUrl || "",
      imageMode: product.imageMode || "local",
      imageNote:
        product.imageNote ||
        "الصورة الأساسية تُرفع محلياً من اللابتوب، ويمكن لاحقاً استخدام رابط صورة من النت.",
      prices:
        Array.isArray(product.prices) && product.prices.length
          ? product.prices.map((item, index) => ({
              label: item.label || "",
              price: item.price ?? "",
              sortOrder: item.sortOrder ?? index + 1,
            }))
          : [{ ...EMPTY_PRICE_ROW }],
    });
    setMessage("");
    scrollToForm();
  };

  const handleDelete = async (productId) => {
    const product = products.find((item) => item.id === productId);

    if (product?.source === "default") {
      setMessage(
        "❌ هذا المنتج موجود حالياً من الكود فقط. استورده أولاً إلى Firestore ثم احذفه."
      );
      return;
    }

    const confirmDelete = window.confirm("هل أنت متأكد من حذف المنتج؟");
    if (!confirmDelete) return;

    try {
      setSaving(true);
      await deleteDoc(doc(db, MENU_COLLECTIONS.products, productId));

      setProducts((prev) => prev.filter((item) => item.id !== productId));

      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
        resetForm();
      }

      await loadAll();
      setMessage("✅ تم حذف المنتج");
    } catch (error) {
      console.error("DELETE PRODUCT ERROR:", error);
      setMessage("❌ فشل حذف المنتج");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      setSaving(true);

      const nextValue = !product.available;

      if (product.source === "default") {
        const payload = {
          id: product.id,
          name: product.name,
          category: product.category,
          description: product.description,
          prices: product.prices,
          price: product.price,
          flavors: product.flavors,
          tags: product.tags,
          badge: product.badge,
          available: nextValue,
          featured: product.featured,
          sortOrder: product.sortOrder,
          imageUrl: normalizeImagePath(product.imageUrl),
          imageMode: product.imageMode,
          imageNote: product.imageNote,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, MENU_COLLECTIONS.products, product.id), payload);

        await loadAll();

        if (selectedProduct?.id === product.id) {
          setSelectedProduct((prev) =>
            prev ? { ...prev, available: nextValue, source: "firestore" } : prev
          );
        }

        setMessage("✅ تم استيراد المنتج وتحديث حالته");
        return;
      }

      await updateDoc(doc(db, MENU_COLLECTIONS.products, product.id), {
        available: nextValue,
        updatedAt: serverTimestamp(),
      });

      await loadAll();

      if (selectedProduct?.id === product.id) {
        setSelectedProduct((prev) => (prev ? { ...prev, available: nextValue } : prev));
      }

      setMessage("✅ تم تحديث حالة المنتج");
    } catch (error) {
      console.error("TOGGLE PRODUCT ERROR:", error);
      setMessage("❌ فشل تحديث حالة المنتج");
    } finally {
      setSaving(false);
    }
  };

  const updatePriceRow = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addPriceRow = () => {
    setForm((prev) => ({
      ...prev,
      prices: [
        ...(prev.prices || []),
        {
          label: "",
          price: "",
          sortOrder: (prev.prices?.length || 0) + 1,
        },
      ],
    }));
  };

  const removePriceRow = (index) => {
    setForm((prev) => {
      const nextPrices = (prev.prices || []).filter((_, itemIndex) => itemIndex !== index);

      return {
        ...prev,
        prices: nextPrices.length ? nextPrices : [{ ...EMPTY_PRICE_ROW }],
      };
    });
  };

  const applySuggestedImagePath = () => {
    setForm((prev) => ({
      ...prev,
      imageMode: "local",
      imageUrl: buildSuggestedImagePath(prev.category, prev.name),
    }));
  };

  const copySuggestedImagePath = async () => {
    try {
      await navigator.clipboard.writeText(suggestedImagePath);
      setMessage("✅ تم نسخ المسار المقترح");
    } catch (error) {
      console.error("COPY SUGGESTED PATH ERROR:", error);
      setMessage("❌ فشل نسخ المسار المقترح");
    }
  };

  const importDefaultProducts = async () => {
    try {
      setSaving(true);
      setMessage("جاري استيراد المنتجات...");

      const results = await Promise.allSettled(
        DEFAULT_MENU_PRODUCTS.map(async (item) => {
          const normalized = normalizeDefaultProduct(item);

          await setDoc(doc(db, MENU_COLLECTIONS.products, normalized.id), {
            id: normalized.id,
            name: normalized.name,
            category: normalized.category,
            description: normalized.description,
            prices: normalized.prices,
            price: normalized.price,
            flavors: normalized.flavors,
            tags: normalized.tags,
            badge: normalized.badge,
            available: normalized.available,
            featured: normalized.featured,
            sortOrder: normalized.sortOrder,
            imageUrl: normalizeImagePath(normalized.imageUrl),
            imageMode: normalized.imageMode,
            imageNote: normalized.imageNote,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          });

          return normalized.id;
        })
      );

      const successIds = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      const failedResults = results.filter((result) => result.status === "rejected");

      await loadAll();

      if (failedResults.length === 0) {
        setMessage(`✅ تم استيراد ${successIds.length} / ${DEFAULT_MENU_PRODUCTS.length} منتج إلى Firestore`);
      } else {
        console.error("FAILED IMPORTS:", failedResults);
        setMessage(
          `⚠️ تم استيراد ${successIds.length} من أصل ${DEFAULT_MENU_PRODUCTS.length}. فشل ${failedResults.length} منتج. افتح Console للتفاصيل.`
        );
      }
    } catch (error) {
      console.error("IMPORT DEFAULT PRODUCTS ERROR:", error);
      setMessage(`❌ فشل استيراد المنتجات: ${error?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const copyMenuLink = async () => {
    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setMessage("✅ تم نسخ رابط المنيو");
    } catch (error) {
      console.error("COPY MENU LINK ERROR:", error);
      setMessage("❌ فشل نسخ رابط المنيو");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessage("❌ اسم المنتج مطلوب");
      return;
    }

    if (!form.description.trim()) {
      setMessage("❌ وصف المنتج مطلوب");
      return;
    }

    const validPrices = (form.prices || []).filter(
      (item) => String(item.label || "").trim() || String(item.price || "").trim()
    );

    if (!validPrices.length) {
      setMessage("❌ أضف سعراً واحداً على الأقل");
      return;
    }

    const hasInvalidPrice = validPrices.some(
      (item) => Number(item.price) < 0 || Number.isNaN(Number(item.price))
    );

    if (hasInvalidPrice) {
      setMessage("❌ يوجد سعر غير صالح");
      return;
    }

    try {
      setSaving(true);

      const preparedForm = {
        ...form,
        imageUrl:
          form.imageMode === "local"
            ? normalizeImagePath(form.imageUrl || buildSuggestedImagePath(form.category, form.name))
            : form.imageUrl,
        prices: validPrices.map((item, index) => ({
          label: item.label,
          price: item.price,
          sortOrder: item.sortOrder || index + 1,
        })),
        price: validPrices[0]?.price || 0,
      };

      if (isEditing && form.id) {
        const payload = buildMenuProductPayload(preparedForm);

        await setDoc(
          doc(db, MENU_COLLECTIONS.products, form.id),
          {
            ...payload,
            imageUrl: normalizeImagePath(payload.imageUrl),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await loadAll();

        const updatedProduct = normalizeProductDoc({
          id: form.id,
          data: () => ({
            ...payload,
            imageUrl: normalizeImagePath(payload.imageUrl),
            flavors: payload.flavors,
            prices: payload.prices,
            tags: payload.tags,
          }),
        });

        setSelectedProduct({ ...updatedProduct, source: "firestore" });
        setMessage("✅ تم حفظ التعديلات");
      } else {
        const payload = buildNewMenuProductPayload(preparedForm);
        const normalizedPayload = {
          ...payload,
          imageUrl: normalizeImagePath(payload.imageUrl),
        };

        const newRef = await addDoc(collection(db, MENU_COLLECTIONS.products), normalizedPayload);

        await loadAll();

        const createdProduct = normalizeProductDoc({
          id: newRef.id,
          data: () => ({
            ...normalizedPayload,
            flavors: normalizedPayload.flavors,
            prices: normalizedPayload.prices,
            tags: normalizedPayload.tags,
          }),
        });

        setSelectedProduct({ ...createdProduct, source: "firestore" });
        setMessage("✅ تم إضافة المنتج");
      }

      resetForm();
    } catch (error) {
      console.error("SAVE PRODUCT ERROR:", error);
      setMessage("❌ فشل حفظ المنتج");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="menu-manager-page">
      <div className="menu-manager-shell">
        <header className="menu-manager-hero">
          <div>
            <span className="menu-badge">Booza Bashir</span>
            <h1>إدارة منيو الزبون</h1>
            <p>
              تعديل كامل للأسعار، الوصف، الأحجام، النكهات، الترتيب، الظهور،
              والصور المحلية أو روابط الصور من الإنترنت.
            </p>
          </div>

          <div className="menu-hero-actions">
            <Link className="btn ghost" to="/admin/dashboard">
              رجوع للوحة المدير
            </Link>

            <a
              href={publicMenuPath}
              target="_blank"
              rel="noreferrer"
              className="btn ghost"
            >
              معاينة منيو الزبون
            </a>

            <button
              className="btn ghost"
              onClick={importDefaultProducts}
              type="button"
              disabled={saving}
            >
              استيراد المنتجات الحالية
            </button>

            <button
              className="btn"
              onClick={handleCreateNew}
              type="button"
            >
              إضافة منتج
            </button>
          </div>
        </header>

        {message ? <div className="alert">{message}</div> : null}

        <section className="menu-stats-grid">
          <div className="menu-stat-card">
            <span>إجمالي المعروض</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="menu-stat-card">
            <span>داخل Firestore فعلياً</span>
            <strong>{firestoreProductsCount}</strong>
          </div>
          <div className="menu-stat-card">
            <span>الافتراضي بالكود</span>
            <strong>{defaultProductsCount}</strong>
          </div>
          <div className="menu-stat-card">
            <span>المتوفر</span>
            <strong>{stats.available}</strong>
          </div>
        </section>

        <section className="menu-top-grid">
          <div className="menu-panel">
            <div className="menu-panel-head">
              <h2>التحكم السريع</h2>
            </div>

            <div className="menu-filters-grid">
              <div className="menu-field">
                <label>بحث</label>
                <input
                  type="text"
                  placeholder="ابحث باسم المنتج أو النكهة أو الوسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="menu-field">
                <label>القسم</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">كل الأقسام</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="menu-field">
                <label>الحالة</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">الكل</option>
                  <option value="available">المتوفر فقط</option>
                  <option value="hidden">المخفي فقط</option>
                </select>
              </div>
            </div>

            <div className="menu-flavors-showcase">
              <h3>النكهات الظاهرة حالياً</h3>
              <div className="menu-flavors-list">
                {uniqueFlavors.map((flavor, index) => (
                  <span key={`${flavor}-${index}`} className="flavor-chip">
                    {flavor}
                  </span>
                ))}
                {!uniqueFlavors.length && (
                  <span className="empty-note">لا توجد نكهات حالياً</span>
                )}
              </div>
            </div>

            <div className="menu-flavors-showcase">
              <h3>الأقسام الأساسية</h3>
              <div className="menu-flavors-list">
                {categories.map((cat) => (
                  <span key={cat.id} className="flavor-chip">
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="menu-panel">
            <div className="menu-panel-head">
              <h2>QR Menu</h2>
            </div>

            <div className="menu-qr-box">
              <div className="menu-qr-preview">
                <img src={qrMenuUrl} alt="QR Menu" />
              </div>

              <div className="menu-field">
                <label>رابط المنيو</label>
                <input type="text" value={publicMenuUrl} readOnly />
              </div>

              <div className="menu-form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={copyMenuLink}
                >
                  نسخ رابط المنيو
                </button>

                <a
                  href={qrMenuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn ghost"
                >
                  فتح QR
                </a>

                <a
                  href={qrMenuUrl}
                  download="booza-bashir-menu-qr.png"
                  className="btn ghost"
                >
                  تنزيل QR
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="menu-top-grid">
          <div className="menu-panel" ref={formPanelRef}>
            <div className="menu-panel-head">
              <h2>{isEditing ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
            </div>

            <form className="menu-form" onSubmit={handleSubmit}>
              <div className="menu-field">
                <label>اسم المنتج</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: كباية كبيرة"
                />
              </div>

              <div className="menu-form-row">
                <div className="menu-field">
                  <label>القسم</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="menu-field">
                  <label>شارة قصيرة</label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="مثال: الأكثر طلباً"
                  />
                </div>
              </div>

              <div className="menu-field">
                <label>الوصف</label>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="وصف واضح وفخم للمنتج..."
                />
              </div>

              <div className="menu-field">
                <label>النكهات (افصل بفاصلة)</label>
                <input
                  type="text"
                  value={form.flavorsText}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, flavorsText: e.target.value }))
                  }
                  placeholder="فستق, قشطة, شوكولا"
                />
              </div>

              <div className="menu-field">
                <label>وسوم إضافية (افصل بفاصلة)</label>
                <input
                  type="text"
                  value={form.tagsText}
                  onChange={(e) => setForm((prev) => ({ ...prev, tagsText: e.target.value }))}
                  placeholder="عائلي, فاخر, مشكل"
                />
              </div>

              <div className="menu-field">
                <label>الأسعار والأحجام</label>

                <div className="menu-prices-stack">
                  {(form.prices || []).map((priceRow, index) => (
                    <div className="menu-form-row" key={`price-row-${index}`}>
                      <div className="menu-field">
                        <label>اسم الخيار</label>
                        <input
                          type="text"
                          value={priceRow.label}
                          onChange={(e) => updatePriceRow(index, "label", e.target.value)}
                          placeholder="مثال: وسط / كبير / 600 غرام"
                        />
                      </div>

                      <div className="menu-field">
                        <label>السعر</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={priceRow.price}
                          onChange={(e) => updatePriceRow(index, "price", e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="menu-field">
                        <label>الترتيب</label>
                        <input
                          type="number"
                          min="1"
                          value={priceRow.sortOrder}
                          onChange={(e) => updatePriceRow(index, "sortOrder", e.target.value)}
                          placeholder="1"
                        />
                      </div>

                      <div className="menu-field">
                        <label>إجراء</label>
                        <button
                          type="button"
                          className="btn menu-admin-btn-danger"
                          onClick={() => removePriceRow(index)}
                          disabled={(form.prices || []).length === 1}
                        >
                          حذف الخيار
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="menu-form-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={addPriceRow}
                  >
                    إضافة سعر جديد
                  </button>
                </div>
              </div>

              <div className="menu-form-row">
                <div className="menu-field">
                  <label>ترتيب الظهور</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    placeholder="1"
                  />
                </div>

                <div className="menu-field">
                  <label>نوع الصورة</label>
                  <select
                    value={form.imageMode}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageMode: e.target.value }))}
                  >
                    <option value="local">من اللابتوب / داخل المشروع</option>
                    <option value="url">رابط صورة من النت</option>
                  </select>
                </div>
              </div>

              <div className="menu-form-row">
                <div className="menu-field">
                  <label>مسار الصورة أو رابطها</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder={
                      form.imageMode === "local"
                        ? suggestedImagePath
                        : "https://example.com/image.jpg"
                    }
                  />
                </div>

                <div className="menu-field">
                  <label>ملاحظة الصورة</label>
                  <input
                    type="text"
                    value={form.imageNote}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageNote: e.target.value }))}
                    placeholder="ملاحظة داخلية عن الصورة"
                  />
                </div>
              </div>

              {form.imageMode === "local" && (
                <div className="menu-field">
                  <label>مسار مقترح تلقائياً</label>
                  <div className="menu-suggested-path-row">
                    <input type="text" value={suggestedImagePath} readOnly />
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={applySuggestedImagePath}
                    >
                      استخدام المسار المقترح
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={copySuggestedImagePath}
                    >
                      نسخ المسار
                    </button>
                  </div>
                </div>
              )}

              <div className="menu-switches">
                <label className="menu-switch">
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, available: e.target.checked }))
                    }
                  />
                  <span>المنتج متوفر</span>
                </label>

                <label className="menu-switch">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, featured: e.target.checked }))
                    }
                  />
                  <span>منتج مميز</span>
                </label>
              </div>

              <div className="menu-form-actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={saving}
                >
                  {saving
                    ? "جاري الحفظ..."
                    : isEditing
                    ? "حفظ التعديلات"
                    : "إضافة المنتج"}
                </button>

                <button
                  type="button"
                  className="btn ghost"
                  onClick={resetForm}
                  disabled={saving}
                >
                  تفريغ
                </button>
              </div>
            </form>
          </div>

          <div className="menu-panel details-panel">
            <div className="menu-panel-head">
              <h2>تفاصيل المنتج</h2>
            </div>

            {selectedProduct ? (
              <div className="details-box">
                <div className="details-preview">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "220px",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    "واجهة صورة المنتج"
                  )}
                </div>

                <h3>{selectedProduct.name}</h3>
                <p className="details-category">{categoryName(selectedProduct.category)}</p>
                <p className="details-description">{selectedProduct.description}</p>

                <div className="details-section">
                  <span>الأسعار</span>
                  <div className="menu-flavors-list">
                    {(selectedProduct.prices || []).map((item, index) => (
                      <span
                        key={`${selectedProduct.id}-details-price-${index}`}
                        className="flavor-chip"
                      >
                        {item.label}: {Number(item.price || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <span>النكهات</span>
                  <div className="menu-flavors-list">
                    {(selectedProduct.flavors || []).map((flavor, index) => (
                      <span
                        key={`${selectedProduct.id}-${flavor}-${index}`}
                        className="flavor-chip"
                      >
                        {flavor}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <span>الوسوم</span>
                  <div className="menu-flavors-list">
                    {(selectedProduct.tags || []).map((tag, index) => (
                      <span
                        key={`${selectedProduct.id}-${tag}-${index}`}
                        className="flavor-chip"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <span>الحالة</span>
                  <strong>{selectedProduct.available ? "متوفر" : "مخفي"}</strong>
                </div>

                <div className="details-section">
                  <span>الظهور المميز</span>
                  <strong>{selectedProduct.featured ? "نعم" : "لا"}</strong>
                </div>

                <div className="details-section">
                  <span>شارة البطاقة</span>
                  <strong>{selectedProduct.badge || "—"}</strong>
                </div>

                <div className="details-section">
                  <span>المصدر</span>
                  <strong>
                    {selectedProduct.source === "default"
                      ? "من الكود - استورده ليصير قابل للإدارة الكاملة"
                      : "Firestore"}
                  </strong>
                </div>

                <div className="details-section">
                  <span>الصورة</span>
                  <strong>{selectedProduct.imageMode === "url" ? "رابط نت" : "محلية"}</strong>
                </div>

                <div className="details-section">
                  <span>مسار / رابط الصورة</span>
                  <strong>{selectedProduct.imageUrl || "غير محدد"}</strong>
                </div>

                <div className="details-section">
                  <span>ملاحظة الصورة</span>
                  <strong>{selectedProduct.imageNote}</strong>
                </div>
              </div>
            ) : (
              <div className="empty-details-state">اختر منتجاً لعرض التفاصيل الكاملة هنا</div>
            )}
          </div>
        </section>

        <section className="menu-panel">
          <div className="menu-panel-head">
            <h2>المنتجات</h2>
            <span>{filteredProducts.length} عنصر</span>
          </div>

          {loading ? (
            <div className="empty-products-state">جاري تحميل المنتجات...</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <div className="product-card" key={product.id}>
                  <div className="product-card-image">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback =
                            e.currentTarget.parentElement?.querySelector(
                              ".product-image-placeholder"
                            );
                          if (fallback) fallback.style.display = "grid";
                        }}
                      />
                    ) : null}

                    <div
                      className="product-image-placeholder"
                      style={{ display: product.imageUrl ? "none" : "grid" }}
                    >
                      Booza Bashir
                    </div>

                    <div className="product-badges">
                      <span
                        className={
                          product.available
                            ? "status-badge"
                            : "status-badge status-off"
                        }
                      >
                        {product.available ? "متوفر" : "مخفي"}
                      </span>

                      {product.featured && <span className="featured-badge">مميز</span>}
                      {product.badge ? <span className="featured-badge">{product.badge}</span> : null}
                      {product.source === "default" ? (
                        <span className="featured-badge">من الكود</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="product-card-body">
                    <div className="product-card-top">
                      <div>
                        <h3>{product.name}</h3>
                        <p>{categoryName(product.category)}</p>
                      </div>
                      <strong>
                        {(product.prices || []).length > 1
                          ? `${Number(product.prices?.[0]?.price || 0).toLocaleString()}+`
                          : Number(
                              product.prices?.[0]?.price || product.price || 0
                            ).toLocaleString()}
                      </strong>
                    </div>

                    <p className="product-description">{product.description}</p>

                    <div className="product-flavors">
                      {(product.flavors || []).map((flavor, index) => (
                        <span
                          key={`${product.id}-${flavor}-${index}`}
                          className="flavor-chip"
                        >
                          {flavor}
                        </span>
                      ))}
                    </div>

                    {!!product.prices?.length && (
                      <div className="product-flavors">
                        {product.prices.map((priceRow, index) => (
                          <span key={`${product.id}-price-${index}`} className="flavor-chip">
                            {priceRow.label}: {Number(priceRow.price || 0).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="product-actions">
                      <button
                        className="btn ghost menu-admin-small-btn"
                        onClick={() => setSelectedProduct(product)}
                        type="button"
                      >
                        التفاصيل
                      </button>

                      <button
                        className="btn menu-admin-small-btn"
                        onClick={() => handleEdit(product)}
                        type="button"
                      >
                        تعديل
                      </button>

                      <button
                        className="btn ghost menu-admin-small-btn"
                        onClick={() => handleToggleAvailability(product)}
                        type="button"
                      >
                        {product.available ? "إخفاء" : "إظهار"}
                      </button>

                      <button
                        className="btn menu-admin-btn-danger menu-admin-small-btn"
                        onClick={() => handleDelete(product.id)}
                        type="button"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!filteredProducts.length && (
                <div className="empty-products-state">لا توجد منتجات مطابقة حالياً</div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}