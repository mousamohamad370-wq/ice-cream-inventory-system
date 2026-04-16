import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  db,
  MENU_COLLECTIONS,
  DEFAULT_MENU_CATEGORIES,
  DEFAULT_MENU_PRODUCTS,
} from "../firebaseConfig";
import "../style/PublicMenu.css";

const FLAVOR_LIST = [
  { id: "milk", name: "Milk", nameAr: "حليب", imageUrl: "/fleavors/milk.jpg" },
  { id: "vanilla", name: "Vanilla", nameAr: "فانيلا", imageUrl: "/fleavors/vanilla.jpg" },
  { id: "pistachio", name: "Pistachio", nameAr: "فستق", imageUrl: "/fleavors/pistachio.jpg" },
  { id: "almond", name: "Almond", nameAr: "لوز", imageUrl: "/fleavors/almonds.jpg" },
  { id: "caramel", name: "Caramel", nameAr: "كراميل", imageUrl: "/fleavors/caramel.jpg" },
  { id: "oreo", name: "Oreo", nameAr: "أوريو", imageUrl: "/fleavors/oreo.jpg" },
  { id: "cappuccino", name: "Cappuccino", nameAr: "كابتشينو", imageUrl: "/fleavors/coffee.jpg" },
  {
    id: "milk-chocolate",
    name: "Milk Chocolate",
    nameAr: "شوكولا بالحليب",
    imageUrl: "/fleavors/شوكولا بالحليب.jpg",
  },
  {
    id: "dark-chocolate",
    name: "Dark Chocolate",
    nameAr: "شوكولا مر",
    imageUrl: "/fleavors/chocolate.jpg",
  },
  {
    id: "snickers",
    name: "Snickers",
    nameAr: "سنيكرز",
    imageUrl: "/fleavors/سنيكرز.png",
  },
  {
    id: "nutella",
    name: "Nutella",
    nameAr: "نوتيلا",
    imageUrl: "/fleavors/png-clipart-chocolate-spread-nutella.png",
  },
  { id: "lotus", name: "Lotus", nameAr: "لوتس", imageUrl: "/fleavors/لوتس.png" },
  { id: "lemon", name: "Lemon", nameAr: "ليمون", imageUrl: "/fleavors/lemon.jpg" },
  { id: "apricot", name: "Apricot", nameAr: "مشمش", imageUrl: "/fleavors/apricots.jpg" },
  { id: "mango", name: "Mango", nameAr: "منغا", imageUrl: "/fleavors/mango.jpg" },
  { id: "melon", name: "Melon", nameAr: "شمام", imageUrl: "/fleavors/melon.jpg" },
  { id: "roses", name: "Roses", nameAr: "ورد", imageUrl: "/fleavors/rose.jpg" },
  { id: "peach", name: "Peach", nameAr: "دراق", imageUrl: "/fleavors/peach.jpg" },
  { id: "kiwi", name: "Kiwi", nameAr: "كيوي", imageUrl: "/fleavors/kiwi.jpg" },
  { id: "strawberry", name: "Strawberry", nameAr: "فريز", imageUrl: "/fleavors/strawberry.jpg" },
  { id: "blackberry", name: "Blackberry", nameAr: "توت", imageUrl: "/fleavors/blueberry.jpg" },
  {
    id: "bubblegum",
    name: "Bubblegum",
    nameAr: "بابل غم",
    imageUrl: "/fleavors/bubblegum.png",
  },
];

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
  if (typeof item === "number" || typeof item === "string") {
    return {
      label: index === 0 ? "السعر" : `خيار ${index + 1}`,
      price: Number(item || 0),
      sortOrder: index + 1,
    };
  }

  return {
    label: item?.label || `خيار ${index + 1}`,
    price: Number(item?.price || 0),
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
    category: data?.category || "menu",
    description: data?.description || "",
    prices,
    price: Number(data?.price || prices?.[0]?.price || 0),
    flavors: Array.isArray(data?.flavors) ? data.flavors : [],
    tags: Array.isArray(data?.tags) ? data.tags : [],
    badge: data?.badge || "",
    available: data?.available !== false,
    featured: Boolean(data?.featured),
    sortOrder: Number(data?.sortOrder || 0),
    imageUrl: data?.imageUrl || "",
    imageMode: data?.imageMode || "local",
    imageNote: data?.imageNote || "",
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
    category: product.category || "menu",
    description: product.description || "",
    prices,
    price: Number(product?.price || prices?.[0]?.price || 0),
    flavors: Array.isArray(product?.flavors) ? product.flavors : [],
    tags: Array.isArray(product?.tags) ? product.tags : [],
    badge: product.badge || "",
    available: product.available !== false,
    featured: Boolean(product.featured),
    sortOrder: Number(product.sortOrder || 0),
    imageUrl: product.imageUrl || "",
    imageMode: product.imageMode || "local",
    imageNote: product.imageNote || "",
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

function getCategoryName(categoryId, categories) {
  return categories.find((item) => item.id === categoryId)?.name || "قسم";
}

function formatPrice(value) {
  const number = Number(value || 0);
  if (!number) return "يحدد لاحقاً";
  return `${number.toLocaleString()} ل.ل`;
}

function normalizeImagePath(path = "") {
  const value = String(path || "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;

  return `/${value.replace(/^(\.\.\/)+/, "").replace(/^(\.\/)+/, "")}`;
}

export default function PublicMenu() {
  const menuSectionRef = useRef(null);
  const categoryRefs = useRef({});

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setMessage("");

        const categoriesRef = collection(db, MENU_COLLECTIONS.categories);
        const productsRef = collection(db, MENU_COLLECTIONS.products);

        const [categoriesSnap, productsSnap] = await Promise.all([
          getDocs(categoriesRef),
          getDocs(query(productsRef, orderBy("sortOrder", "asc"))),
        ]);

        const loadedCategories = categoriesSnap.empty
          ? DEFAULT_MENU_CATEGORIES.map((item) => ({
              id: item.id,
              name: item.name,
              nameEn: item.nameEn || "",
              description: item.description || "",
              sortOrder: item.sortOrder,
              active: item.active !== false,
            }))
          : categoriesSnap.docs
              .map(normalizeCategoryDoc)
              .filter((item) => item.active !== false)
              .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

        const loadedProducts = productsSnap.docs
          .map(normalizeProductDoc)
          .filter((item) => item.available);

        const mergedProducts = mergeProductsWithDefaults(
          loadedProducts,
          DEFAULT_MENU_PRODUCTS
        )
          .filter((item) => item.available)
          .map((item) => ({
            ...item,
            imageUrl: normalizeImagePath(item.imageUrl),
          }));

        setCategories(loadedCategories);
        setProducts(mergedProducts);
        setActiveCategory(loadedCategories[0]?.id || "");
      } catch (error) {
        console.error("PUBLIC LOAD ERROR:", error);

        const fallbackCategories = DEFAULT_MENU_CATEGORIES.map((item) => ({
          id: item.id,
          name: item.name,
          nameEn: item.nameEn || "",
          description: item.description || "",
          sortOrder: item.sortOrder,
          active: item.active !== false,
        }));

        setCategories(fallbackCategories);
        setProducts(
          DEFAULT_MENU_PRODUCTS.map((item) => ({
            ...normalizeDefaultProduct(item),
            imageUrl: normalizeImagePath(item.imageUrl),
          })).filter((item) => item.available)
        );
        setActiveCategory(fallbackCategories[0]?.id || "");
        setMessage("");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    return [...products]
      .filter((item) => item.available)
      .sort((a, b) => {
        const byOrder = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
        if (byOrder !== 0) return byOrder;
        return (a.name || "").localeCompare(b.name || "", "ar");
      });
  }, [products]);

  const groupedProducts = useMemo(() => {
    const grouped = {};

    visibleProducts.forEach((product) => {
      if (!grouped[product.category]) grouped[product.category] = [];
      grouped[product.category].push(product);
    });

    return categories
      .map((category) => ({
        ...category,
        products: grouped[category.id] || [],
      }))
      .filter((category) => category.products.length > 0);
  }, [visibleProducts, categories]);

  useEffect(() => {
    if (!groupedProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveCategory(visibleEntry.target.id.replace("category-", ""));
        }
      },
      {
        rootMargin: "-18% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.6],
      }
    );

    groupedProducts.forEach((category) => {
      const node = categoryRefs.current[category.id];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [groupedProducts]);

  const handleFlavorClick = (flavor) => {
    setSelectedFlavor((prev) => (prev === flavor.id ? "" : flavor.id));
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);

    const section = categoryRefs.current[categoryId];
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    if (menuSectionRef.current) {
      menuSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="public-menu-page public-menu-page--luxury">
      <div className="public-menu-page__glow public-menu-page__glow--one" />
      <div className="public-menu-page__glow public-menu-page__glow--two" />

      <div className="public-menu-shell">
        <section className="public-menu-hero public-menu-hero--premium">
          <div className="public-menu-hero__ornament" />
          <div className="public-menu-hero__inner">
            <div className="public-menu-hero__brand-row">
              <div className="public-menu-hero__brand-copy">
                <span className="public-menu-kicker brand-red">BOOZA BASHIR</span>
                <h1 className="brand-red">بوظة بشير</h1>
                <div className="public-menu-hero__divider" />
                <p>الطعم الأصيل منذ 1936</p>
                <div className="public-menu-hero__meta">
                  <span>منيو فاخر</span>
                  <span>نكهات مختارة</span>
                  <span>تجربة مميزة</span>
                </div>
              </div>

              <div className="public-menu-hero__brand-mark-shell">
                <div className="public-menu-hero__brand-mark">
                  {!logoError ? (
                    <img
                      src="/logo bachir.jpg"
                      alt="Bachir"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="public-menu-hero__brand-fallback brand-red">ب</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!!groupedProducts.length && (
          <section className="public-menu-controls public-menu-block">
            <div className="public-menu-block__head">
              <div>
                <h2>الأصناف</h2>
                <p>اضغط على القسم للانتقال مباشرة</p>
              </div>
            </div>

            <div className="public-menu-controls__row public-menu-controls__row--top">
              <div className="public-menu-tabs public-menu-tabs--luxury">
                {groupedProducts.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`public-menu-tab ${
                      activeCategory === category.id ? "active" : ""
                    }`}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <span className="public-menu-tab__shine" />
                    <span className="public-menu-tab__label">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {!!FLAVOR_LIST.length && (
          <section className="public-menu-flavors public-menu-block">
            <div className="public-menu-block__head">
              <div>
                <h2>النكهات</h2>
              </div>
            </div>

            <div className="public-menu-flavors__round-list">
              {FLAVOR_LIST.map((flavor) => {
                const active = selectedFlavor === flavor.id;
                const flavorImage = normalizeImagePath(flavor.imageUrl);

                return (
                  <button
                    key={flavor.id}
                    type="button"
                    className={`public-menu-flavor-round public-menu-flavor-round--image ${
                      active ? "active" : ""
                    }`}
                    onClick={() => handleFlavorClick(flavor)}
                  >
                    <div className="public-menu-flavor-round__circle public-menu-flavor-round__circle--image">
                      {flavorImage ? (
                        <img
                          src={flavorImage}
                          alt={flavor.nameAr}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback =
                              e.currentTarget.parentElement?.querySelector(
                                ".public-menu-flavor-fallback"
                              );
                            if (fallback) fallback.style.display = "grid";
                          }}
                        />
                      ) : null}

                      <div
                        className="public-menu-flavor-fallback"
                        style={{ display: flavorImage ? "none" : "grid" }}
                      >
                        {flavor.nameAr.charAt(0)}
                      </div>
                    </div>
                    <span>{flavor.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section
          className="public-menu-sections public-menu-block"
          id="menu-sections"
          ref={menuSectionRef}
        >
          {loading ? (
            <div className="public-menu-empty">جاري التحميل...</div>
          ) : message ? (
            <div className="public-menu-empty">{message}</div>
          ) : groupedProducts.length === 0 ? (
            <div className="public-menu-empty">لا توجد منتجات ظاهرة حالياً</div>
          ) : (
            groupedProducts.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                ref={(node) => {
                  categoryRefs.current[category.id] = node;
                }}
                className="public-menu-category-block"
              >
                <div className="public-menu-category-block__head public-menu-category-block__head--luxury">
                  <div>
                    <span className="public-menu-category-block__eyebrow brand-red">
                      BOOZA BASHIR
                    </span>
                    <h3>{category.name}</h3>
                    <p>{category.description || "تشكيلة مختارة بعناية"}</p>
                  </div>
                  <span className="public-menu-category-block__count">
                    {category.products.length} عناصر
                  </span>
                </div>

                <div className="public-menu-grid public-menu-grid--luxury">
                  {category.products.map((product) => (
                    <article
                      key={product.id}
                      className="public-menu-card public-menu-card--luxury"
                    >
                      <div className="public-menu-card__media public-menu-card__media--luxury">
                        <div className="public-menu-card__media-glow" />

                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            onClick={() =>
                              setLightboxImage({
                                src: product.imageUrl,
                                alt: product.name,
                              })
                            }
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback =
                                e.currentTarget.parentElement?.querySelector(
                                  ".public-menu-card__placeholder"
                                );
                              if (fallback) fallback.style.display = "grid";
                            }}
                          />
                        ) : null}

                        <div
                          className="public-menu-card__placeholder brand-red"
                          style={{ display: product.imageUrl ? "none" : "grid" }}
                        >
                          Booza Bashir
                        </div>

                        {product.badge ? (
                          <span className="public-menu-card__badge">{product.badge}</span>
                        ) : product.featured ? (
                          <span className="public-menu-card__badge">مميز</span>
                        ) : null}
                      </div>

                      <div className="public-menu-card__body">
                        <div className="public-menu-card__top">
                          <div>
                            <h4>{product.name}</h4>
                            <span>{getCategoryName(product.category, categories)}</span>
                          </div>
                        </div>

                        <p className="public-menu-card__description">
                          {product.description}
                        </p>

                        {!!product.prices?.length && (
                          <div className="public-menu-card__prices public-menu-card__prices--menu">
                            {product.prices
                              .slice()
                              .sort(
                                (a, b) =>
                                  Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
                              )
                              .map((priceItem, index) => (
                                <div
                                  key={`${product.id}-price-${index}`}
                                  className="public-menu-card__price-line-item"
                                >
                                  <span className="public-menu-card__price-label">
                                    {priceItem.label}
                                  </span>
                                  <span className="public-menu-card__price-dots" />
                                  <strong className="public-menu-card__price-value">
                                    {formatPrice(priceItem.price)}
                                  </strong>
                                </div>
                              ))}
                          </div>
                        )}

                        {!!product.flavors.length && (
                          <div className="public-menu-card__chips">
                            {product.flavors.map((flavor, index) => (
                              <span key={`${product.id}-${flavor}-${index}`}>
                                {flavor}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </section>
      </div>

      {lightboxImage ? (
        <div className="public-menu-lightbox" onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className="public-menu-lightbox__close"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>

          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}