import React, { useState, useEffect, useRef, useContext } from "react";
import { API_BASE_URL } from "../config";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaShoppingCart,
  FaUser,
  FaSearch,
  FaHeart,
  FaCog,
  FaShieldAlt,
  FaSignOutAlt,
  FaBoxOpen,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaIdBadge,
  FaBicycle,
  FaDownload,
} from "react-icons/fa";
import logo from "../assets/images/logo.png";
import { getStoredUser, isAdminUser } from "../utils/auth";
import AppContext from "../Context/Context";
import "../styles/components/Navbar.css";

const SHOP_CATEGORIES = ["Bicycle", "Parts", "Accessories", "New Arrivals", "Tools"];

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [wishlistCount, setWishlistCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShopMenu, setShowShopMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // PWA install
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pwaInstalling, setPwaInstalling] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, cartCount } = useContext(AppContext);
  const userMenuRef = useRef(null);
  const shopMenuRef = useRef(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (isStandalone) { setPwaInstalled(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setPwaPrompt(e); };
    const onInstalled = () => { setPwaInstalled(true); setPwaPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!pwaPrompt || pwaInstalling) return;
    setPwaInstalling(true);
    pwaPrompt.prompt();
    try {
      const { outcome } = await pwaPrompt.userChoice;
      if (outcome === "accepted") { setPwaInstalled(true); setPwaPrompt(null); }
    } catch (err) {
      console.error("Install failed:", err);
    } finally {
      setPwaInstalling(false);
    }
  };

  // Fetch wishlist count — only re-fetch when user changes or on wishlist page
  useEffect(() => {
    if (!user?.id) { setWishlistCount(0); return; }
    fetch(`${API_BASE_URL}/api/wishlist/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (Array.isArray(data)) setWishlistCount(data.length); })
      .catch(() => {});
  // Re-fetch only when user changes; wishlist page will handle its own updates
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (shopMenuRef.current && !shopMenuRef.current.contains(e.target)) {
        setShowShopMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
    }
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(mobileSearchTerm.trim())}`);
      setMobileSearchTerm("");
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setMobileOpen(false);
    navigate("/login", { state: { resetAuthForm: Date.now() } });
  };

  const userName = user ? (user.name || user.email || `User #${user.id}`) : null;
  const isHomePage = location.pathname === "/";
  const categoryLinks = SHOP_CATEGORIES.map((category) => ({
    label: category,
    to: `/?category=${encodeURIComponent(category)}#products`,
  }));

  return (
    <nav className={`global-navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-container">
        {/* Logo */}
        <div className="logo-section">
          <Link to="/">
            <img src={logo} alt="ShreeNath Cycle Store" className="logo" />
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="search-form">
          <FaSearch className="search-icon-inline" />
          <input
            type="text"
            placeholder="Search cycles, accessories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="desktop-menu">
          <Link to="/" className={`menu-link${location.pathname === "/" ? " active" : ""}`}>
            Home
          </Link>
          <a href={isHomePage ? "#categories" : "/#categories"} className="menu-link">
            Categories
          </a>
          <a href={isHomePage ? "#products" : "/#products"} className="menu-link">
            Products
          </a>
          <a href={isHomePage ? "#contact" : "/#contact"} className="menu-link">
            Contact
          </a>

          {/* PWA Install button — desktop */}
          {!pwaInstalled && (
            <button
              className={`nav-install-btn${!pwaPrompt ? " nav-install-btn--dim" : ""}${pwaInstalling ? " nav-install-btn--loading" : ""}`}
              onClick={handlePwaInstall}
              disabled={pwaInstalling || !pwaPrompt}
              title={pwaPrompt ? "Install Shrinath App" : "Open in Chrome to install"}
            >
              <FaDownload className="nav-install-icon" />
              {pwaInstalling ? "Installing…" : "Install App"}
            </button>
          )}

          <div className="menu-dropdown" ref={shopMenuRef}>
            <button
              type="button"
              className="menu-dropdown-trigger"
              onClick={() => setShowShopMenu((p) => !p)}
              onMouseEnter={() => setShowShopMenu(true)}
              aria-expanded={showShopMenu}
              aria-haspopup="true"
            >
              <FaBicycle />
              Shop
              <FaChevronDown className={`menu-dropdown-chevron${showShopMenu ? " open" : ""}`} />
            </button>
            {showShopMenu && (
              <div className="menu-dropdown-panel" onMouseLeave={() => setShowShopMenu(false)}>
                {categoryLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="menu-dropdown-link"
                    onClick={() => setShowShopMenu(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right nav */}
        <ul className="nav-links">
          {/* Wishlist */}
          <li>
            <Link to="/wishlist" className="nav-icon-link wishlist-link" title="Wishlist">
              <FaHeart />
              {wishlistCount > 0 && (
                <span className="nav-badge wishlist-badge">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>
          </li>

          {/* Cart */}
          <li>
            <Link to="/cart" className="nav-icon-link cart-link" title="Cart">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="nav-badge cart-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </li>

          {/* User menu */}
          {user ? (
            <li className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setShowUserMenu((p) => !p)}
                title="Account"
              >
                <div className="user-avatar">
                  {(userName || "U")[0].toUpperCase()}
                </div>
                <span className="user-name-chip">{userName?.split(" ")[0]}</span>
                <FaChevronDown className={`chevron${showUserMenu ? " open" : ""}`} />
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  {/* User identity card */}
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {(userName || "U")[0].toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <span className="dropdown-name">{userName}</span>
                      <span className="dropdown-id">
                        <FaIdBadge /> ID: {user.id}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <Link to="/useraccount" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <FaUser /> My Account
                  </Link>
                  <Link to="/orders" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <FaBoxOpen /> My Orders
                  </Link>
                  <Link to="/wishlist" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <FaHeart /> Wishlist
                  </Link>
                  <Link to="/cart" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <FaShoppingCart /> Cart
                  </Link>

                  {isAdminUser(user) && (
                    <>
                      <div className="dropdown-divider" />
                      <Link to="/admin" className="dropdown-item admin-item" onClick={() => setShowUserMenu(false)}>
                        <FaShieldAlt /> Admin Panel
                      </Link>
                    </>
                  )}

                  <div className="dropdown-divider" />
                  <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <FaCog /> Settings
                  </Link>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li>
              <Link to="/login" className="login-nav-btn">Login</Link>
            </li>
          )}
        </ul>

        {/* Mobile hamburger */}
        <button className="mobile-menu-btn" onClick={() => setMobileOpen((p) => !p)}>
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile persistent search bar — always visible below navbar on mobile */}
      <div className="mobile-search-bar">
        <form onSubmit={handleMobileSearch} className="mobile-search-bar-form">
          <FaSearch className="mobile-search-bar-icon" />
          <input
            type="text"
            placeholder="Search cycles, accessories..."
            value={mobileSearchTerm}
            onChange={(e) => setMobileSearchTerm(e.target.value)}
            className="mobile-search-bar-input"
            id="mobile-search-input"
          />
          {mobileSearchTerm && (
            <button
              type="button"
              className="mobile-search-bar-clear"
              onClick={() => setMobileSearchTerm("")}
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}
          <button type="submit" className="mobile-search-bar-btn">
            Search
          </button>
        </form>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          {user && (
            <div className="mobile-user-header">
              <div className="mobile-avatar">{(userName || "U")[0].toUpperCase()}</div>
              <div>
                <div className="mobile-user-name">{userName}</div>
                <div className="mobile-user-id"><FaIdBadge /> ID: {user.id}</div>
              </div>
            </div>
          )}
          <nav className="mobile-nav">
            <Link to="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</Link>
            <a href={isHomePage ? "#categories" : "/#categories"} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Categories</a>
            <a href={isHomePage ? "#products" : "/#products"} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Products</a>
            <a href={isHomePage ? "#contact" : "/#contact"} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Contact</a>
            <div className="mobile-nav-group">
              <div className="mobile-nav-group-label">Shop by category</div>
              {categoryLinks.map((item) => (
                <Link key={item.label} to={item.to} className="mobile-nav-link mobile-sub-link" onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
            <Link to="/cart" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              Cart {cartCount > 0 && <span className="mobile-badge">{cartCount}</span>}
            </Link>
            <Link to="/wishlist" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              Wishlist {wishlistCount > 0 && <span className="mobile-badge">{wishlistCount}</span>}
            </Link>
            {user ? (
              <>
                <Link to="/useraccount" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Account</Link>
                <Link to="/orders" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Orders</Link>
                <Link to="/settings" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Settings</Link>
                {isAdminUser(user) && (
                  <Link to="/admin" className="mobile-nav-link admin-mobile" onClick={() => setMobileOpen(false)}>Admin Panel</Link>
                )}
                <button className="mobile-nav-link mobile-logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Login / Register</Link>
            )}

            {/* PWA Install — mobile drawer */}
            {!pwaInstalled && (
              <button
                className={`mobile-install-btn${!pwaPrompt ? " mobile-install-btn--dim" : ""}`}
                onClick={() => { handlePwaInstall(); setMobileOpen(false); }}
                disabled={pwaInstalling || !pwaPrompt}
              >
                <FaDownload />
                {pwaInstalling ? "Installing…" : "📲 Install App"}
              </button>
            )}
          </nav>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
