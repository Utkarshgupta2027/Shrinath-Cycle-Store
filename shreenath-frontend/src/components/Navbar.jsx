import React, { useState, useEffect, useRef } from "react";
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
} from "react-icons/fa";
import logo from "../assets/images/logo.png";
import { clearStoredAuth, getStoredUser, isAdminUser } from "../utils/auth";
import "../styles/components/Navbar.css";

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const userMenuRef = useRef(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch cart count
  useEffect(() => {
    if (!user?.id) { setCartCount(0); return; }
    fetch(`http://localhost:8080/api/cart/users/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setCartCount(data.items.reduce((s, ci) => s + (ci.quantity || 1), 0));
        }
      })
      .catch(() => {});
  }, [location.pathname, user?.id]);

  // Fetch wishlist count
  useEffect(() => {
    if (!user?.id) { setWishlistCount(0); return; }
    fetch(`http://localhost:8080/api/wishlist/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (Array.isArray(data)) setWishlistCount(data.length); })
      .catch(() => {});
  }, [location.pathname, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
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

  const handleLogout = () => {
    clearStoredAuth();
    setShowUserMenu(false);
    setMobileOpen(false);
    navigate("/login", { state: { resetAuthForm: Date.now() } });
  };

  const userName = user ? (user.name || user.email || `User #${user.id}`) : null;

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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false); }} className="mobile-search-form">
            <FaSearch />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-search-input"
            />
          </form>
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
          </nav>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
