import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCloudDownloadAlt,
  FaCreditCard,
  FaDesktop,
  FaEdit,
  FaEnvelope,
  FaGlobeAsia,
  FaGoogle,
  FaHistory,
  FaKey,
  FaLanguage,
  FaLock,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaMoon,
  FaPlus,
  FaShieldAlt,
  FaSignOutAlt,
  FaSms,
  FaSun,
  FaTrash,
  FaUser,
  FaUserSecret,
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

const getSettingsKey = (userId) => `settingsCenter:${userId}`;

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallbackMessage;
};

const defaultSettings = {
  twoFactorEnabled: false,
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true,
  profileVisible: true,
  orderHistoryVisible: false,
  personalizedOffers: true,
  theme: "dark",
  language: "English",
  region: "India",
  connectedAccounts: {
    google: false,
  },
  addresses: [],
  paymentMethods: [
    { id: "upi", label: "UPI", detail: "Add UPI during checkout", type: "UPI" },
    { id: "store", label: "Pay at Store", detail: "Available for eligible orders", type: "Offline" },
  ],
  loginHistory: [],
  devices: [],
};

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => normalizeStoredUser(getStoredUser()));
  const [settings, setSettings] = useState(defaultSettings);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const settingsKey = useMemo(() => (user?.id ? getSettingsKey(user.id) : null), [user?.id]);

  useEffect(() => {
    if (!user?.id || !settingsKey) return;

    try {
      const stored = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      const nextSettings = {
        ...defaultSettings,
        ...stored,
        connectedAccounts: {
          ...defaultSettings.connectedAccounts,
          ...(stored.connectedAccounts || {}),
        },
        paymentMethods: stored.paymentMethods || defaultSettings.paymentMethods,
        loginHistory: stored.loginHistory || [],
        devices: stored.devices || [],
      };

      const currentDevice = {
        id: "current-browser",
        name: "Current browser",
        location: "Recent login",
        active: true,
        lastUsed: new Date().toISOString(),
      };

      const currentLogin = {
        id: `login-${Date.now()}`,
        device: "Current browser",
        location: "Local session",
        time: new Date().toISOString(),
      };

      const devices = [
        currentDevice,
        ...nextSettings.devices.filter((device) => device.id !== currentDevice.id),
      ].slice(0, 4);

      const loginHistory = [currentLogin, ...nextSettings.loginHistory].slice(0, 5);

      setSettings({ ...nextSettings, devices, loginHistory });
      localStorage.setItem(settingsKey, JSON.stringify({ ...nextSettings, devices, loginHistory }));
    } catch {
      setSettings(defaultSettings);
    }
  }, [settingsKey, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    setProfileForm({
      name: user.name || user.username || "",
      email: user.email || "",
      phoneNumber: user.phoneNo || user.phoneNumber || "",
    });
  }, [user]);

  useEffect(() => {
    document.body.classList.toggle("settings-light-mode", settings.theme === "light");
    return () => document.body.classList.remove("settings-light-mode");
  }, [settings.theme]);

  useEffect(() => {
    if (!user?.id) return;

    axios
      .get(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
      .then((response) => {
        const nextUser = normalizeStoredUser(response.data);
        setUser(nextUser);
        setStoredUser(nextUser);
      })
      .catch(() => {});
  }, [user?.id]);

  const persistSettings = (nextSettings, message = "Settings saved.") => {
    setSettings(nextSettings);
    if (settingsKey) {
      localStorage.setItem(settingsKey, JSON.stringify(nextSettings));
    }
    showSuccess(message);
  };

  const updateSetting = (key, value, message) => {
    persistSettings({ ...settings, [key]: value }, message);
  };

  const showSuccess = (message) => {
    setErrorMessage("");
    setStatusMessage(message);
    window.clearTimeout(showSuccess.timeoutId);
    showSuccess.timeoutId = window.setTimeout(() => setStatusMessage(""), 2600);
  };

  const showError = (message) => {
    setStatusMessage("");
    setErrorMessage(message);
    window.clearTimeout(showError.timeoutId);
    showError.timeoutId = window.setTimeout(() => setErrorMessage(""), 3800);
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
      if (response.data.token) localStorage.setItem("token", response.data.token);
      showSuccess("Profile updated successfully.");
    } catch (error) {
      showError(getErrorMessage(error, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
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
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSuccess("Password changed successfully.");
    } catch (error) {
      showError(getErrorMessage(error, "Failed to change password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();

    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.line1.trim()) {
      showError("Receiver name, phone, and address line are required.");
      return;
    }

    const nextAddress = {
      ...addressForm,
      id: editingAddressId || `addr-${Date.now()}`,
    };

    const addresses = editingAddressId
      ? settings.addresses.map((address) => (address.id === editingAddressId ? nextAddress : address))
      : [nextAddress, ...settings.addresses];

    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      name: "",
      phone: "",
      line1: "",
      city: "",
      state: "",
      pincode: "",
    });
    persistSettings({ ...settings, addresses }, editingAddressId ? "Address updated." : "Address added.");
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label || "Home",
      name: address.name || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
    });
  };

  const handleDeleteAddress = (addressId) => {
    persistSettings(
      { ...settings, addresses: settings.addresses.filter((address) => address.id !== addressId) },
      "Address deleted."
    );
  };

  const handleDisconnectDevice = (deviceId) => {
    persistSettings(
      { ...settings, devices: settings.devices.filter((device) => device.id !== deviceId) },
      "Device session removed."
    );
  };

  const handleExportData = () => {
    const exportData = {
      user,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shreenath-user-data-${user.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showSuccess("User data export prepared.");
  };

  const handleLogout = () => {
    document.body.classList.remove("settings-light-mode");
    clearStoredAuth();
    navigate("/login", { state: { resetAuthForm: Date.now() } });
  };

  const handleLogoutAllDevices = () => {
    persistSettings({ ...settings, devices: [] }, "Logged out from all saved device sessions.");
    handleLogout();
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await axios.delete(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() });
      document.body.classList.remove("settings-light-mode");
      clearStoredAuth();
      navigate("/register");
    } catch (error) {
      showError(getErrorMessage(error, "Failed to delete account."));
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
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
    <div className={`settings-page ${settings.theme === "light" ? "light-surface" : "dark-surface"}`}>
      <div className="settings-container">
        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">Account settings</span>
            <h1>Settings</h1>
            <p>Manage profile, security, privacy, devices, payments, and preferences.</p>
          </div>
          <div className="settings-header-user">
            <div className="settings-avatar">{(user.name || user.username || "U")[0].toUpperCase()}</div>
            <div>
              <strong>{user.name || user.username || "Customer"}</strong>
              <span>{user.email || "Email not set"}</span>
            </div>
          </div>
        </header>

        {statusMessage ? <div className="settings-banner success">{statusMessage}</div> : null}
        {errorMessage ? <div className="settings-banner error">{errorMessage}</div> : null}

        <section className="settings-section settings-wide">
          <div className="settings-section-title">
            <FaUser /> Profile Settings
          </div>
          <form className="settings-form settings-inline-form" onSubmit={handleProfileSubmit}>
            <label className="settings-field">
              <span>Name</span>
              <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Email</span>
              <input type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Phone</span>
              <input value={profileForm.phoneNumber} onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
            </label>
            <button type="submit" className="settings-primary-btn" disabled={savingProfile}>
              <FaEdit /> {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-title">
              <FaShieldAlt /> Password & Security
            </div>
            <form className="settings-form" onSubmit={handlePasswordSubmit}>
              <label className="settings-field">
                <span>Current Password</span>
                <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
              </label>
              <label className="settings-field">
                <span>New Password</span>
                <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
              </label>
              <label className="settings-field">
                <span>Confirm Password</span>
                <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
              </label>
              <button type="submit" className="settings-primary-btn" disabled={savingPassword}>
                <FaKey /> {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </form>
            <div className="settings-toggle-row">
              <div>
                <strong>Two-factor authentication (OTP)</strong>
                <span>{settings.twoFactorEnabled ? "OTP verification enabled" : "Add an OTP step during login"}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.twoFactorEnabled}
                  onChange={() => updateSetting("twoFactorEnabled", !settings.twoFactorEnabled, "Two-factor setting updated.")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <FaBell /> Notification Settings
            </div>
            <div className="settings-items">
              {[
                ["emailNotifications", "Email notifications", FaEnvelope],
                ["smsNotifications", "SMS notifications", FaSms],
                ["pushNotifications", "Push notifications", FaMobileAlt],
              ].map(([key, label, Icon]) => (
                <div className="settings-toggle-row" key={key}>
                  <div>
                    <strong><Icon /> {label}</strong>
                    <span>Receive important account and order updates</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={() => updateSetting(key, !settings[key], `${label} updated.`)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="settings-section settings-wide">
          <div className="settings-section-title">
            <FaMapMarkerAlt /> Address Settings
          </div>
          <form className="settings-form settings-address-form" onSubmit={handleAddressSubmit}>
            <input placeholder="Label" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} />
            <input placeholder="Receiver name" value={addressForm.name} onChange={(event) => setAddressForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Phone" value={addressForm.phone} onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))} />
            <input placeholder="Address line" value={addressForm.line1} onChange={(event) => setAddressForm((current) => ({ ...current, line1: event.target.value }))} />
            <input placeholder="City" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} />
            <input placeholder="State" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} />
            <input placeholder="Pincode" value={addressForm.pincode} onChange={(event) => setAddressForm((current) => ({ ...current, pincode: event.target.value }))} />
            <button type="submit" className="settings-primary-btn">
              <FaPlus /> {editingAddressId ? "Update Address" : "Add Address"}
            </button>
          </form>
          <div className="settings-card-grid">
            {settings.addresses.length ? (
              settings.addresses.map((address) => (
                <article className="settings-mini-card" key={address.id}>
                  <strong>{address.label}</strong>
                  <p>{address.name} · {address.phone}</p>
                  <p>{address.line1}, {[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
                  <div className="settings-card-actions">
                    <button onClick={() => handleEditAddress(address)}><FaEdit /> Edit</button>
                    <button onClick={() => handleDeleteAddress(address.id)}><FaTrash /> Delete</button>
                  </div>
                </article>
              ))
            ) : (
              <div className="settings-empty">No saved addresses yet.</div>
            )}
          </div>
        </section>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-title">
              <FaUserSecret /> Privacy Settings
            </div>
            {[
              ["profileVisible", "Manage data visibility", "Allow profile details in customer support tools"],
              ["orderHistoryVisible", "Account privacy options", "Allow order history visibility during support"],
              ["personalizedOffers", "Personalized recommendations", "Use saved activity for product suggestions"],
            ].map(([key, label, desc]) => (
              <div className="settings-toggle-row" key={key}>
                <div>
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => updateSetting(key, !settings[key], "Privacy setting updated.")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <FaCreditCard /> Payment Settings
            </div>
            <div className="settings-card-list">
              {settings.paymentMethods.map((method) => (
                <div className="settings-mini-card compact" key={method.id}>
                  <strong>{method.label}</strong>
                  <p>{method.type} · {method.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-title">
              <FaLanguage /> Language & Region
            </div>
            <div className="settings-select-row">
              <label>
                Language
                <select value={settings.language} onChange={(event) => updateSetting("language", event.target.value, "Language updated.")}>
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Gujarati</option>
                </select>
              </label>
              <label>
                Region
                <select value={settings.region} onChange={(event) => updateSetting("region", event.target.value, "Region updated.")}>
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <FaGlobeAsia /> Theme Settings
            </div>
            <div className="theme-choice-row">
              <button
                className={settings.theme === "light" ? "active" : ""}
                onClick={() => updateSetting("theme", "light", "Light theme enabled.")}
              >
                <FaSun /> Light
              </button>
              <button
                className={settings.theme === "dark" ? "active" : ""}
                onClick={() => updateSetting("theme", "dark", "Dark theme enabled.")}
              >
                <FaMoon /> Dark
              </button>
            </div>
          </section>
        </div>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-title">
              <FaGoogle /> Connected Accounts
            </div>
            <div className="settings-toggle-row">
              <div>
                <strong><FaGoogle /> Google</strong>
                <span>{settings.connectedAccounts.google ? "Connected" : "Not connected"}</span>
              </div>
              <button
                className="settings-secondary-btn"
                onClick={() =>
                  persistSettings(
                    {
                      ...settings,
                      connectedAccounts: {
                        ...settings.connectedAccounts,
                        google: !settings.connectedAccounts.google,
                      },
                    },
                    settings.connectedAccounts.google ? "Google disconnected." : "Google connected."
                  )
                }
              >
                {settings.connectedAccounts.google ? "Disconnect" : "Connect"}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <FaCloudDownloadAlt /> Data Download
            </div>
            <p className="settings-section-copy">Export your profile, preferences, addresses, activity, and device settings as JSON.</p>
            <button className="settings-primary-btn full-width" onClick={handleExportData}>
              <FaCloudDownloadAlt /> Download User Data
            </button>
          </section>
        </div>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-title">
              <FaHistory /> Activity / Login History
            </div>
            <div className="activity-list">
              {settings.loginHistory.map((activity) => (
                <div className="activity-item" key={activity.id}>
                  <span>{activity.device}</span>
                  <strong>{formatDateTime(activity.time)}</strong>
                  <small>{activity.location}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <FaDesktop /> Device Management
            </div>
            <div className="activity-list">
              {settings.devices.map((device) => (
                <div className="activity-item device-item" key={device.id}>
                  <span>{device.name}</span>
                  <strong>{device.active ? "Active session" : "Saved device"}</strong>
                  <small>Last used: {formatDateTime(device.lastUsed)}</small>
                  <button onClick={() => handleDisconnectDevice(device.id)}>Remove</button>
                </div>
              ))}
            </div>
            <button className="settings-secondary-btn full-width" onClick={handleLogoutAllDevices}>
              <FaSignOutAlt /> Logout from all devices
            </button>
          </section>
        </div>

        <section className="settings-section danger-section">
          <div className="settings-section-title danger-title">
            <FaTrash /> Account Removal
          </div>
          <div className="danger-actions">
            <div>
              <strong>Delete account option</strong>
              <p>Permanently remove your account, wishlist, cart, and saved data.</p>
            </div>
            <button className="modal-delete" onClick={() => setShowDeleteConfirm(true)}>
              <FaTrash /> Delete Account
            </button>
          </div>
        </section>

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-box" onClick={(event) => event.stopPropagation()}>
              <h3>Delete Account?</h3>
              <p>This action is permanent and cannot be undone. Your account, wishlist, and cart data will be removed.</p>
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
