import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./userAccount.css";
import "./home.css";
import logo from "../images/logo.png";
import cart from "../images/cart.jpg";
import login from "../images/login.webp";

export default function UserAccount() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    alert(`Searching for: ${searchTerm}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    alert("You have been logged out.");
    navigate("/");
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  return (
    <>
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
                  Search
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

      <div className="user-card">
        <h2>Profile</h2>

        <div className="profile-content">
          <img src={login} className="icon-img-large" alt="User" />

          {user ? (
            <div className="user-details">
              <p><strong>Name:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email || "Not available"}</p>
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

      <div className="user-actions">
        <div className="action-card">
          <h3>Orders</h3>
          <p>View your past and current orders</p>
          <Link to="/orders">View Orders</Link>
        </div>

        <div className="action-card">
          <h3>Wishlist</h3>
          <p>Your saved favorite products</p>
          <Link to="/wishlist">View Wishlist</Link>
        </div>

        <div className="action-card">
          <h3>Address Book</h3>
          <p>Manage delivery addresses</p>
          <Link to="/address-book">Manage Address</Link>
        </div>
      </div>

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
        Go Back
      </button>
    </>
  );
}
