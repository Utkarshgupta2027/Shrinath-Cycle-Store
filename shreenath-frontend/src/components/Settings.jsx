import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaChevronRight,
  FaEdit,
  FaIdBadge,
  FaLock,
  FaMoon,
  FaShieldAlt,
  FaSignOutAlt,
  FaSun,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import {
  clearStoredAuth,
  getAuthHeaders,
  getStoredUser,
  normalizeStoredUser,
  setStoredUser,
} from "../utils/auth";
import "../styles/components/Settings.css";

const API_BASE = "http://localhost:8080";

const getPreferencesKey = (userId) => `settingsPreferences:${userId}`;

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export default function Settings() {
  const navigate = useNavigate();
  const storedUser = normalizeStoredUser(getStoredUser());
  const [user, setUser] = useState(storedUser);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    phoneNumber: storedUser?.phoneNo || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const preferencesKey = useMemo(
    () => (user?.id ? getPreferencesKey(user.id) : null),
    [user?.id]
  );

  useEffect(() => {
    if (!user || !preferencesKey) {
      return;
    }

    try {
      const savedPreferences = JSON.parse(localStorage.getItem(preferencesKey) || "{}");
      setDarkMode(Boolean(savedPreferences.darkMode));
      setNotifications(savedPreferences.notifications ?? true);
      setOrderAlerts(savedPreferences.orderAlerts ?? true);
    } catch (error) {
      setDarkMode(false);
      setNotifications(true);
      setOrderAlerts(true);
    }
  }, [preferencesKey, user]);

  useEffect(() => {
    document.body.classList.toggle("settings-dark-mode", darkMode);

    return () => {
      document.body.classList.remove("settings-dark-mode");
    };
  }, [darkMode]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    setProfileForm({
      name: user.name || "",
      email: user.email || "",
      phoneNumber: user.phoneNo || "",
    });
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    axios
      .get(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
      .then((response) => {
        const nextUser = normalizeStoredUser(response.data);
        setUser(nextUser);
        setStoredUser(nextUser);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [user?.id]);

  const showSuccess = (message) => {
    setErrorMessage("");
    setStatusMessage(message);
    window.clearTimeout(showSuccess.timeoutId);
    showSuccess.timeoutId = window.setTimeout(() => setStatusMessage(""), 2500);
  };

  const showError = (message) => {
    setStatusMessage("");
    setErrorMessage(message);
    window.clearTimeout(showError.timeoutId);
    showError.timeoutId = window.setTimeout(() => setErrorMessage(""), 3500);
  };

  const handleLogout = () => {
    document.body.classList.remove("settings-dark-mode");
    clearStoredAuth();
    navigate("/login", { state: { resetAuthForm: Date.now() } });
  };

  const handleSave = () => {
    if (!preferencesKey) {
      showError("Unable to save preferences right now.");
      return;
    }

    localStorage.setItem(
      preferencesKey,
      JSON.stringify({
        darkMode,
        notifications,
        orderAlerts,
      })
    );

    setSaved(true);
    showSuccess("Preferences saved successfully.");
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!profileForm.name.trim() || !profileForm.email.trim() || !profileForm.phoneNumber.trim()) {
      showError("Name, email and phone number are required.");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await axios.put(
        `${API_BASE}/api/auth/me/profile`,
        {
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phoneNumber: profileForm.phoneNumber.trim(),
        },
        { headers: getAuthHeaders() }
      );

      const updatedUser = normalizeStoredUser(response.data.user);
      setUser(updatedUser);
      setStoredUser(updatedUser);

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      setShowProfileModal(false);
      showSuccess("Profile updated successfully.");
    } catch (error) {
      console.error(error);
      showError(getErrorMessage(error, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      showError("Please fill all password fields.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("New password and confirm password do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await axios.put(
        `${API_BASE}/api/auth/me/password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        { headers: getAuthHeaders() }
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
      showSuccess("Password changed successfully.");
    } catch (error) {
      console.error(error);
      showError(getErrorMessage(error, "Failed to change password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await axios.delete(`${API_BASE}/api/auth/me`, {
        headers: getAuthHeaders(),
      });

      document.body.classList.remove("settings-dark-mode");
      clearStoredAuth();
      navigate("/register");
    } catch (error) {
      console.error(error);
      showError(getErrorMessage(error, "Failed to delete account."));
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
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
    <div className={`settings-page${darkMode ? " dark-surface" : ""}`}>
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences and security</p>
        </div>

        {statusMessage ? <div className="settings-banner success">{statusMessage}</div> : null}
        {errorMessage ? <div className="settings-banner error">{errorMessage}</div> : null}

        <div className="settings-user-card">
          <div className="settings-avatar">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
          <div className="settings-user-info">
            <h3>{user.name || user.username || user.email}</h3>
            <p className="settings-email">{user.email || "Email not set"}</p>
            <div className="settings-meta">
              <span className="settings-id"><FaIdBadge /> User ID: {user.id}</span>
              <span className={`settings-role ${user.role === "ADMIN" ? "admin" : ""}`}>
                {user.role || "CUSTOMER"}
              </span>
              <span className={`settings-role ${user.verified ? "verified" : "unverified"}`}>
                {user.verified ? "Verified" : "Not Verified"}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-section">
            <div className="settings-section-title">
              <FaUser /> Account
            </div>
            <div className="settings-items">
              <button className="settings-item" onClick={() => setShowProfileModal(true)}>
                <div>
                  <div className="item-label">Edit Profile</div>
                  <div className="item-desc">Update name, email, and phone number</div>
                </div>
                <FaEdit />
              </button>
              <Link to="/useraccount" className="settings-item">
                <div>
                  <div className="item-label">Profile Overview</div>
                  <div className="item-desc">See your current account summary</div>
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
                  <div className="item-desc">Switch the settings page surface theme</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode((current) => !current)}
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
                    onChange={() => setNotifications((current) => !current)}
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
                    onChange={() => setOrderAlerts((current) => !current)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <button className="save-prefs-btn" onClick={handleSave}>
              {saved ? "Saved!" : "Save Preferences"}
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">
              <FaShieldAlt /> Security
            </div>
            <div className="settings-items">
              <div className="settings-item static-item">
                <div>
                  <div className="item-label">Phone Number</div>
                  <div className="item-desc">{user.phoneNo || "Not set"}</div>
                </div>
              </div>
              <div className="settings-item static-item">
                <div>
                  <div className="item-label">Account Role</div>
                  <div className="item-desc">{user.role || "CUSTOMER"}</div>
                </div>
              </div>
              <button className="settings-item" onClick={() => setShowPasswordModal(true)}>
                <div>
                  <div className="item-label">Change Password</div>
                  <div className="item-desc">Update your account password securely</div>
                </div>
                <FaLock />
              </button>
            </div>
          </div>

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
                  <div className="item-desc">Permanently remove your account and saved data</div>
                </div>
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        {showProfileModal && (
          <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <h3>Edit Profile</h3>
              <form className="settings-form" onSubmit={handleProfileSubmit}>
                <label className="settings-field">
                  <span>Name</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Phone Number</span>
                  <input
                    value={profileForm.phoneNumber}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))
                    }
                  />
                </label>
                <div className="modal-actions">
                  <button type="button" className="modal-cancel" onClick={() => setShowProfileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-primary" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <h3>Change Password</h3>
              <form className="settings-form" onSubmit={handlePasswordSubmit}>
                <label className="settings-field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                  />
                </label>
                <div className="modal-actions">
                  <button type="button" className="modal-cancel" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-primary" disabled={savingPassword}>
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <h3>Delete Account?</h3>
              <p>This action is <strong>permanent</strong> and cannot be undone. Your account, wishlist, and cart data will be removed.</p>
              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="modal-delete" onClick={handleDeleteAccount} disabled={deletingAccount}>
                  {deletingAccount ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
