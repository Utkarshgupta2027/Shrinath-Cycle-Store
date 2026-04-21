import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./home.css";

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
} from "react-icons/fa";

import hero1 from "../images/hero1.webp";
import hero2 from "../images/hero2.webp";
import hero3 from "../images/hero3.webp";
import hero4 from "../images/hero4.jpeg";
import ladiesCycle from "../images/ladies.webp";
import normalCycle from "../images/normal.webp";
import rangerCycle from "../images/ranger.webp";
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

const CATEGORIES = ["All", "Mountain", "City", "Kids", "Ladies", "Sports", "Electric"];

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
      .catch(() => {});
  }, [user?.id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
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

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchSearch = searchQuery
      ? p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchCat = activeCategory === "All" ? true : p.category?.toLowerCase() === activeCategory.toLowerCase();
    return matchSearch && matchCat;
  });

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
            <div className="hero-stat"><span className="stat-num">15+</span><span>Years Experience</span></div>
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

      {/* ============ SHOP CATEGORIES (image cards) ============ */}
      <section className="categories-section">
        <div className="section-container">
          <div className="section-heading">
            <h2>Shop by Category</h2>
            <p>Find your perfect ride from our wide collection</p>
          </div>
          <div className="category-cards">
            {[
              { label: "Ladies Cycles", img: ladiesCycle, filter: "Ladies" },
              { label: "City Cycles",   img: normalCycle,  filter: "City"   },
              { label: "Mountain / MTB", img: rangerCycle, filter: "Mountain" },
            ].map((c) => (
              <button
                key={c.label}
                className="category-card"
                onClick={() => {
                  setActiveCategory(c.filter);
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <img src={c.img} alt={c.label} />
                <div className="category-overlay">
                  <span>{c.label}</span>
                  <FaArrowRight />
                </div>
              </button>
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
                <FaFire className="fire-icon" /> Featured Products
                {searchQuery && <span className="search-result-chip">Results for "{searchQuery}"</span>}
              </h2>
              <p>Handpicked premium selection for every cyclist</p>
            </div>
            <Link to="/cart" className="view-cart-btn">
              <FaShoppingCart /> View Cart
            </Link>
          </div>

          {/* Category filter pills */}
          <div className="filter-pills">
            {CATEGORIES.map((cat) => (
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
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
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
                      {[1,2,3,4,5].map((s) => (
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
              <p>Shreenath Cycle Store<br />Main Market Road, Agra<br />Uttar Pradesh – 282001</p>
            </div>
            <div className="contact-card">
              <FaPhoneAlt className="contact-icon" />
              <h4>Phone</h4>
              <p>+91 70520 50415<br />Mon – Sat: 9 AM to 8 PM</p>
            </div>
            <div className="contact-card">
              <FaClock className="contact-icon" />
              <h4>Store Hours</h4>
              <p>Monday – Saturday<br />9:00 AM – 8:00 PM<br />Sunday: 10 AM – 6 PM</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
