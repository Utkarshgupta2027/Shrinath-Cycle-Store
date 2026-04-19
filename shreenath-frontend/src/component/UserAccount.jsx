import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";   // ✅ Added useNavigate
import "./userAccount.css";
import "./home.css";
import logo from "../images/logo.png";
import cart from "../images/cart.jpg";
import login from "../images/login.webp";

export default function UserAccount() {
  const navigate = useNavigate();

  // ✅ Safe localStorage parsing
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [searchTerm, setSearchTerm] = useState("");

  // Search Handler
  const handleSearch = (e) => {
    e.preventDefault();
    alert(`Searching for: ${searchTerm}`);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    alert("You have been logged out.");
    navigate("/");   // ✅ Better than window.location.href
  };

  // Login Redirect
  const handleLoginRedirect = () => {
    navigate("/login");   // ✅ Proper navigation
  };

  return (
    <>
      {/* NAVBAR */}
      <nav>
        <div className="nav-container">
          <div className="logo-section">
            <Link to="/">
              <img src={logo} alt="Logo" className="logo" />
            </Link>
            <h4 className="store-name">ShreeNathCycleStore.com</h4>
          </div>

          <ul className="nav-links">
            <li>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">
                  🔍
                </button>
              </form>
            </li>

            <li>
              <Link to="/AddProduct">AddProduct</Link>
            </li>

            <li className="nav-icon">
              <Link to="/Cart">
                <img src={cart} className="icon-img" alt="Cart" />
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* PROFILE CARD */}
      <div className="user-card">
        <h2>Profile</h2>

        <div className="profile-content">
          <img src={login} className="icon-img-large" alt="User" />

          {user ? (
            <div className="user-details">
              <p><strong>Name:</strong> {user.username}</p>
              {/* <p><strong>Email:</strong> {user.email}</p> */}
              <p><strong>Phone:</strong> {user.phoneNo}</p>

              <Link to="/EditProfile">
                <button className="edit-btn">Edit Profile</button>
              </Link>
            </div>
          ) : (
            <p>No user information available.</p>
          )}
        </div>
      </div>

      {/* USER ACTION CARDS */}
      <div className="user-actions">
        <div className="action-card">
          <h3>📦 Orders</h3>
          <p>View your past and current orders</p>
          <Link to="/orders">View Orders</Link>
        </div>

        <div className="action-card">
          <h3>❤️ Wishlist</h3>
          <p>Your saved favorite products</p>
          <Link to="/wishlist">View Wishlist</Link>
        </div>

        <div className="action-card">
          <h3>🏠 Address Book</h3>
          <p>Manage delivery addresses</p>
          <Link to="/address-book">Manage Address</Link>
        </div>
      </div>

      {/* LOGIN / LOGOUT */}
      <div className="logout-section">
        {user ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <button className="login-btn" onClick={handleLoginRedirect}>
            Login
          </button>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Go Back
      </button>
    </>
  );
}