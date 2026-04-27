import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FaTag,
  FaTruck,
  FaUniversity,
} from "react-icons/fa";
import { getStoredUser, readStoredJson } from "../utils/auth";
import "../styles/components/CheckoutPopup.css";

const API_BASE = "http://localhost:8080/api";
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
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [summary, setSummary] = useState({
    subtotal: 0,
    discountAmount: 0,
    deliveryCharges: 0,
    finalTotal: 0,
  });
  const [pageMessage, setPageMessage] = useState("");

  const loadSavedAddresses = useCallback(() => {
    if (!userId) return;

    const accountAddresses = readStoredJson(getAccountKey(userId, "addresses"), []);
    const settingsData = readStoredJson(getSettingsKey(userId), {});
    const settingsAddresses = Array.isArray(settingsData.addresses) ? settingsData.addresses : [];
    const merged = [...accountAddresses, ...settingsAddresses].filter(Boolean);
    const unique = merged.filter((address, index, list) => (
      index === list.findIndex((item) => item.id === address.id || item.line1 === address.line1)
    ));

    setSavedAddresses(unique);
    if (unique.length > 0) {
      setSelectedAddressId(unique[0].id);
      setAddressForm((prev) => ({ ...prev, ...unique[0] }));
    }
  }, [userId]);

  const normalizeCartItems = (cart) => {
    if (!cart?.items) return [];
    return cart.items.map((ci) => ({
      ...ci.product,
      quantity: ci.quantity,
    }));
  };

  const localSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0),
    [cartItems]
  );

  const selectedDeliveryCharge = useMemo(() => {
    if (deliveryOption === "express") return DELIVERY_OPTIONS.express.charge;
    return localSubtotal === 0 || localSubtotal >= 2000 ? 0 : 99;
  }, [deliveryOption, localSubtotal]);

  const finalTotal = useMemo(() => {
    return Math.max(localSubtotal - Number(summary.discountAmount || 0) + selectedDeliveryCharge, 0);
  }, [localSubtotal, selectedDeliveryCharge, summary.discountAmount]);

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
      const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
      const normalizedCode = code.trim().toUpperCase();
      const discountAmount = normalizedCode === "RIDE10" && subtotal >= 1000 ? Math.round(subtotal * 0.1) : 0;
      setSummary({
        subtotal,
        discountAmount,
        deliveryCharges: subtotal >= 2000 ? 0 : 99,
        finalTotal: subtotal - discountAmount + (subtotal >= 2000 ? 0 : 99),
      });
      setAppliedCoupon(discountAmount ? normalizedCode : "");
      setCouponMessage(discountAmount ? "RIDE10 applied successfully." : "Coupon not applied.");
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoadingCart(false);
      return;
    }

    fetch(`${API_BASE}/cart/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cart");
        return res.json();
      })
      .then((data) => {
        const items = normalizeCartItems(data);
        setCartItems(items);
        fetchCartSummary("", items);
      })
      .catch(() => setPageMessage("Could not load your cart. Please go back and try again."))
      .finally(() => setLoadingCart(false));

    loadSavedAddresses();
  }, [fetchCartSummary, loadSavedAddresses, userId]);

  const getFullAddress = () => {
    return [
      addressForm.name,
      addressForm.phone,
      addressForm.line1,
      addressForm.city,
      addressForm.state,
      addressForm.pincode,
    ].filter(Boolean).join(", ");
  };

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (address) {
      setAddressForm((prev) => ({ ...prev, ...address }));
    }
  };

  const handleSaveAddress = () => {
    if (!userId) return;
    if (!addressForm.line1.trim()) {
      setLocationError("Please enter address details before saving.");
      return;
    }

    const nextAddress = { ...addressForm, id: selectedAddressId || `checkout-${Date.now()}` };
    const nextAddresses = [
      nextAddress,
      ...savedAddresses.filter((address) => address.id !== nextAddress.id),
    ];

    localStorage.setItem(getAccountKey(userId, "addresses"), JSON.stringify(nextAddresses));
    setSavedAddresses(nextAddresses);
    setSelectedAddressId(nextAddress.id);
    setLocationError("");
  };

  const getUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation not supported. Please enter your address manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
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
        } catch {
          setLocationError("Unable to detect location. Please enter your address manually.");
        }
      },
      () => setLocationError("Location access denied. Please enter your address manually.")
    );
  };

  const handleApplyCoupon = (event) => {
    event.preventDefault();
    fetchCartSummary(couponCode, cartItems);
  };

  const handleSavePaymentMethod = () => {
    if (!userId || !savePaymentMethod) return;
    const key = getAccountKey(userId, "payments");
    const saved = readStoredJson(key, []);
    const method = PAYMENT_METHODS.find((item) => item.key === paymentMethod);
    if (!method || saved.some((item) => item.id === method.key)) return;

    localStorage.setItem(
      key,
      JSON.stringify([
        ...saved,
        { id: method.key, label: method.label, detail: method.detail, type: method.key.toUpperCase() },
      ])
    );
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
    if (!userId) {
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      setPageMessage("Your cart is empty. Add some products first.");
      navigate("/");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setLocationError(validationError);
      // Scroll to address section if needed or just show error
      const element = document.querySelector(".address-form-grid");
      if (element) element.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!acceptTerms) {
      setPageMessage("Please accept the terms and policies before placing your order.");
      return;
    }

    const finalAddress = getFullAddress();
    const order = {
      userId,
      totalAmount: finalTotal,
      items: cartItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
      address: `${finalAddress} | Delivery: ${DELIVERY_OPTIONS[deliveryOption].label} | Payment: ${PAYMENT_METHODS.find((method) => method.key === paymentMethod)?.label}`,
    };

    // If not COD, go to MakePayment page
    if (paymentMethod !== "cod") {
      navigate("/makepayment", { state: { order } });
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        const placedOrder = await res.json().catch(() => null);
        await fetch(`${API_BASE}/cart/clear?userId=${userId}`, { method: "DELETE" }).catch(() => {});
        handleSaveAddress();
        handleSavePaymentMethod();
        setConfirmation({
          id: placedOrder?.id || "NEW",
          total: finalTotal,
          estimate: deliveryEstimate,
        });
        setCartItems([]);
      } else {
        const errorMessage = await res.text();
        setPageMessage(errorMessage || "Failed to place order. Please try again.");
      }
    } catch {
      setPageMessage("Network error. Please check your connection.");
    } finally {
      setPlacing(false);
    }
  };

  const oneClickCheckout = () => {
    if (savedAddresses.length > 0 && cartItems.length > 0) {
      handleConfirm();
    } else {
      setLocationError("Save or select an address before using one-click checkout.");
    }
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
          <div className="checkout-header-badge">
            <FaLock /> 256-bit secure order flow
          </div>
        </header>

        {pageMessage && <div className="coupon-message">{pageMessage}</div>}

        {confirmation && (
          <div className="order-confirmation">
            <FaCheckCircle />
            <div>
              <h2>Order placed successfully!</h2>
              <p>Order #{confirmation.id} is confirmed. Total paid: {formatMoney(confirmation.total)}. {confirmation.estimate}.</p>
              <button onClick={() => navigate("/orders")}>View My Orders</button>
            </div>
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-left">
            <section className="checkout-section-card">
              <div className="section-title">
                <FaShieldAlt className="section-icon" />
                <h2>Login / Guest Checkout</h2>
              </div>
              <div className="checkout-mode-row">
                <button className={checkoutMode === "login" ? "active" : ""} onClick={() => setCheckoutMode("login")}>
                  Logged-in checkout
                </button>
                <button className={checkoutMode === "guest" ? "active" : ""} onClick={() => setCheckoutMode("guest")}>
                  Guest checkout
                </button>
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

            <section className="checkout-section-card">
              <div className="section-title">
                <FaMapMarkerAlt className="section-icon" />
                <h2>Delivery Address</h2>
              </div>

              {savedAddresses.length > 0 && (
                <div className="saved-address-grid">
                  {savedAddresses.map((savedAddress) => (
                    <button
                      key={savedAddress.id}
                      className={`saved-address-card${selectedAddressId === savedAddress.id ? " active" : ""}`}
                      onClick={() => handleSelectAddress(savedAddress.id)}
                    >
                      <strong>{savedAddress.label || "Saved Address"}</strong>
                      <span>{savedAddress.line1}</span>
                      <small>{[savedAddress.city, savedAddress.state, savedAddress.pincode].filter(Boolean).join(", ")}</small>
                    </button>
                  ))}
                </div>
              )}

              {locationError && <p className="location-error">{locationError}</p>}

              <div className="address-form-grid">
                <input placeholder="Label" value={addressForm.label} onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))} />
                <input placeholder="Receiver name" value={addressForm.name} onChange={(e) => setAddressForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))} />
                <input placeholder="Address line" value={addressForm.line1} onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))} />
                <input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))} />
                <input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))} />
                <input placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))} />
              </div>

              <div className="address-actions-row">
                <button className="detect-location-btn" onClick={getUserLocation}>
                  <FaMapMarkerAlt /> Auto-fill Address
                </button>
                <button className="detect-location-btn" onClick={handleSaveAddress} disabled={!userId}>
                  <FaPlus /> Add New Address
                </button>
              </div>
            </section>

            <section className="checkout-section-card">
              <div className="section-title">
                <FaShoppingBag className="section-icon" />
                <h2>Order Summary</h2>
              </div>

              {loadingCart ? (
                <p className="checkout-loading">Loading your cart...</p>
              ) : cartItems.length === 0 ? (
                <div className="empty-cart-msg">
                  <p>Your cart is empty.</p>
                  <button onClick={() => navigate("/")}>Browse Products</button>
                </div>
              ) : (
                <ul className="checkout-item-list">
                  {cartItems.map((item) => (
                    <li key={item.id} className="checkout-item">
                      <div className="checkout-item-img-wrap">
                        <img src={`${API_BASE}/product/${item.id}/image`} alt={item.name} onError={(e) => { e.target.src = "https://via.placeholder.com/80"; }} />
                      </div>
                      <div className="checkout-item-details">
                        <h4>{item.name}</h4>
                        <p>Qty: {item.quantity} · Price: {formatMoney(item.price)}</p>
                      </div>
                      <div className="checkout-item-price">
                        {formatMoney(Number(item.price) * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="checkout-section-card">
              <div className="section-title">
                <FaTruck className="section-icon" />
                <h2>Delivery Options</h2>
              </div>
              <div className="delivery-option-grid">
                {Object.entries(DELIVERY_OPTIONS).map(([key, option]) => (
                  <button
                    key={key}
                    className={deliveryOption === key ? "active" : ""}
                    onClick={() => setDeliveryOption(key)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.detail}</span>
                    <small>{key === "standard" ? (selectedDeliveryCharge === 0 ? "Free" : "Rs. 99") : formatMoney(option.charge)}</small>
                  </button>
                ))}
              </div>
              <p className="delivery-estimate">Real-time delivery estimate: {deliveryEstimate}</p>
            </section>

            <section className="checkout-section-card">
              <div className="section-title">
                <FaCreditCard className="section-icon" />
                <h2>Payment Method</h2>
              </div>
              <div className="payment-method-grid">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.key}
                    className={paymentMethod === method.key ? "active" : ""}
                    onClick={() => setPaymentMethod(method.key)}
                  >
                    {method.icon}
                    <strong>{method.label}</strong>
                    <span>{method.detail}</span>
                  </button>
                ))}
              </div>
              <label className="save-payment-row">
                <input type="checkbox" checked={savePaymentMethod} onChange={() => setSavePaymentMethod((value) => !value)} />
                Save payment method for faster checkout
              </label>
            </section>
          </div>

          <aside className="checkout-right">
            <div className="order-summary-card">
              <h2>Price Breakdown</h2>

              <form className="coupon-form" onSubmit={handleApplyCoupon}>
                <input placeholder="Apply coupon / promo code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <button type="submit"><FaTag /> Apply</button>
              </form>
              {couponMessage && <p className="coupon-message">{couponMessage}</p>}

              <div className="summary-lines">
                <div className="summary-line">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>{formatMoney(localSubtotal)}</span>
                </div>
                <div className="summary-line discount-line">
                  <span>Discount {appliedCoupon ? `(${appliedCoupon})` : ""}</span>
                  <span>- {formatMoney(summary.discountAmount)}</span>
                </div>
                <div className="summary-line">
                  <span>Delivery charges</span>
                  <span className={selectedDeliveryCharge === 0 ? "free-delivery" : ""}>
                    {selectedDeliveryCharge === 0 ? "FREE" : formatMoney(selectedDeliveryCharge)}
                  </span>
                </div>
                <div className="summary-line total-line">
                  <span>Final total amount</span>
                  <span>{formatMoney(finalTotal)}</span>
                </div>
              </div>

              <label className="terms-row">
                <input type="checkbox" checked={acceptTerms} onChange={() => setAcceptTerms((value) => !value)} />
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
