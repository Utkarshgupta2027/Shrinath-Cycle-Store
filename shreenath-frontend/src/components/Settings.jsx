import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser, FaLock, FaBell, FaShieldAlt, FaSignOutAlt,
  FaTrash, FaMoon, FaSun, FaChevronRight, FaIdBadge
} from "react-icons/fa";
import { getStoredUser } from "../utils/auth";
import "../styles/components/Settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="settings-login-prompt">
            <FaLock />
            <h2>Login Required</h2>
            <p>Please login to access your settings.</p>
            <Link to="/login" className="settings-login-btn">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences and security</p>
        </div>

        {/* User identity card */}
        <div className="settings-user-card">
          <div className="settings-avatar">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
          <div className="settings-user-info">
            <h3>{user.name || user.username || user.email}</h3>
            <p className="settings-email">{user.email}</p>
            <div className="settings-meta">
              <span className="settings-id"><FaIdBadge /> User ID: {user.id}</span>
              <span className={`settings-role ${user.role === "ADMIN" ? "admin" : ""}`}>
                {user.role || "CUSTOMER"}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-grid">
          {/* Account Settings */}
          <div className="settings-section">
            <div className="settings-section-title">
              <FaUser /> Account
            </div>
            <div className="settings-items">
              <Link to="/useraccount" className="settings-item">
                <div>
                  <div className="item-label">Profile Information</div>
                  <div className="item-desc">Name, email, phone number</div>
                </div>
                <FaChevronRight />
              </Link>
              <Link to="/orders" className="settings-item">
                <div>
                  <div className="item-label">Order History</div>
                  <div className="item-desc">View all your past orders</div>
                </div>
                <FaChevronRight />
              </Link>
              <Link to="/wishlist" className="settings-item">
                <div>
                  <div className="item-label">Wishlist</div>
                  <div className="item-desc">Saved products</div>
                </div>
                <FaChevronRight />
              </Link>
              <Link to="/cart" className="settings-item">
                <div>
                  <div className="item-label">Shopping Cart</div>
                  <div className="item-desc">View your cart items</div>
                </div>
                <FaChevronRight />
              </Link>
            </div>
          </div>

          {/* Preferences */}
          <div className="settings-section">
            <div className="settings-section-title">
              <FaBell /> Preferences
            </div>
            <div className="settings-items">
              <div className="settings-item toggle-item">
                <div>
                  <div className="item-label">
                    {darkMode ? <FaMoon /> : <FaSun />} Dark Mode
                  </div>
                  <div className="item-desc">Switch between light and dark theme</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode((p) => !p)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-item toggle-item">
                <div>
                  <div className="item-label">Push Notifications</div>
                  <div className="item-desc">Receive promotional notifications</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={() => setNotifications((p) => !p)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-item toggle-item">
                <div>
                  <div className="item-label">Order Alerts</div>
                  <div className="item-desc">Get notified on order status updates</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={orderAlerts}
                    onChange={() => setOrderAlerts((p) => !p)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <button className="save-prefs-btn" onClick={handleSave}>
              {saved ? "✅ Saved!" : "Save Preferences"}
            </button>
          </div>

          {/* Security */}
          <div className="settings-section">
            <div className="settings-section-title">
              <FaShieldAlt /> Security
            </div>
            <div className="settings-items">
              <div className="settings-item">
                <div>
                  <div className="item-label">Phone Number</div>
                  <div className="item-desc">{user.phoneNo || "Not set"}</div>
                </div>
              </div>
              <div className="settings-item">
                <div>
                  <div className="item-label">Account Role</div>
                  <div className="item-desc">{user.role || "CUSTOMER"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-section danger-section">
            <div className="settings-section-title danger-title">
              <FaTrash /> Danger Zone
            </div>
            <div className="settings-items">
              <button className="settings-item danger-item" onClick={handleLogout}>
                <div>
                  <div className="item-label">Logout</div>
                  <div className="item-desc">Sign out of your account</div>
                </div>
                <FaSignOutAlt />
              </button>
              <button
                className="settings-item danger-item delete-item"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <div>
                  <div className="item-label">Delete Account</div>
                  <div className="item-desc">Permanently remove your account and data</div>
                </div>
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Account?</h3>
              <p>This action is <strong>permanent</strong> and cannot be undone. All your data, orders, and wishlist will be deleted.</p>
              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="modal-delete" onClick={() => {
                  // TODO: call DELETE /api/users/{user.id}
                  alert("Account deletion requested. Please contact support.");
                  setShowDeleteConfirm(false);
                }}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
