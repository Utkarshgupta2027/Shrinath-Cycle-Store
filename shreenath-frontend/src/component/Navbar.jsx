import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUser, FaSearch } from "react-icons/fa";
import logo from "../images/logo.png";
import { getStoredUser, isAdminUser } from "../utils/auth";
import "./Navbar.css";

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      alert(`Searching: ${searchTerm}`);
      // navigate(`/search?q=${searchTerm}`);
    }
  };

  return (
    <nav className="global-navbar">
      <div className="nav-container">
        <div className="logo-section">
          <Link to="/">
            <img src={logo} alt="Logo" className="logo" />
          </Link>
        </div>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for cycles, accessories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            <FaSearch />
          </button>
        </form>

        <ul className="nav-links">
          {isAdmin && (
            <li>
              <Link to="/admin" className="nav-text-link">Admin Panel</Link>
            </li>
          )}
          <li>
            <Link to="/cart" className="nav-icon-link">
              <FaShoppingCart />
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
