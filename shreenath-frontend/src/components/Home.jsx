import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/components/home.css";

import {
  FaShoppingCart,
  FaHeart,
  FaRegHeart,
  FaArrowRight,
  FaStar,
  FaFire,
  FaChevronLeft,
  FaChevronRight,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaShieldAlt,
  FaTruck,
  FaTools,
  FaFilter,
  FaBicycle,
  FaCogs,
  FaGift,
  FaRocket,
} from "react-icons/fa";

import hero1 from "../assets/images/hero1.webp";
import hero2 from "../assets/images/hero2.webp";
import hero3 from "../assets/images/hero3.webp";
import hero4 from "../assets/images/hero4.jpeg";
import ladiesCycle from "../assets/images/ladies.webp";
import normalCycle from "../assets/images/normal.webp";
import rangerCycle from "../assets/images/ranger.webp";
import accesories from "../assets/images/accesories.png";
import tools from "../assets/images/tools.png";
import newArrivals from "../assets/images/new_arrivals.png";
import part from "../assets/images/parts.png";
import { getStoredUser } from "../utils/auth";

const HERO_SLIDES = [
  {
    image: hero1,
    badge: "🏆 Best Seller 2024",
    headline: "Ride Your Passion",
    sub: "Premium cycles for every journey — mountain trails to city streets.",
    cta: "Shop Now",
    ctaLink: "#products",
    accent: "linear-gradient(135deg, rgba(30,58,138,0.72) 0%, rgba(124,58,237,0.55) 100%)",
  },
  {
    image: hero2,
    badge: "🆕 New Arrivals",
    headline: "Built for the Bold",
    sub: "Explore our latest collection of high-performance bikes and accessories.",
    cta: "View New Stock",
    ctaLink: "#products",
    accent: "linear-gradient(135deg, rgba(5,46,22,0.72) 0%, rgba(6,95,70,0.55) 100%)",
  },
  {
    image: hero3,
    badge: "🎯 Expert Picks",
    headline: "Powered by Passion",
    sub: "Curated by cycling enthusiasts, designed for performance and durability.",
    cta: "Explore Picks",
    ctaLink: "#products",
    accent: "linear-gradient(135deg, rgba(69,26,3,0.72) 0%, rgba(154,52,18,0.55) 100%)",
  },
  {
    image: hero4,
    badge: "🔧 Service & Repair",
    headline: "We Keep You Rolling",
    sub: "Full-service workshop — from tune-ups to complete overhauls. Visit us today.",
    cta: "Get Service",
    ctaLink: "#contact",
    accent: "linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(30,41,59,0.55) 100%)",
  },
];

const BICYCLE_SUBCATEGORIES = ["Mountain", "City", "Kids", "Ladies", "Sports", "Electric"];

const CATEGORY_GROUPS = [
  {
    key: "Bicycle",
    title: "Bicycle",
    description: "Choose from everyday rides, trail bikes, kids cycles, and sporty electric models.",
    icon: <FaBicycle />,
    accentClass: "bicycle",
    image: rangerCycle,
    subcategories: BICYCLE_SUBCATEGORIES,
  },
  {
    key: "Parts",
    title: "Parts",
    description: "Frames, tyres, chains, brakes, and essential replacements to keep every ride moving.",
    icon: <FaCogs />,
    accentClass: "parts",
    image: part,
  },
  {
    key: "Accessories",
    title: "Accessories",
    description: "Helmets, lights, carriers, bottles, and add-ons that make each ride better.",
    icon: <FaGift />,
    accentClass: "accessories",
    image: accesories,
  },
  {
    key: "New Arrivals",
    title: "New Arrivals",
    description: "Fresh stock and the latest additions from the newest launches in store.",
    icon: <FaRocket />,
    accentClass: "new-arrivals",
    image: newArrivals,
  },
  {
    key: "Tools",
    title: "Tools",
    description: "Repair kits, service tools, and workshop essentials for quick fixes and upkeep.",
    icon: <FaTools />,
    accentClass: "tools",
    image: tools,
  },
];

const FILTER_PILLS = ["All", ...CATEGORY_GROUPS.map((group) => group.key), ...BICYCLE_SUBCATEGORIES];

const STORE_FEATURES = [
  { icon: <FaTruck />, title: "Free Delivery", desc: "On orders above ₹2,000" },
  { icon: <FaShieldAlt />, title: "2-Year Warranty", desc: "On all branded cycles" },
  { icon: <FaTools />, title: "Expert Service", desc: "Certified mechanics" },
  { icon: <FaPhoneAlt />, title: "24/7 Support", desc: "Always here for you" },
];

function Home() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loadingCart, setLoadingCart] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const sliderRef = useRef(null);
  const autoSlideRef = useRef(null);
  const user = getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto slide
  useEffect(() => {
    autoSlideRef.current = setInterval(() => {
      setActiveSlide((p) => (p + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(autoSlideRef.current);
  }, []);

  // Handle URL search param
  const searchQuery = new URLSearchParams(location.search).get("search") || "";

  // Fetch products
  useEffect(() => {
    fetch("http://localhost:8080/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Product fetch error:", err));
  }, []);

  // Fetch wishlist
  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:8080/api/wishlist/${user.id}`)
      .then((res) => res.json())
      .then((data) => setWishlistIds(data.map((item) => item.productId)))
      .catch(() => { });
  }, [user?.id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  };

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    scrollToProducts();
  };

  const getReleaseTime = (product) => {
    if (!product?.releaseDate) {
      return 0;
    }

    const parsedDate = new Date(product.releaseDate);
    return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  };

  const goToSlide = (idx) => {
    clearInterval(autoSlideRef.current);
    setActiveSlide(idx);
    autoSlideRef.current = setInterval(() => {
      setActiveSlide((p) => (p + 1) % HERO_SLIDES.length);
    }, 5000);
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    if (!user?.id) { navigate("/login"); return; }
    setLoadingCart(product.id);
    try {
      const params = new URLSearchParams({ userId: user.id, productId: product.id, quantity: 1 });
      const response = await fetch(`http://localhost:8080/api/cart/add?${params}`, { method: "POST" });
      if (response.ok) showToast(`✅ ${product.name} added to cart!`);
      else showToast("❌ Failed to add to cart.");
    } catch {
      showToast("❌ Network error.");
    } finally {
      setLoadingCart(null);
    }
  };

  const toggleWishlist = async (e, productId) => {
    e.preventDefault();
    if (!user?.id) { navigate("/login"); return; }
    const isAdded = wishlistIds.includes(productId);
    const endpoint = isAdded ? "remove" : "add";
    const method = isAdded ? "DELETE" : "POST";
    const params = new URLSearchParams({ userId: user.id, productId });
    try {
      const res = await fetch(`http://localhost:8080/api/wishlist/${endpoint}?${params}`, { method });
      if (res.ok) {
        setWishlistIds((prev) => isAdded ? prev.filter((id) => id !== productId) : [...prev, productId]);
        showToast(isAdded ? "💔 Removed from wishlist" : "❤️ Added to wishlist!");
      }
    } catch {
      showToast("❌ Network error.");
    }
  };

  const matchesCategory = (product, selectedCategory) => {
    if (selectedCategory === "All") {
      return true;
    }

    const productCategory = product.category?.toLowerCase() || "";
    const categoryText = `${product.name || ""} ${product.desc || ""} ${product.brand || ""}`.toLowerCase();

    if (selectedCategory === "Bicycle") {
      return BICYCLE_SUBCATEGORIES.some(
        (category) => productCategory === category.toLowerCase()
      );
    }

    if (selectedCategory === "Parts") {
      return (
        productCategory.includes("part") ||
        productCategory.includes("spare") ||
        ["tyre", "tire", "tube", "chain", "brake", "pedal", "rim", "seat", "handle", "frame"].some((term) =>
          categoryText.includes(term)
        )
      );
    }

    if (selectedCategory === "Accessories") {
      return (
        productCategory.includes("accessor") ||
        ["helmet", "light", "lock", "bottle", "carrier", "bag", "pump", "bell"].some((term) =>
          categoryText.includes(term)
        )
      );
    }

    if (selectedCategory === "Tools") {
      return (
        productCategory.includes("tool") ||
        ["tool", "repair", "kit", "wrench", "spanner", "allen key", "maintenance"].some((term) =>
          categoryText.includes(term)
        )
      );
    }

    if (selectedCategory === "New Arrivals") {
      const releaseDate = product.releaseDate ? new Date(product.releaseDate) : null;
      const isRecentRelease =
        releaseDate instanceof Date &&
        !Number.isNaN(releaseDate.getTime()) &&
        Date.now() - releaseDate.getTime() <= 1000 * 60 * 60 * 24 * 120;

      return productCategory.includes("new") || isRecentRelease;
    }

    return productCategory === selectedCategory.toLowerCase();
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchableText = [
      p.name,
      p.brand,
      p.category,
      p.desc,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchSearch = normalizedSearch
      ? searchableText.includes(normalizedSearch)
      : true;
    const matchCat = matchesCategory(p, activeCategory);
    return matchSearch && matchCat;
  });

  const featuredProducts = [...filteredProducts]
    .sort((a, b) => {
      const availabilityScoreA = (a.available ? 1 : 0) + (a.quantity > 0 ? 1 : 0);
      const availabilityScoreB = (b.available ? 1 : 0) + (b.quantity > 0 ? 1 : 0);

      if (availabilityScoreA !== availabilityScoreB) {
        return availabilityScoreB - availabilityScoreA;
      }

      if ((b.quantity || 0) !== (a.quantity || 0)) {
        return (b.quantity || 0) - (a.quantity || 0);
      }

      return getReleaseTime(b) - getReleaseTime(a);
    })
    .slice(0, 8);

  const isFilteredView = activeCategory !== "All" || Boolean(searchQuery);
  const productsToRender = isFilteredView ? filteredProducts : featuredProducts;
  const sectionTitle = isFilteredView ? "Product Results" : "Featured Products";
  const sectionSubtitle = isFilteredView
    ? "Browse products based on your selected category and search."
    : "A handpicked mix of our most in-stock and latest products.";

  const slide = HERO_SLIDES[activeSlide];

  return (
    <>
      {/* Toast notification */}
      {toastMsg && <div className="toast-notification">{toastMsg}</div>}

      {/* ============ HERO SECTION ============ */}
      <section className="hero-section" ref={sliderRef}>
        {/* Background images */}
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`hero-bg-slide${i === activeSlide ? " active" : ""}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}

        {/* Gradient overlay */}
        <div className="hero-overlay" style={{ background: slide.accent }} />

        {/* Content */}
        <div className="hero-content">
          <div className="store-badge-wrapper">
            <span className="store-label">🚲 Shreenath Cycle Store</span>
          </div>
          <div className="slide-badge">{slide.badge}</div>
          <h1 className="hero-headline">{slide.headline}</h1>
          <p className="hero-sub">{slide.sub}</p>
          <div className="hero-actions">
            <a href={slide.ctaLink} className="hero-cta-primary">
              {slide.cta} <FaArrowRight />
            </a>
            <Link to="/wishlist" className="hero-cta-secondary">
              <FaHeart /> My Wishlist
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span className="stat-num">500+</span><span>Products</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span className="stat-num">10k+</span><span>Happy Riders</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span className="stat-num">50+</span><span>Years Experience</span></div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="hero-dots">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === activeSlide ? " active" : ""}`}
              onClick={() => goToSlide(i)}
            />
          ))}
        </div>

        {/* Arrow controls */}
        <button className="hero-arrow prev" onClick={() => goToSlide((activeSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}>
          <FaChevronLeft />
        </button>
        <button className="hero-arrow next" onClick={() => goToSlide((activeSlide + 1) % HERO_SLIDES.length)}>
          <FaChevronRight />
        </button>
      </section>

      {/* ============ STORE FEATURES ============ */}
      <section className="features-strip">
        <div className="features-container">
          {STORE_FEATURES.map((f, i) => (
            <div className="feature-item" key={i}>
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SHOP CATEGORIES ============ */}
      <section className="categories-section">
        <div className="section-container">
          <div className="section-heading">
            <h2>Shop by Category</h2>
            <p>Browse bicycles, parts, accessories, new arrivals, and tools from one place.</p>
          </div>

          <div className="category-group-grid">
            {CATEGORY_GROUPS.map((group) => (
              <article
                key={group.key}
                className={`category-group-card ${group.accentClass}${activeCategory === group.key ? " active" : ""}`}
              >
                <div className="category-group-media">
                  <img src={group.image} alt={group.title} />
                </div>

                <div className="category-group-overlay" />

                <div className="category-group-content">
                  <div className="category-group-header">
                    <span className="category-group-icon">{group.icon}</span>
                    <span className="category-group-title">{group.title}</span>
                  </div>

                  <p className="category-group-description">{group.description}</p>

                  <button
                    className="category-group-cta"
                    onClick={() => handleCategorySelect(group.key)}
                  >
                    Explore {group.title} <FaArrowRight />
                  </button>

                  {group.subcategories?.length ? (
                    <div className="category-subgrid">
                      {group.subcategories.map((subcategory) => (
                        <button
                          key={subcategory}
                          className={`category-subchip${activeCategory === subcategory ? " active" : ""}`}
                          onClick={() => handleCategorySelect(subcategory)}
                        >
                          {subcategory}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED PRODUCTS ============ */}
      <section className="product-section" id="products">
        <div className="section-container">
          <div className="section-heading-row">
            <div className="section-heading">
              <h2>
                <FaFire className="fire-icon" /> {sectionTitle}
                {searchQuery && <span className="search-result-chip">Results for "{searchQuery}"</span>}
              </h2>
              <p>{sectionSubtitle}</p>
            </div>
            <Link to="/cart" className="view-cart-btn">
              <FaShoppingCart /> View Cart
            </Link>
          </div>

          <div className="featured-meta-row">
            <span className="featured-meta-pill">
              Showing {productsToRender.length} {productsToRender.length === 1 ? "product" : "products"}
            </span>
            {activeCategory !== "All" && (
              <span className="featured-meta-pill active-filter">
                Active Filter: {activeCategory}
              </span>
            )}
          </div>

          {/* Category filter pills */}
          <div className="filter-pills">
            {FILTER_PILLS.map((cat) => (
              <button
                key={cat}
                className={`filter-pill${activeCategory === cat ? " active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="product-grid">
            {productsToRender.length > 0 ? (
              productsToRender.map((product) => (
                <div className="product-card" key={product.id}>
                  <Link to={`/product/${product.id}`} className="product-img-wrapper">
                    <img
                      src={`http://localhost:8080/api/product/${product.id}/image`}
                      className="product-img"
                      alt={product.name}
                      onError={(e) => { e.target.src = normalCycle; }}
                    />
                    {/* Badges */}
                    {product.quantity <= 5 && product.quantity > 0 && (
                      <span className="badge badge-low">Low Stock</span>
                    )}
                    {product.quantity === 0 && (
                      <span className="badge badge-out">Out of Stock</span>
                    )}
                    {/* Mock featured for aesthetic purposes */}
                    {product.id % 2 !== 0 && product.quantity > 0 && (
                      <span className="badge badge-hot">🔥 Hot</span>
                    )}

                    {/* Wishlist */}
                    <button
                      className={`wishlist-btn${wishlistIds.includes(product.id) ? " active" : ""}`}
                      onClick={(e) => toggleWishlist(e, product.id)}
                      title={wishlistIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {wishlistIds.includes(product.id) ? <FaHeart /> : <FaRegHeart />}
                    </button>
                  </Link>

                  <div className="product-info">
                    <Link to={`/product/${product.id}`} className="product-link">
                      <h3>{product.name}</h3>
                    </Link>

                    {/* Star rating (static display, can be dynamic) */}
                    <div className="product-rating">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <FaStar key={s} className={s <= 4 ? "star filled" : "star"} />
                      ))}
                      <span className="rating-count">(24)</span>
                    </div>

                    {product.desc && (
                      <p className="product-desc">{product.desc.slice(0, 60)}{product.desc.length > 60 ? "…" : ""}</p>
                    )}

                    <div className="product-price-row">
                      <span className="product-price">₹{product.price?.toLocaleString("en-IN")}</span>
                      {product.price && (
                        <span className="product-mrp">₹{(product.price * 1.15).toLocaleString("en-IN")}</span>
                      )}
                    </div>

                    <div className="product-card-actions">
                      <button
                        className="add-to-cart-btn"
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={loadingCart === product.id || product.quantity === 0}
                      >
                        {loadingCart === product.id ? (
                          <span className="spinner" />
                        ) : (
                          <><FaShoppingCart /> {product.quantity === 0 ? "Out of Stock" : "Add to Cart"}</>
                        )}
                      </button>
                      <Link to={`/product/${product.id}`} className="view-details-btn">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-products">
                <FaFilter />
                <p>No products found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
                <button className="reset-filter-btn" onClick={() => setActiveCategory("All")}>
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ CONTACT / LOCATION ============ */}
      <section className="contact-section" id="contact">
        <div className="section-container">
          <div className="section-heading">
            <h2>Visit Our Store</h2>
            <p>We're always happy to help you find the perfect cycle</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <FaMapMarkerAlt className="contact-icon" />
              <h4>Address</h4>
              <p>Shreenath Cycle Store<br />Dhanush Chauraha Karwi, Chitrakoot<br />Uttar Pradesh – 210205</p>
            </div>
            <div className="contact-card">
              <FaPhoneAlt className="contact-icon" />
              <h4>Phone</h4>
              <p>+91 70520 50415<br />Mon – Sun: 9 AM to 8 PM</p>
            </div>
            <div className="contact-card">
              <FaClock className="contact-icon" />
              <h4>Store Hours</h4>
              <p>Monday – Sunday<br />9:00 AM – 8:00 PM<br />Saturday: 10 AM – 6 PM</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
