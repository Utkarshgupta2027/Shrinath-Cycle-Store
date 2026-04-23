import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBoxOpen,
  FaCreditCard,
  FaEdit,
  FaEnvelope,
  FaFileInvoice,
  FaHeadset,
  FaHeart,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaQuestionCircle,
  FaRedoAlt,
  FaShieldAlt,
  FaShippingFast,
  FaSignInAlt,
  FaSignOutAlt,
  FaTrash,
  FaUndoAlt,
  FaUserCircle,
  FaUserShield,
} from "react-icons/fa";
import {
  clearStoredAuth,
  getAuthHeaders,
  getStoredUser,
  isAdminUser,
  normalizeStoredUser,
  setStoredUser,
} from "../utils/auth";
import "../styles/components/userAccount.css";

const API_BASE = "http://localhost:8080";

const getAccountStorageKey = (userId, key) => `account:${userId}:${key}`;

const readStoredList = (userId, key, fallback) => {
  if (!userId) return fallback;

  try {
    const stored = JSON.parse(localStorage.getItem(getAccountStorageKey(userId, key)) || "null");
    return Array.isArray(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
};

export default function UserAccount() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => normalizeStoredUser(getStoredUser()));
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    offers: true,
    priceDrops: true,
  });
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

  const userId = user?.id;
  const defaultAddress = useMemo(
    () => ({
      id: "default-store-support",
      label: "Default",
      name: user?.name || user?.username || "Customer",
      phone: user?.phoneNo || user?.phoneNumber || "",
      line1: "Add your delivery address for faster checkout",
      city: "Not set",
      state: "",
      pincode: "",
      locked: true,
    }),
    [user]
  );

  useEffect(() => {
    if (!user?.id) return;

    setProfileForm({
      name: user.name || user.username || "",
      email: user.email || "",
      phoneNumber: user.phoneNo || user.phoneNumber || "",
    });

    const savedAddresses = readStoredList(user.id, "addresses", []);
    setAddresses(savedAddresses.length ? savedAddresses : [defaultAddress]);
    setPaymentMethods(
      readStoredList(user.id, "payments", [
        { id: "upi", label: "UPI", detail: "Add UPI during checkout", default: true },
        { id: "cod", label: "Cash / Pay at Store", detail: "Available for eligible orders", default: false },
      ])
    );

    try {
      const savedNotifications = JSON.parse(
        localStorage.getItem(getAccountStorageKey(user.id, "notifications")) || "null"
      );
      if (savedNotifications) {
        setNotifications({
          orderUpdates: savedNotifications.orderUpdates ?? true,
          offers: savedNotifications.offers ?? true,
          priceDrops: savedNotifications.priceDrops ?? true,
        });
      }
    } catch {
      setNotifications({ orderUpdates: true, offers: true, priceDrops: true });
    }
  }, [defaultAddress, user]);

  useEffect(() => {
    if (!userId) return;

    setOrdersLoading(true);
    fetch(`${API_BASE}/api/orders/user/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [userId]);

  const showSuccess = (text) => {
    setError("");
    setMessage(text);
    window.clearTimeout(showSuccess.timeoutId);
    showSuccess.timeoutId = window.setTimeout(() => setMessage(""), 2800);
  };

  const showError = (text) => {
    setMessage("");
    setError(text);
    window.clearTimeout(showError.timeoutId);
    showError.timeoutId = window.setTimeout(() => setError(""), 3600);
  };

  const persistAddresses = (nextAddresses) => {
    const cleanAddresses = nextAddresses.filter((address) => !address.locked);
    setAddresses(nextAddresses.length ? nextAddresses : [defaultAddress]);
    localStorage.setItem(getAccountStorageKey(userId, "addresses"), JSON.stringify(cleanAddresses));
  };

  const persistNotifications = (nextNotifications) => {
    setNotifications(nextNotifications);
    localStorage.setItem(getAccountStorageKey(userId, "notifications"), JSON.stringify(nextNotifications));
    showSuccess("Notification settings saved.");
  };

  const handleLogout = () => {
    clearStoredAuth();
    navigate("/login", { state: { resetAuthForm: Date.now() } });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!profileForm.name.trim() || !profileForm.email.trim() || !profileForm.phoneNumber.trim()) {
      showError("Name, email, and phone are required.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE}/api/auth/me/profile`,
        {
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phoneNumber: profileForm.phoneNumber.trim(),
        },
        { headers: getAuthHeaders() }
      );

      const nextUser = normalizeStoredUser(response.data.user);
      setUser(nextUser);
      setStoredUser(nextUser);
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      setShowProfileForm(false);
      showSuccess("Profile updated successfully.");
    } catch (err) {
      const fallbackUser = {
        ...user,
        name: profileForm.name.trim(),
        username: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phoneNo: profileForm.phoneNumber.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
      };
      setUser(fallbackUser);
      setStoredUser(fallbackUser);
      setShowProfileForm(false);
      showError(getErrorMessage(err, "Saved profile locally. Login token may be required for backend update."));
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
      await axios.put(
        `${API_BASE}/api/auth/me/password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        { headers: getAuthHeaders() }
      );
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
      showSuccess("Password changed successfully.");
    } catch (err) {
      showError(getErrorMessage(err, "Failed to change password."));
    }
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();

    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.line1.trim()) {
      showError("Address name, phone, and address line are required.");
      return;
    }

    const nextAddress = {
      ...addressForm,
      id: editingAddressId || `addr-${Date.now()}`,
    };

    const unlockedAddresses = addresses.filter((address) => !address.locked);
    const nextAddresses = editingAddressId
      ? addresses.map((address) => (address.id === editingAddressId ? nextAddress : address))
      : [nextAddress, ...unlockedAddresses];

    persistAddresses(nextAddresses);
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
    showSuccess(editingAddressId ? "Address updated." : "Address added.");
  };

  const handleEditAddress = (address) => {
    if (address.locked) return;
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
    const nextAddresses = addresses.filter((address) => address.id !== addressId);
    persistAddresses(nextAddresses.length ? nextAddresses : [defaultAddress]);
    showSuccess("Address deleted.");
  };

  const latestOrders = orders.slice(0, 3);

  if (!user) {
    return (
      <div className="user-account-page">
        <div className="account-container">
          <div className="account-login-card">
            <FaUserCircle />
            <h1>My Account</h1>
            <p>Please login to view your profile, orders, addresses, and support options.</p>
            <button className="account-primary-btn" onClick={() => navigate("/login")}>
              <FaSignInAlt /> Login to your account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-account-page">
      <div className="account-container">
        <header className="account-hero">
          <div className="account-avatar">
            {(user.name || user.username || "U")[0].toUpperCase()}
          </div>
          <div className="account-hero-info">
            <span className="account-eyebrow">My Account</span>
            <h1>{user.name || user.username || "Customer"}</h1>
            <p><FaEnvelope /> {user.email || "Email not set"}</p>
            <p><FaPhoneAlt /> {user.phoneNo || user.phoneNumber || "Phone not set"}</p>
          </div>
          <div className="account-hero-actions">
            <button className="account-primary-btn" onClick={() => setShowProfileForm((value) => !value)}>
              <FaEdit /> Edit Profile
            </button>
            <button className="account-secondary-btn" onClick={() => setShowPasswordForm((value) => !value)}>
              <FaLock /> Change Password
            </button>
          </div>
        </header>

        {message && <div className="account-message success">{message}</div>}
        {error && <div className="account-message error">{error}</div>}

        {showProfileForm && (
          <section className="account-panel">
            <div className="account-section-title">
              <h2>Edit Profile</h2>
              <span>Update your basic profile details</span>
            </div>
            <form className="account-form grid-form" onSubmit={handleProfileSubmit}>
              <label>
                Name
                <input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
              </label>
              <label>
                Email
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
              </label>
              <label>
                Phone
                <input value={profileForm.phoneNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} />
              </label>
              <button className="account-primary-btn" type="submit">Save Profile</button>
            </form>
          </section>
        )}

        {showPasswordForm && (
          <section className="account-panel">
            <div className="account-section-title">
              <h2>Change Password</h2>
              <span>Keep your account secure</span>
            </div>
            <form className="account-form grid-form" onSubmit={handlePasswordSubmit}>
              <label>
                Current Password
                <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              </label>
              <label>
                New Password
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
              </label>
              <label>
                Confirm Password
                <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
              </label>
              <button className="account-primary-btn" type="submit">Update Password</button>
            </form>
          </section>
        )}

        <section className="account-grid">
          <article className="account-panel">
            <div className="account-section-title">
              <h2>Personal Details</h2>
              <span>Name, phone, email</span>
            </div>
            <div className="personal-details-list">
              <div><span>Name</span><strong>{user.name || user.username || "Not set"}</strong></div>
              <div><span>Phone</span><strong>{user.phoneNo || user.phoneNumber || "Not set"}</strong></div>
              <div><span>Email</span><strong>{user.email || "Not set"}</strong></div>
              <div><span>Role</span><strong className="account-role">{user.role || "CUSTOMER"}</strong></div>
            </div>
          </article>

          <article className="account-panel shortcut-panel">
            <div className="account-section-title">
              <h2>Quick Shortcuts</h2>
              <span>Fast access</span>
            </div>
            <Link to="/wishlist" className="shortcut-card"><FaHeart /> Wishlist shortcut</Link>
            <Link to="/orders" className="shortcut-card"><FaBoxOpen /> Full order history</Link>
            {isAdminUser(user) && <Link to="/admin" className="shortcut-card"><FaUserShield /> Admin Panel</Link>}
          </article>
        </section>

        <section className="account-panel">
          <div className="account-section-title">
            <h2>Address Management</h2>
            <span>Add, edit, or delete delivery addresses</span>
          </div>

          <form className="account-form address-form" onSubmit={handleAddressSubmit}>
            <input placeholder="Label e.g. Home" value={addressForm.label} onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))} />
            <input placeholder="Receiver name" value={addressForm.name} onChange={(e) => setAddressForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input placeholder="Address line" value={addressForm.line1} onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))} />
            <input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))} />
            <input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))} />
            <input placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))} />
            <button className="account-primary-btn" type="submit">
              <FaPlus /> {editingAddressId ? "Update Address" : "Add New Address"}
            </button>
          </form>

          <div className="address-list">
            {addresses.map((address) => (
              <div className="address-card" key={address.id}>
                <div>
                  <span className="address-label"><FaMapMarkerAlt /> {address.label}</span>
                  <h3>{address.name}</h3>
                  <p>{address.line1}</p>
                  <p>{[address.city, address.state, address.pincode].filter(Boolean).join(", ") || "Location not set"}</p>
                  <p>{address.phone}</p>
                </div>
                {!address.locked && (
                  <div className="address-actions">
                    <button onClick={() => handleEditAddress(address)}><FaEdit /> Edit</button>
                    <button onClick={() => handleDeleteAddress(address.id)}><FaTrash /> Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="account-panel">
          <div className="account-section-title">
            <h2>My Orders</h2>
            <span>Order history, status, tracking, invoice</span>
          </div>

          {ordersLoading ? (
            <div className="account-empty-inline">Loading orders...</div>
          ) : latestOrders.length > 0 ? (
            <div className="account-order-list">
              {latestOrders.map((order) => (
                <article className="account-order-card" key={order.id}>
                  <div>
                    <span className="order-number">Order #{order.id}</span>
                    <strong>{order.status || "PLACED"}</strong>
                    <p>Total: Rs. {Number(order.totalAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="order-detail-actions">
                    <span><FaShippingFast /> Tracking: TRK-{order.id}-SC</span>
                    <span><FaFileInvoice /> Invoice ready</span>
                    <button onClick={() => navigate("/orders")}>View Details</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="account-empty-inline">No orders yet. Your order history will appear here.</div>
          )}
        </section>

        <section className="account-grid">
          <article className="account-panel">
            <div className="account-section-title">
              <h2>Saved Payment Methods</h2>
              <span>Optional checkout helpers</span>
            </div>
            <div className="payment-list">
              {paymentMethods.map((method) => (
                <div className="payment-card" key={method.id}>
                  <FaCreditCard />
                  <div>
                    <strong>{method.label}</strong>
                    <p>{method.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="account-panel">
            <div className="account-section-title">
              <h2>Notifications / Alerts</h2>
              <span>Choose what we should send</span>
            </div>
            {[
              ["orderUpdates", "Order status updates"],
              ["offers", "Offers and coupons"],
              ["priceDrops", "Wishlist price drop alerts"],
            ].map(([key, label]) => (
              <label className="notification-toggle" key={key}>
                <span><FaBell /> {label}</span>
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={() => persistNotifications({ ...notifications, [key]: !notifications[key] })}
                />
              </label>
            ))}
          </article>
        </section>

        <section className="account-grid">
          <article className="account-panel service-panel">
            <FaUndoAlt />
            <h2>Returns & Refunds</h2>
            <p>Request return support within eligible return windows. Refunds are processed after item inspection.</p>
            <button onClick={() => navigate("/orders")} className="account-secondary-btn">
              <FaRedoAlt /> View return eligible orders
            </button>
          </article>

          <article className="account-panel service-panel">
            <FaHeadset />
            <h2>Help & Support</h2>
            <p>Need help with orders, warranty, payment, or delivery? Contact Shreenath Cycle Store.</p>
            <a href="tel:+917052050415" className="account-secondary-btn">
              <FaQuestionCircle /> Call +91 70520 50415
            </a>
          </article>
        </section>

        <section className="logout-section">
          <div>
            <FaShieldAlt />
            <span>Secure account controls</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </section>
      </div>
    </div>
  );
}
