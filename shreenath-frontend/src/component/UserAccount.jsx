import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaShoppingBag, FaHeart, FaUserShield, FaSignOutAlt, FaSignInAlt } from "react-icons/fa";
import { isAdminUser } from "../utils/auth";
import "./userAccount.css";

export default function UserAccount() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }

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
    <div className="user-account-page">
      <div className="account-container">
        <h1 className="page-title">My Account</h1>

        <div className="profile-section">
          <div className="profile-card">
            <div className="profile-avatar">
              <FaUserCircle className="avatar-icon" />
            </div>
            {user ? (
              <div className="user-info">
                <h2>{user.username}</h2>
                <div className="user-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{user.email || "Not available"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.phoneNo}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Role</span>
                    <span className="detail-value role-badge">{user.role || "CUSTOMER"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="user-info empty-state">
                <h2>Welcome Guest</h2>
                <p>Please login to view your complete profile and access all features.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <Link to="/orders" className="dashboard-card">
            <div className="card-icon orders-icon">
              <FaShoppingBag />
            </div>
            <div className="card-content">
              <h3>My Orders</h3>
              <p>Track, return, or buy things again</p>
            </div>
          </Link>

          <Link to="/wishlist" className="dashboard-card">
            <div className="card-icon wishlist-icon">
              <FaHeart />
            </div>
            <div className="card-content">
              <h3>My Wishlist</h3>
              <p>View your saved favorite products</p>
            </div>
          </Link>

          {isAdminUser(user) && (
            <Link to="/admin" className="dashboard-card admin-card">
              <div className="card-icon admin-icon">
                <FaUserShield />
              </div>
              <div className="card-content">
                <h3>Admin Panel</h3>
                <p>Manage products, categories, and orders</p>
              </div>
            </Link>
          )}
        </div>

        <div className="auth-section">
          {user ? (
            <button className="auth-btn logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          ) : (
            <button className="auth-btn login-btn" onClick={handleLoginRedirect}>
              <FaSignInAlt /> Login to your account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
