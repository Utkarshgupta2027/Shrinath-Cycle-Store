import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaLock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPlus,
  FaShieldAlt,
  FaShoppingBag,
  FaStar,
  FaTag,
  FaTruck,
  FaUniversity,
} from "react-icons/fa";
import { getStoredUser, readStoredJson } from "../utils/auth";
import { trackOrderPlaced } from "../utils/analytics";
import { gaTrackCheckoutStart, gaTrackPurchase } from "../utils/googleAnalytics";
import "../styles/components/CheckoutPopup.css";

const API_BASE = `${API_BASE_URL}/api`;
const DELIVERY_OPTIONS = {
  standard: { label: "Standard Delivery", detail: "2-5 business days", charge: null },
  express: { label: "Express Delivery", detail: "1-2 business days", charge: 199 },
};
const PAYMENT_METHODS = [
  { key: "cod", label: "Cash on Delivery (COD)", icon: <FaMoneyBillWave />, detail: "Pay when your order arrives" },
  { key: "card", label: "Credit / Debit Card", icon: <FaCreditCard />, detail: "Secure card payment" },
  { key: "upi", label: "UPI / Net Banking", icon: <FaUniversity />, detail: "UPI apps, net banking, wallets" },
];

const getAccountKey = (userId, key) => `account:${userId}:${key}`;
const getSettingsKey = (userId) => `settingsCenter:${userId}`;
const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

function CheckoutPopup() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const userId = user?.id;

  const [checkoutMode, setCheckoutMode] = useState(userId ? "login" : "guest");
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    name: user?.name || user?.username || "",
    phone: user?.phoneNo || user?.phoneNumber || "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [locationError, setLocationError] = useState("");
  const [pinStatus, setPinStatus] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [dynamicShippingCharge, setDynamicShippingCharge] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [summary, setSummary] = useState({ subtotal: 0, discountAmount: 0, deliveryCharges: 0, finalTotal: 0 });
  const [pageMessage, setPageMessage] = useState("");

  // Load saved addresses — backend first, localStorage fallback
  const loadSavedAddresses = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const backendAddrs = await res.json();
        if (Array.isArray(backendAddrs) && backendAddrs.length > 0) {
          setSavedAddresses(backendAddrs);
          const def = backendAddrs.find((a) => a.isDefault || a.default) || backendAddrs[0];
          setSelectedAddressId(def.id);
          setAddressForm((prev) => ({ ...prev, ...def }));
          return;
        }
      }
    } catch { /* fall through */ }

    const accountAddresses = readStoredJson(getAccountKey(userId, "addresses"), []);
    const settingsData = readStoredJson(getSettingsKey(userId), {});
    const settingsAddresses = Array.isArray(settingsData.addresses) ? settingsData.addresses : [];
    const merged = [...accountAddresses, ...settingsAddresses].filter(Boolean);
    const unique = merged.filter((a, i, list) => i === list.findIndex((b) => b.id === a.id || b.line1 === a.line1));
    setSavedAddresses(unique);
    if (unique.length > 0) {
      const def = unique.find((a) => a.isDefault || a.default) || unique[0];
      setSelectedAddressId(def.id);
      setAddressForm((prev) => ({ ...prev, ...def }));
    }
  }, [userId]);

  const normalizeCartItems = (cart) => {
    if (!cart?.items) return [];
    return cart.items.map((ci) => ({ ...ci.product, quantity: ci.quantity }));
  };

  // Auto-redirect to /orders after order success alert
  useEffect(() => {
    if (!showAlert) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate("/orders");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showAlert, navigate]);

  const localSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0),
    [cartItems]
  );

  const selectedDeliveryCharge = useMemo(() => {
    if (deliveryOption === "express") return DELIVERY_OPTIONS.express.charge;
    if (dynamicShippingCharge !== null && deliveryOption === "standard") return dynamicShippingCharge;
    return localSubtotal === 0 || localSubtotal >= 2000 ? 0 : 99;
  }, [deliveryOption, dynamicShippingCharge, localSubtotal]);

  const finalTotal = useMemo(
    () => Math.max(localSubtotal - Number(summary.discountAmount || 0) + selectedDeliveryCharge, 0),
    [localSubtotal, selectedDeliveryCharge, summary.discountAmount]
  );

  const deliveryEstimate = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + (deliveryOption === "express" ? 2 : 5));
    return deliveryOption === "express"
      ? `Arrives by ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
      : `Estimated ${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  }, [deliveryOption]);

  const fetchCartSummary = useCallback(async (code = "", items = []) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/cart/summary?${new URLSearchParams({ userId, couponCode: code || "" })}`);
      const data = res.ok ? await res.json() : null;
      if (!data) throw new Error("Summary unavailable");
      setSummary(data);
      setAppliedCoupon(data.couponCode || "");
      if (code) setCouponMessage(data.couponMessage || "");
    } catch {
      // Fallback: call coupon validate API directly
      const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
      try {
        if (code) {
          const valRes = await fetch(`${API_BASE}/coupon/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, userId, subtotal }),
          });
          const v = valRes.ok ? await valRes.json() : { valid: false, discountAmount: 0, appliedCode: "", message: "Coupon validation failed." };
          const deliveryCharges = subtotal === 0 || subtotal >= 2000 ? 0 : 99;
          setSummary({ subtotal, discountAmount: v.discountAmount || 0, deliveryCharges, finalTotal: Math.max(subtotal - (v.discountAmount || 0) + deliveryCharges, 0) });
          setAppliedCoupon(v.appliedCode || "");
          setCouponMessage(v.message || "");
        } else {
          const deliveryCharges = subtotal === 0 || subtotal >= 2000 ? 0 : 99;
          setSummary({ subtotal, discountAmount: 0, deliveryCharges, finalTotal: subtotal + deliveryCharges });
          setAppliedCoupon("");
        }
      } catch {
        const deliveryCharges = subtotal >= 2000 ? 0 : 99;
        setSummary({ subtotal, discountAmount: 0, deliveryCharges, finalTotal: subtotal + deliveryCharges });
        setAppliedCoupon("");
        setCouponMessage(code ? "Coupon validation failed." : "");
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setLoadingCart(false); return; }
    fetch(`${API_BASE}/cart/users/${userId}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch cart"); return res.json(); })
      .then((data) => {
        const items = normalizeCartItems(data);
        setCartItems(items);
        fetchCartSummary("", items);
        // GA4: begin_checkout event after cart loads
        const localSubtotalGA = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        gaTrackCheckoutStart(items, localSubtotalGA);
      })
      .catch(() => setPageMessage("Could not load your cart. Please go back and try again."))
      .finally(() => setLoadingCart(false));
    loadSavedAddresses();
  }, [fetchCartSummary, loadSavedAddresses, userId]);

  // PIN auto-fill + serviceability check + dynamic shipping charge
  useEffect(() => {
    const pin = addressForm.pincode.trim();
    if (pin.length !== 6) { setPinStatus(null); setDynamicShippingCharge(null); return; }
    const timer = setTimeout(async () => {
      setPinLoading(true);
      try {
        const totalWeight = Math.max(cartItems.reduce((s, item) => s + (item.quantity || 1), 0), 1);
        const svcRes = await fetch(`${API_BASE}/shipping/check-pincode?pincode=${pin}`);
        const svcData = svcRes.ok ? await svcRes.json() : null;
        if (svcData?.serviceable) {
          setPinStatus({ serviceable: true, city: svcData.city, state: svcData.state });
          if (svcData.city) setAddressForm((prev) => ({ ...prev, city: prev.city || svcData.city, state: prev.state || svcData.state }));
          const chargeRes = await fetch(`${API_BASE}/shipping/shipping-charge?pincode=${pin}&weight=${totalWeight}`);
          const chargeData = chargeRes.ok ? await chargeRes.json() : null;
          if (chargeData?.charge !== undefined) setDynamicShippingCharge(chargeData.charge);
        } else {
          setPinStatus({ serviceable: false });
          setDynamicShippingCharge(null);
          // Still try India Post for city/state autofill
          const ipRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const ipData = ipRes.ok ? await ipRes.json() : null;
          const post = ipData?.[0]?.PostOffice?.[0];
          if (post) setAddressForm((prev) => ({ ...prev, city: prev.city || post.District || post.Name || "", state: prev.state || post.State || "" }));
        }
      } catch { setPinStatus(null); } finally { setPinLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [addressForm.pincode, cartItems]);

  const getFullAddress = () =>
    [addressForm.name, addressForm.phone, addressForm.line1, addressForm.city, addressForm.state, addressForm.pincode]
      .filter(Boolean).join(", ");

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (address) setAddressForm((prev) => ({ ...prev, ...address }));
  };

  const handleSaveAddress = async () => {
    if (!userId) return;
    if (!addressForm.line1.trim()) { setLocationError("Please enter address details before saving."); return; }
    const nextAddress = { ...addressForm, id: selectedAddressId || `checkout-${Date.now()}` };
    const nextAddresses = [nextAddress, ...savedAddresses.filter((a) => a.id !== nextAddress.id)];
    localStorage.setItem(getAccountKey(userId, "addresses"), JSON.stringify(nextAddresses));
    setSavedAddresses(nextAddresses);
    setSelectedAddressId(nextAddress.id);
    setLocationError("");
    // Also persist to backend
    try {
      const existingBackendId = typeof selectedAddressId === "number" ? selectedAddressId : null;
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` };
      if (existingBackendId) {
        await fetch(`${API_BASE}/addresses/${existingBackendId}`, { method: "PUT", headers, body: JSON.stringify(addressForm) });
      } else {
        await fetch(`${API_BASE}/addresses`, { method: "POST", headers, body: JSON.stringify(addressForm) });
      }
    } catch { /* non-blocking */ }
  };

  const getUserLocation = () => {
    if (!("geolocation" in navigator)) { setLocationError("Geolocation not supported. Please enter your address manually."); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const addr = data.address || {};
          setAddressForm((prev) => ({
            ...prev,
            line1: [addr.house_number, addr.road, addr.suburb || addr.neighbourhood].filter(Boolean).join(", "),
            city: addr.city || addr.town || addr.village || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
          }));
          setLocationError("");
        } catch { setLocationError("Unable to detect location. Please enter your address manually."); }
      },
      () => setLocationError("Location access denied. Please enter your address manually.")
    );
  };

  const handleApplyCoupon = (event) => { event.preventDefault(); fetchCartSummary(couponCode, cartItems); };

  const handleSavePaymentMethod = () => {
    if (!userId || !savePaymentMethod) return;
    const key = getAccountKey(userId, "payments");
    const saved = readStoredJson(key, []);
    const method = PAYMENT_METHODS.find((item) => item.key === paymentMethod);
    if (!method || saved.some((item) => item.id === method.key)) return;
    localStorage.setItem(key, JSON.stringify([...saved, { id: method.key, label: method.label, detail: method.detail, type: method.key.toUpperCase() }]));
  };

  const validateForm = () => {
    if (!addressForm.name.trim()) return "Receiver name is required.";
    if (!addressForm.phone.trim()) return "Phone number is required.";
    if (!addressForm.line1.trim()) return "Address line is required.";
    if (!addressForm.city.trim()) return "City is required.";
    if (!addressForm.state.trim()) return "State is required.";
    if (!addressForm.pincode.trim()) return "Pincode is required.";
    return "";
  };

  const handleConfirm = async () => {
    if (!userId) { navigate("/login"); return; }
    if (cartItems.length === 0) { setPageMessage("Your cart is empty. Add some products first."); navigate("/"); return; }
    const validationError = validateForm();
    if (validationError) {
      setLocationError(validationError);
      document.querySelector(".address-form-grid")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!acceptTerms) { setPageMessage("Please accept the terms and policies before placing your order."); return; }

    const finalAddress = getFullAddress();
    const order = {
      userId,
      items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity || 1 })),
      couponCode: appliedCoupon,
      deliveryOption,
      paymentMethod,
      address: `${finalAddress} | Delivery: ${DELIVERY_OPTIONS[deliveryOption].label} | Payment: ${PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label}`,
    };

    if (paymentMethod !== "cod") { navigate("/makepayment", { state: { order } }); return; }

    setPlacing(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
      if (res.ok) {
        const placedOrder = await res.json().catch(() => null);
        await fetch(`${API_BASE}/cart/clear?userId=${userId}`, { method: "DELETE" }).catch(() => {});
        handleSaveAddress();
        handleSavePaymentMethod();
        const conf = { id: placedOrder?.id || "NEW", total: finalTotal, estimate: deliveryEstimate };
        setConfirmation(conf);
        setCartItems([]);
        trackOrderPlaced(); // analytics: mark this session as buyer
        // GA4: purchase event
        gaTrackPurchase({
          orderId: placedOrder?.id || "NEW",
          total: finalTotal,
          items: cartItems,
          coupon: appliedCoupon || "",
        });
        setShowAlert(true);    // ← trigger the alert dialog + auto-redirect
      } else {
        const errorMessage = await res.text();
        setPageMessage(errorMessage || "Failed to place order. Please try again.");
      }
    } catch { setPageMessage("Network error. Please check your connection."); }
    finally { setPlacing(false); }
  };

  const oneClickCheckout = () => {
    if (savedAddresses.length > 0 && cartItems.length > 0) handleConfirm();
    else setLocationError("Save or select an address before using one-click checkout.");
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to Cart
        </button>

        <header className="checkout-header">
          <div>
            <span className="checkout-eyebrow">Secure checkout</span>
            <h1>Checkout</h1>
            <p>Review delivery, coupons, payment, and policies before placing your order.</p>
          </div>
          <div className="checkout-header-badge"><FaLock /> 256-bit secure order flow</div>
        </header>

        {pageMessage && <div className="coupon-message">{pageMessage}</div>}

        {/* ── Order Success Alert Dialog ── */}
        {showAlert && confirmation && (
          <div className="order-success-overlay" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
            <div className="order-success-dialog">
              <div className="order-success-icon-ring">
                <svg viewBox="0 0 52 52" className="order-success-checkmark">
                  <circle cx="26" cy="26" r="25" fill="none" />
                  <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <h2 id="order-success-title">Order Placed Successfully!</h2>
              <p className="order-success-order-id">Order #{confirmation.id}</p>
              <div className="order-success-details">
                <div>
                  <span>Amount Paid</span>
                  <strong>{formatMoney(confirmation.total)}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>{confirmation.estimate}</strong>
                </div>
              </div>
              <p className="order-success-redirect-note">
                Redirecting to your orders in <strong>{countdown}</strong> second{countdown !== 1 ? "s" : ""}...
              </p>
              <div className="order-success-progress">
                <div
                  className="order-success-progress-bar"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
              <button
                className="order-success-btn"
                onClick={() => navigate("/orders")}
              >
                View My Orders
              </button>
              <button
                className="order-success-close"
                onClick={() => { setShowAlert(false); navigate("/orders"); }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-left">
            {/* ── Login / Guest ── */}
            <section className="checkout-section-card">
              <div className="section-title"><FaShieldAlt className="section-icon" /><h2>Login / Guest Checkout</h2></div>
              <div className="checkout-mode-row">
                <button className={checkoutMode === "login" ? "active" : ""} onClick={() => setCheckoutMode("login")}>Logged-in checkout</button>
                <button className={checkoutMode === "guest" ? "active" : ""} onClick={() => setCheckoutMode("guest")}>Guest checkout</button>
              </div>
              <p className="checkout-note">
                {userId
                  ? `Checking out as ${user?.name || user?.username || "customer"}. One-click checkout is available for saved addresses.`
                  : "Guest checkout can be reviewed here, but login is required to place and track orders."}
              </p>
              {userId && (
                <button className="one-click-btn" onClick={oneClickCheckout} disabled={placing || cartItems.length === 0}>
                  One-click Checkout
                </button>
              )}
            </section>

            {/* ── Delivery Address ── */}
            <section className="checkout-section-card">
              <div className="section-title">
                <FaMapMarkerAlt className="section-icon" />
                <h2>Delivery Address</h2>
                {userId && (
                  <button className="manage-addr-link" onClick={() => navigate("/addresses")}>
                    Manage Addresses
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 && (
                <div className="saved-address-grid">
                  {savedAddresses.map((savedAddress) => (
                    <button
                      key={savedAddress.id}
                      className={`saved-address-card${selectedAddressId === savedAddress.id ? " active" : ""}`}
                      onClick={() => handleSelectAddress(savedAddress.id)}
                    >
                      <div className="saved-addr-label-row">
                        <strong>{savedAddress.label || "Saved Address"}</strong>
                        {(savedAddress.isDefault || savedAddress.default) && (
                          <span className="saved-addr-default"><FaStar /> Default</span>
                        )}
                      </div>
                      <span>{savedAddress.line1}</span>
                      <small>{[savedAddress.city, savedAddress.state, savedAddress.pincode].filter(Boolean).join(", ")}</small>
                    </button>
                  ))}
                </div>
              )}

              {locationError && <p className="location-error">{locationError}</p>}

              {/* PIN serviceability badge */}
              {pinLoading && <div className="pin-checking-msg">Checking PIN serviceability…</div>}
              {!pinLoading && pinStatus && (
                <div className={`pin-status-badge ${pinStatus.serviceable ? "pin-ok" : "pin-bad"}`}>
                  {pinStatus.serviceable
                    ? `✓ PIN ${addressForm.pincode} — Delivery available`
                    : `✗ PIN ${addressForm.pincode} — Not in our delivery zone`}
                </div>
              )}

              <div className="address-form-grid">
                <input placeholder="Label (Home/Office)" value={addressForm.label} onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))} />
                <input placeholder="Receiver name" value={addressForm.name} onChange={(e) => setAddressForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))} />
                <input placeholder="Address line" value={addressForm.line1} onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))} />
                <input placeholder="Pincode (auto-fills city/state)" value={addressForm.pincode} maxLength={6} onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))} />
                <input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))} />
                <input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))} />
              </div>

              <div className="address-actions-row">
                <button className="detect-location-btn" onClick={getUserLocation}><FaMapMarkerAlt /> Auto-fill Address</button>
                <button className="detect-location-btn" onClick={handleSaveAddress} disabled={!userId}><FaPlus /> Save Address</button>
              </div>
            </section>

            {/* ── Order Summary ── */}
            <section className="checkout-section-card">
              <div className="section-title"><FaShoppingBag className="section-icon" /><h2>Order Summary</h2></div>
              {loadingCart ? (
                <p className="checkout-loading">Loading your cart...</p>
              ) : cartItems.length === 0 ? (
                <div className="empty-cart-msg"><p>Your cart is empty.</p><button onClick={() => navigate("/")}>Browse Products</button></div>
              ) : (
                <ul className="checkout-item-list">
                  {cartItems.map((item) => (
                    <li key={item.id} className="checkout-item">
                      <div className="checkout-item-img-wrap">
                        <img src={`${API_BASE}/product/${item.id}/image`} alt={item.name} onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23e8eeff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234f52c8' font-size='9' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"; }} />
                      </div>
                      <div className="checkout-item-details">
                        <h4>{item.name}</h4>
                        <p>Qty: {item.quantity} · Price: {formatMoney(item.price)}</p>
                      </div>
                      <div className="checkout-item-price">{formatMoney(Number(item.price) * item.quantity)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── Delivery Options ── */}
            <section className="checkout-section-card">
              <div className="section-title"><FaTruck className="section-icon" /><h2>Delivery Options</h2></div>
              <div className="delivery-option-grid">
                {Object.entries(DELIVERY_OPTIONS).map(([key, option]) => (
                  <button key={key} className={deliveryOption === key ? "active" : ""} onClick={() => setDeliveryOption(key)}>
                    <strong>{option.label}</strong>
                    <span>{option.detail}</span>
                    <small>
                      {key === "standard"
                        ? selectedDeliveryCharge === 0 ? "Free" : formatMoney(selectedDeliveryCharge)
                        : formatMoney(option.charge)}
                    </small>
                  </button>
                ))}
              </div>
              <p className="delivery-estimate">Real-time delivery estimate: {deliveryEstimate}</p>
              {dynamicShippingCharge !== null && deliveryOption === "standard" && (
                <p className="shipping-charge-note">📦 Shipping charge for PIN {addressForm.pincode}: {formatMoney(dynamicShippingCharge)}</p>
              )}
            </section>

            {/* ── Payment Method ── */}
            <section className="checkout-section-card">
              <div className="section-title"><FaCreditCard className="section-icon" /><h2>Payment Method</h2></div>
              <div className="payment-method-grid">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method.key} className={paymentMethod === method.key ? "active" : ""} onClick={() => setPaymentMethod(method.key)}>
                    {method.icon}<strong>{method.label}</strong><span>{method.detail}</span>
                  </button>
                ))}
              </div>
              <label className="save-payment-row">
                <input type="checkbox" checked={savePaymentMethod} onChange={() => setSavePaymentMethod((v) => !v)} />
                Save payment method for faster checkout
              </label>
            </section>
          </div>

          {/* ── Price Breakdown ── */}
          <aside className="checkout-right">
            <div className="order-summary-card">
              <h2>Price Breakdown</h2>
              <form className="coupon-form" onSubmit={handleApplyCoupon}>
                <input placeholder="Apply coupon / promo code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <button type="submit"><FaTag /> Apply</button>
              </form>
              {couponMessage && <p className="coupon-message">{couponMessage}</p>}
              <div className="summary-lines">
                <div className="summary-line"><span>Subtotal ({cartItems.length} items)</span><span>{formatMoney(localSubtotal)}</span></div>
                <div className="summary-line discount-line"><span>Discount {appliedCoupon ? `(${appliedCoupon})` : ""}</span><span>- {formatMoney(summary.discountAmount)}</span></div>
                <div className="summary-line">
                  <span>Delivery charges</span>
                  <span className={selectedDeliveryCharge === 0 ? "free-delivery" : ""}>
                    {selectedDeliveryCharge === 0 ? "FREE" : formatMoney(selectedDeliveryCharge)}
                  </span>
                </div>
                <div className="summary-line total-line"><span>Final total amount</span><span>{formatMoney(finalTotal)}</span></div>
              </div>
              <label className="terms-row">
                <input type="checkbox" checked={acceptTerms} onChange={() => setAcceptTerms((v) => !v)} />
                I agree to terms, return policy, warranty policy, and delivery terms.
              </label>
              <button className="confirm-order-btn" onClick={handleConfirm} disabled={placing || loadingCart || cartItems.length === 0}>
                {placing ? "Placing Order..." : "Place Order"}
              </button>
              <div className="secure-badges">
                <span><FaLock /> Secure payment</span>
                <span><FaShieldAlt /> Buyer protection</span>
                <span><FaCheckCircle /> Order confirmation</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPopup;
