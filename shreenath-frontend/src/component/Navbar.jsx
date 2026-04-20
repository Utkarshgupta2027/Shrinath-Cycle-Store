import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaShoppingCart, FaUser, FaSearch } from "react-icons/fa";
import logo from "../images/logo.png";
import { getStoredUser, isAdminUser } from "../utils/auth";
import "./Navbar.css";

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  // Fetch cart count from backend whenever route changes
  useEffect(() => {
    if (!user?.id) {
      setCartCount(0);
      return;
    }

    fetch(`http://localhost:8080/api/cart/users/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.items) {
          const total = data.items.reduce((sum, ci) => sum + (ci.quantity || 1), 0);
          setCartCount(total);
        }
      })
      .catch(() => {});
  }, [location.pathname, user?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      alert(`Searching: ${searchTerm}`);
    }
  };

  return (
    <nav className="global-navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="logo-section">
          <Link to="/">
            <img src={logo} alt="ShreeNathCycleStore Logo" className="logo" />
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search cycles, accessories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            <FaSearch />
          </button>
        </form>

        {/* Right Nav */}
        <ul className="nav-links">
          {isAdminUser(user) && (
            <li>
              <Link to="/admin" className="nav-text-link">Admin Panel</Link>
            </li>
          )}
          <li>
            <Link to="/cart" className="nav-icon-link cart-link">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </Link>
          </li>
          <li>
            <Link to="/useraccount" className="nav-icon-link">
              <FaUser />
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
