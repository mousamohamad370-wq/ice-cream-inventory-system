import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/MenuManager.css";

const INITIAL_CATEGORIES = [
  { id: "classic", name: "بوظة عربية" },
  { id: "cups", name: "أكواب" },
  { id: "special", name: "نكهات مميزة" },
  { id: "family", name: "عبوات عائلية" },
  { id: "extras", name: "إضافات" },
];

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "بوظة قشطة",
    category: "classic",
    price: 18,
    description: "بوظة عربية بالقشطة بقوام غني وطعم أصيل.",
    flavors: ["قشطة", "حليب"],
    available: true,
    featured: true,
    sortOrder: 1,
    imageNote: "الصورة تُرفع لاحقاً من المدير",
  },
  {
    id: 2,
    name: "بوظة فستق",
    category: "classic",
    price: 22,
    description: "بوظة عربية بالفستق الحلبي ولمسة فاخرة.",
    flavors: ["فستق", "قشطة"],
    available: true,
    featured: true,
    sortOrder: 2,
    imageNote: "الصورة تُرفع لاحقاً من المدير",
  },
  {
    id: 3,
    name: "كوب مانجو",
    category: "cups",
    price: 16,
    description: "كوب مانجو منعش بطابع صيفي واضح.",
    flavors: ["مانجو"],
    available: true,
    featured: false,
    sortOrder: 3,
    imageNote: "الصورة تُرفع لاحقاً من المدير",
  },
];

const EMPTY_FORM = {
  id: null,
  name: "",
  category: "classic",
  price: "",
  description: "",
  flavorsText: "",
  available: true,
  featured: false,
  sortOrder: "",
  imageNote: "الصورة تُرفع لاحقاً من المدير",
};

function DashboardNavLinks({ onPreviewCustomerMenu, onCreateNew, navigate }) {
  return (
    <div className="menu-admin-nav-links">
      <button
        type="button"
        className="btn"
        onClick={onCreateNew}
      >
        إضافة منتج
      </button>

      <button
        type="button"
        className="btn ghost"
        onClick={onPreviewCustomerMenu}
      >
        معاينة منيو الزبون
      </button>

      <button
        type="button"
        className="btn ghost"
        onClick={() => navigate("/admin/dashboard")}
      >
        رجوع للوحة المدير
      </button>
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="menu-admin-summary-pill">
      <span className="menu-admin-summary-pill-label">{label}</span>
      <strong className="menu-admin-summary-pill-value">{value}</strong>
    </div>
  );
}

function StatCard({ label, value, hint, variant = "soft" }) {
  return (
    <div className={`menu-admin-stat-card menu-admin-stat-card--${variant}`}>
      <div className="menu-admin-stat-card-label">{label}</div>
      <div className="menu-admin-stat-card-value">{value}</div>
      <div className="menu-admin-stat-card-hint">{hint}</div>
    </div>
  );
}

function MobileMetric({ label, value }) {
  return (
    <div className="menu-admin-mobile-metric">
      <span className="menu-admin-mobile-metric-label">{label}</span>
      <strong className="menu-admin-mobile-metric-value">{value ?? "-"}</strong>
    </div>
  );
}

export default function MenuManager() {
  const navigate = useNavigate();

  const [categories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  const handlePreviewCustomerMenu = () => {
    const previewUrl = "/menu";

    try {
      const openedWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === "undefined") {
        window.location.href = previewUrl;
      }
    } catch {
      window.location.href = previewUrl;
    }
  };

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
        const haystack = [item.name, item.description, item.category, ...(item.flavors || [])]
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

    result.sort((a, b) => {
      const aOrder = Number(a.sortOrder || 0);
      const bOrder = Number(b.sortOrder || 0);
      return aOrder - bOrder;
    });

    return result;
  }, [products, search, categoryFilter, statusFilter]);

  const visibleFlavors = useMemo(() => {
    return Array.from(new Set(filteredProducts.flatMap((item) => item.flavors || [])));
  }, [filteredProducts]);

  const categoryName = (categoryId) => {
    return categories.find((cat) => cat.id === categoryId)?.name || "غير محدد";
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setSelectedProduct(null);
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setForm({
      id: product.id,
      name: product.name || "",
      category: product.category || "classic",
      price: product.price ?? "",
      description: product.description || "",
      flavorsText: (product.flavors || []).join(", "),
      available: !!product.available,
      featured: !!product.featured,
      sortOrder: product.sortOrder ?? "",
      imageNote: product.imageNote || "الصورة تُرفع لاحقاً من المدير",
    });
  };

  const handleDelete = (productId) => {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف المنتج؟");
    if (!confirmDelete) return;

    setProducts((prev) => prev.filter((item) => item.id !== productId));

    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
      resetForm();
    }
  };

  const handleToggleAvailability = (productId) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, available: !item.available } : item
      )
    );

    if (selectedProduct?.id === productId) {
      setSelectedProduct((prev) =>
        prev ? { ...prev, available: !prev.available } : prev
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanName = form.name.trim();
    const cleanDescription = form.description.trim();
    const numericPrice = Number(form.price);
    const numericSortOrder = Number(form.sortOrder || 0);

    if (!cleanName) {
      alert("اسم المنتج مطلوب");
      return;
    }

    if (!cleanDescription) {
      alert("وصف المنتج مطلوب");
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert("السعر غير صالح");
      return;
    }

    const productPayload = {
      id: form.id ?? Date.now(),
      name: cleanName,
      category: form.category,
      price: numericPrice,
      description: cleanDescription,
      flavors: form.flavorsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      available: form.available,
      featured: form.featured,
      sortOrder: numericSortOrder,
      imageNote: "الصورة تُرفع لاحقاً من المدير",
    };

    if (isEditing) {
      setProducts((prev) =>
        prev.map((item) => (item.id === productPayload.id ? productPayload : item))
      );
      setSelectedProduct(productPayload);
    } else {
      setProducts((prev) => [...prev, productPayload]);
      setSelectedProduct(productPayload);
    }

    resetForm();
  };

  return (
    <div className="page menu-admin-page" dir="rtl">
      <div className="card wide menu-admin-card">
        <div className="menu-admin-header">
          <div>
            <span className="menu-admin-badge">Booza Bashir</span>
            <h2 className="title">إدارة منيو الزبون</h2>
            <p className="muted menu-admin-subtitle">
              تعديل كامل للأسعار، الوصف، الأحجام، النكهات، الترتيب، الظهور، والصور المحلية
              أو روابط الصور من الإنترنت.
            </p>
          </div>

          <DashboardNavLinks
            onPreviewCustomerMenu={handlePreviewCustomerMenu}
            onCreateNew={handleCreateNew}
            navigate={navigate}
          />
        </div>

        <div className="form">
          <div className="menu-admin-kpi-grid">
            <StatCard
              label="إجمالي المعروض"
              value={stats.total}
              hint="كل المنتجات داخل النظام"
              variant="highlight"
            />
            <StatCard
              label="داخل Firestore فعلياً"
              value={stats.total}
              hint="جاهز للربط لاحقاً"
              variant="soft"
            />
            <StatCard
              label="الافتراضي بالكود"
              value={stats.total}
              hint="الحالة الحالية"
              variant="soft"
            />
            <StatCard
              label="المتوفر"
              value={stats.available}
              hint={`${stats.hidden} مخفي حالياً`}
              variant="success"
            />
          </div>

          <div className="section">
            <h3 className="section-title">الملخص</h3>
            <div className="menu-admin-summary-row">
              <SummaryPill label="إجمالي المنتجات" value={stats.total} />
              <SummaryPill label="المتوفر" value={stats.available} />
              <SummaryPill label="المخفي" value={stats.hidden} />
              <SummaryPill label="المميز" value={stats.featured} />
              <SummaryPill label="الأقسام" value={categories.length} />
              <SummaryPill label="المعروض حالياً" value={filteredProducts.length} />
            </div>
          </div>

          <div className="menu-admin-top-grid">
            <div className="section">
              <div className="menu-admin-level-header">
                <div>
                  <h3 className="section-title">التحكم السريع</h3>
                </div>
              </div>

              <div className="menu-admin-toolbar-shell">
                <div className="menu-admin-filters-grid">
                  <div>
                    <label className="label">بحث</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="ابحث باسم المنتج أو النكهة أو الوصف"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">القسم</label>
                    <select
                      className="input"
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

                  <div>
                    <label className="label">الحالة</label>
                    <select
                      className="input"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">الكل</option>
                      <option value="available">المتوفر فقط</option>
                      <option value="hidden">المخفي فقط</option>
                    </select>
                  </div>
                </div>

                <div className="menu-admin-flavors-showcase">
                  <h4>النكهات الظاهرة حالياً</h4>
                  <div className="menu-admin-flavors-list">
                    {visibleFlavors.map((flavor, index) => (
                      <span key={`${flavor}-${index}`} className="menu-admin-chip">
                        {flavor}
                      </span>
                    ))}

                    {visibleFlavors.length === 0 ? (
                      <span className="menu-admin-empty-note">
                        لا توجد نكهات ضمن الفلاتر الحالية
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="menu-admin-flavors-showcase">
                  <h4>الأقسام الأساسية</h4>
                  <div className="menu-admin-flavors-list">
                    {categories.map((cat) => (
                      <span key={cat.id} className="menu-admin-chip">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="menu-admin-level-header">
                <div>
                  <h3 className="section-title">
                    {isEditing ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </h3>
                </div>
              </div>

              <form className="menu-admin-form" onSubmit={handleSubmit}>
                <div className="menu-admin-form-grid">
                  <div>
                    <label className="label">اسم المنتج</label>
                    <input
                      className="input"
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="مثال: بوظة فستق"
                    />
                  </div>

                  <div>
                    <label className="label">القسم</label>
                    <select
                      className="input"
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">السعر</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="label">ترتيب الظهور</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                      }
                      placeholder="1"
                    />
                  </div>

                  <div className="menu-admin-form-span-2">
                    <label className="label">النكهات (افصل بفاصلة)</label>
                    <input
                      className="input"
                      type="text"
                      value={form.flavorsText}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, flavorsText: e.target.value }))
                      }
                      placeholder="فستق, قشطة, مانجو"
                    />
                  </div>

                  <div className="menu-admin-form-span-2">
                    <label className="label">الوصف</label>
                    <textarea
                      className="input menu-admin-textarea"
                      rows="4"
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="وصف واضح وفخم للمنتج..."
                    />
                  </div>

                  <div className="menu-admin-form-span-2">
                    <label className="label">الصور</label>
                    <input
                      className="input"
                      type="text"
                      value="سيتم رفع الصور من اللابتوب لاحقاً"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="menu-admin-switches">
                  <label className="menu-admin-switch-card">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, available: e.target.checked }))
                      }
                    />
                    <span>المنتج متوفر</span>
                  </label>

                  <label className="menu-admin-switch-card">
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

                <div className="menu-admin-form-actions">
                  <button type="submit" className="btn">
                    {isEditing ? "حفظ التعديلات" : "إضافة المنتج"}
                  </button>

                  <button
                    type="button"
                    className="btn ghost"
                    onClick={resetForm}
                  >
                    تفريغ
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="menu-admin-content-grid">
            <div className="section">
              <div className="menu-admin-level-header">
                <div>
                  <h3 className="section-title">المنتجات</h3>
                  <p className="muted menu-admin-section-subtitle">
                    العناصر مرتبة حسب ترتيب الظهور والحالة الحالية
                  </p>
                </div>
                <span className="menu-admin-badge-soft">{filteredProducts.length} عنصر</span>
              </div>

              <div className="menu-admin-products-grid">
                {filteredProducts.map((product) => (
                  <div
                    className={`menu-admin-product-card ${
                      product.available
                        ? "menu-admin-product-card--success"
                        : "menu-admin-product-card--warning"
                    }`}
                    key={product.id}
                  >
                    <div className="menu-admin-product-head">
                      <div>
                        <h3 className="menu-admin-product-title">{product.name}</h3>
                        <div className="menu-admin-product-meta">
                          {categoryName(product.category)}
                        </div>
                      </div>

                      <div className="menu-admin-price-badge">
                        {Number(product.price).toFixed(2)}
                      </div>
                    </div>

                    <div className="menu-admin-product-preview">
                      <div className="menu-admin-product-image-placeholder">
                        Booza Bashir
                      </div>
                    </div>

                    <div className="menu-admin-product-badges">
                      <span
                        className={`menu-admin-badge-pill ${
                          product.available
                            ? "menu-admin-badge-pill--success"
                            : "menu-admin-badge-pill--warning"
                        }`}
                      >
                        {product.available ? "متوفر" : "مخفي"}
                      </span>

                      {product.featured ? (
                        <span className="menu-admin-badge-pill menu-admin-badge-pill--highlight">
                          مميز
                        </span>
                      ) : null}
                    </div>

                    <p className="menu-admin-product-description">{product.description}</p>

                    <div className="menu-admin-flavors-list">
                      {(product.flavors || []).map((flavor, index) => (
                        <span key={`${product.id}-${flavor}-${index}`} className="menu-admin-chip">
                          {flavor}
                        </span>
                      ))}
                    </div>

                    <div className="menu-admin-detail-grid">
                      <MobileMetric label="الترتيب" value={product.sortOrder || 0} />
                      <MobileMetric
                        label="الحالة"
                        value={product.available ? "متوفر" : "مخفي"}
                      />
                      <MobileMetric
                        label="مميز"
                        value={product.featured ? "نعم" : "لا"}
                      />
                    </div>

                    <div className="menu-admin-card-actions">
                      <button
                        type="button"
                        className="btn ghost menu-admin-small-btn"
                        onClick={() => setSelectedProduct(product)}
                      >
                        التفاصيل
                      </button>

                      <button
                        type="button"
                        className="btn menu-admin-small-btn"
                        onClick={() => handleEdit(product)}
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        className="btn ghost menu-admin-small-btn"
                        onClick={() => handleToggleAvailability(product.id)}
                      >
                        {product.available ? "إخفاء" : "إظهار"}
                      </button>

                      <button
                        type="button"
                        className="btn menu-admin-btn-danger menu-admin-small-btn"
                        onClick={() => handleDelete(product.id)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 ? (
                  <div className="menu-admin-empty-state">
                    لا توجد منتجات مطابقة حالياً
                  </div>
                ) : null}
              </div>
            </div>

            <div className="section">
              <div className="menu-admin-level-header">
                <div>
                  <h3 className="section-title">تفاصيل المنتج</h3>
                </div>
              </div>

              {selectedProduct ? (
                <div className="menu-admin-details-card">
                  <div className="menu-admin-details-preview">واجهة صورة المنتج</div>

                  <h3 className="menu-admin-product-title">{selectedProduct.name}</h3>
                  <div className="menu-admin-product-meta">
                    {categoryName(selectedProduct.category)}
                  </div>

                  <div className="menu-admin-details-price">
                    {Number(selectedProduct.price).toFixed(2)}
                  </div>

                  <div className="menu-admin-flow-strip">
                    <span>الترتيب: {selectedProduct.sortOrder || 0}</span>
                    <span>الحالة: {selectedProduct.available ? "متوفر" : "مخفي"}</span>
                    <span>مميز: {selectedProduct.featured ? "نعم" : "لا"}</span>
                  </div>

                  <div className="section menu-admin-inner-section">
                    <h4 className="section-title">الوصف</h4>
                    <div className="menu-admin-note-card">{selectedProduct.description}</div>
                  </div>

                  <div className="section menu-admin-inner-section">
                    <h4 className="section-title">النكهات</h4>
                    <div className="menu-admin-flavors-list">
                      {(selectedProduct.flavors || []).map((flavor, index) => (
                        <span
                          key={`${selectedProduct.id}-${flavor}-${index}`}
                          className="menu-admin-chip"
                        >
                          {flavor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="menu-admin-detail-grid">
                    <div className="menu-admin-mini-card">
                      <strong>القسم</strong>
                      <span>{categoryName(selectedProduct.category)}</span>
                    </div>

                    <div className="menu-admin-mini-card">
                      <strong>الحالة</strong>
                      <span>{selectedProduct.available ? "متوفر" : "مخفي"}</span>
                    </div>

                    <div className="menu-admin-mini-card">
                      <strong>الظهور المميز</strong>
                      <span>{selectedProduct.featured ? "نعم" : "لا"}</span>
                    </div>

                    <div className="menu-admin-mini-card">
                      <strong>ملاحظة الصورة</strong>
                      <span>{selectedProduct.imageNote}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="menu-admin-empty-state">
                  اختر منتجاً لعرض التفاصيل الكاملة هنا
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}