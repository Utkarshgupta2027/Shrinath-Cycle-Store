import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaCreditCard,
  FaExclamationTriangle,
  FaFileInvoice,
  FaGooglePay,
  FaLock,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaMoneyBillWave,
  FaQrcode,
  FaReceipt,
  FaRedoAlt,
  FaShieldAlt,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import { getStoredUser, readStoredJson } from "../utils/auth";
import { copyTextToClipboard, downloadBlob } from "../utils/browser";
import "../styles/components/MakePayment.css";

const API_BASE = "http://localhost:8080/api";
const WALLET_BALANCE = 1200;
const COD_LIMIT = 50000;
const HIGH_VALUE_EMI_THRESHOLD = 30000;

const getAccountKey = (userId, key) => `account:${userId}:${key}`;

const PAYMENT_METHODS = [
  {
    key: "upi",
    label: "UPI",
    icon: <FaGooglePay />,
    hint: "Google Pay, PhonePe, Paytm, BHIM",
    description: "Fastest checkout with UPI ID or QR",
  },
  {
    key: "card",
    label: "Credit / Debit Card",
    icon: <FaCreditCard />,
    hint: "Visa, RuPay, Mastercard",
    description: "Use card number, expiry, and CVV",
  },
  {
    key: "netbanking",
    label: "Net Banking",
    icon: <FaUniversity />,
    hint: "Major Indian banks supported",
    description: "Redirect to your bank securely",
  },
  {
    key: "cod",
    label: "Cash on Delivery",
    icon: <FaMoneyBillWave />,
    hint: "Available on eligible orders",
    description: "Pay when the bicycle is delivered",
  },
];

const BANK_OPTIONS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank"];
const GATEWAYS = ["Razorpay", "Stripe", "PayPal"];
const EMI_OPTIONS = ["3 months", "6 months", "9 months", "12 months"];
const BILLING_DEFAULT = {
  fullName: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeCartItems = (cart) => {
  if (!cart?.items) return [];
  return cart.items.map((ci) => ({
    ...ci.product,
    quantity: ci.quantity,
  }));
};

const maskCardNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "Saved card";
  return `•••• •••• •••• ${digits.slice(-4)}`;
};

function MakePayment() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const location = useLocation();
  const orderFromState = location.state?.order;
  const userId = user?.id;

  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [message, setMessage] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [gateway, setGateway] = useState("Razorpay");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [saveMethod, setSaveMethod] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [paymentState, setPaymentState] = useState("idle");
  const [result, setResult] = useState(null);
  const [savedMethods, setSavedMethods] = useState([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    label: "Home",
    fullName: user?.name || user?.username || "",
    phone: user?.phoneNo || user?.phoneNumber || "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [billingAddress, setBillingAddress] = useState({
    ...BILLING_DEFAULT,
    fullName: user?.name || user?.username || "",
  });
  const [details, setDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    upiId: "",
    bank: BANK_OPTIONS[0],
    useQr: true,
    emiPlan: EMI_OPTIONS[1],
  });

  useEffect(() => {
    if (!userId) {
      setLoadingCart(false);
      setMessage("Please login to complete payment.");
      return;
    }

    if (!orderFromState) {
      setMessage("No order details found. Redirecting to cart...");
      setTimeout(() => navigate("/cart"), 2000);
      return;
    }

    const savedAddressList = readStoredJson(getAccountKey(userId, "addresses"), []);
    if (savedAddressList.length > 0) {
      const primary = savedAddressList[0];
      setDeliveryAddress({
        label: primary.label || "Home",
        fullName: primary.name || user?.name || user?.username || "",
        phone: primary.phone || user?.phoneNo || user?.phoneNumber || "",
        line1: primary.line1 || "",
        city: primary.city || "",
        state: primary.state || "",
        pincode: primary.pincode || "",
      });
    }

    const storedMethods = readStoredJson(getAccountKey(userId, "payments"), []);
    const normalizedMethods = storedMethods.map((method) => ({
      id: method.id,
      label: method.label,
      detail: method.detail,
      type: (method.type || method.id || "UPI").toLowerCase(),
    }));
    setSavedMethods(normalizedMethods);
    if (normalizedMethods.length > 0) {
      setSelectedSavedMethod(normalizedMethods[0].id);
    }

    fetch(`${API_BASE}/cart/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load cart");
        return res.json();
      })
      .then((data) => {
        setCartItems(normalizeCartItems(data));
      })
      .catch(() => {
        setMessage("Could not load your cart right now. Check backend connection.");
      })
      .finally(() => setLoadingCart(false));
  }, [user?.name, user?.phoneNo, user?.phoneNumber, user?.username, userId]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [cartItems]
  );

  const couponDiscount = useMemo(() => {
    const normalized = appliedCoupon.trim().toUpperCase();
    if (normalized === "RIDE10" && subtotal >= 1000) return Math.round(subtotal * 0.1);
    if (normalized === "BIKE500" && subtotal >= 15000) return 500;
    return 0;
  }, [appliedCoupon, subtotal]);

  const walletApplied = useMemo(() => {
    if (!useWallet) return 0;
    return Math.min(WALLET_BALANCE, Math.max(subtotal - couponDiscount, 0));
  }, [couponDiscount, subtotal, useWallet]);

  const convenienceFee = selectedMethod === "card" ? 49 : 0;
  const deliveryFee = subtotal === 0 || subtotal >= 2000 ? 0 : 99;
  
  // Use amount from order state if available to ensure consistency
  const totalPayable = orderFromState?.totalAmount || Math.max(subtotal - couponDiscount - walletApplied + convenienceFee + deliveryFee, 0);
  const codAllowed = totalPayable > 0 && totalPayable <= COD_LIMIT;
  const emiAllowed = totalPayable >= HIGH_VALUE_EMI_THRESHOLD;
  const fraudRisk = totalPayable >= 20000 || selectedMethod === "card";
  const selectedMethodConfig = PAYMENT_METHODS.find((method) => method.key === selectedMethod);

  const billingSummary = sameAsDelivery
    ? `${deliveryAddress.fullName}, ${deliveryAddress.line1}, ${deliveryAddress.city}, ${deliveryAddress.state}, ${deliveryAddress.pincode}`
    : `${billingAddress.fullName}, ${billingAddress.line1}, ${billingAddress.city}, ${billingAddress.state}, ${billingAddress.pincode}`;

  const shortOrderItems = cartItems.slice(0, 3);

  const setFormField = (key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleCouponApply = (event) => {
    event.preventDefault();
    const normalized = couponCode.trim().toUpperCase();
    setAppliedCoupon(normalized);

    if (!normalized) {
      setCouponMessage("Coupon removed.");
      return;
    }

    if (normalized === "RIDE10" && subtotal >= 1000) {
      setCouponMessage("RIDE10 applied successfully.");
      return;
    }

    if (normalized === "BIKE500" && subtotal >= 15000) {
      setCouponMessage("BIKE500 applied successfully.");
      return;
    }

    setCouponMessage("Coupon not applicable for this order.");
  };

  const handleSavedMethodSelect = (methodId) => {
    setSelectedSavedMethod(methodId);
    const method = savedMethods.find((item) => item.id === methodId);
    if (!method) return;

    if (method.type.includes("upi")) setSelectedMethod("upi");
    else if (method.type.includes("card")) setSelectedMethod("card");
    else if (method.type.includes("cod")) setSelectedMethod("cod");
    else setSelectedMethod("netbanking");
  };

  const validatePayment = () => {
    if (cartItems.length === 0) return "Your cart is empty.";
    if (!deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode) {
      return "Please complete your delivery address before paying.";
    }

    if (!sameAsDelivery && (!billingAddress.line1 || !billingAddress.city || !billingAddress.state || !billingAddress.pincode)) {
      return "Please complete the billing address.";
    }

    if (selectedMethod === "cod" && !codAllowed) {
      return `Cash on Delivery is only available up to ${formatMoney(COD_LIMIT)}.`;
    }

    if (selectedMethod === "card") {
      const digits = details.cardNumber.replace(/\D/g, "");
      if (digits.length < 16 || !details.expiry || details.cvv.length < 3) {
        return "Enter a valid card number, expiry, and CVV.";
      }
    }

    if (selectedMethod === "upi" && !details.useQr && !details.upiId.trim()) {
      return "Enter a valid UPI ID or switch to QR payment.";
    }

    return "";
  };

  const persistSavedMethod = () => {
    if (!saveMethod || !userId) return;

    const existing = readStoredJson(getAccountKey(userId, "payments"), []);
    let nextMethod = null;

    if (selectedMethod === "card") {
      nextMethod = {
        id: `card-${Date.now()}`,
        label: maskCardNumber(details.cardNumber),
        detail: "Saved card for faster checkout",
        type: "card",
      };
    } else if (selectedMethod === "upi") {
      nextMethod = {
        id: `upi-${Date.now()}`,
        label: details.useQr ? "UPI QR" : (details.upiId || "UPI"),
        detail: "Saved UPI option",
        type: "upi",
      };
    }

    if (!nextMethod) return;

    const updated = [nextMethod, ...existing];
    localStorage.setItem(getAccountKey(userId, "payments"), JSON.stringify(updated));
    setSavedMethods(updated);
    setSelectedSavedMethod(nextMethod.id);
  };

  const buildReceiptText = (paymentStatus) => [
    "Shreenath Cycle Store",
    `Receipt ID: ${paymentStatus.receiptId}`,
    `Payment method: ${paymentStatus.method}`,
    `Gateway: ${paymentStatus.gateway}`,
    `Amount paid: ${formatMoney(paymentStatus.amount)}`,
    `Coupon: ${appliedCoupon || "None"}`,
    `Wallet used: ${formatMoney(walletApplied)}`,
    `Billing address: ${billingSummary}`,
    `Generated on: ${new Date().toLocaleString("en-IN")}`,
  ].join("\n");

  const downloadReceipt = (paymentStatus) => {
    if (!paymentStatus) return;
    try {
      const blob = new Blob([buildReceiptText(paymentStatus)], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, `${paymentStatus.receiptId}.txt`);
      setMessage("Receipt downloaded.");
    } catch {
      setMessage("Receipt download is not available right now.");
    }
  };

  const startPayment = () => {
    const validationError = validatePayment();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setMessage("");
    if (fraudRisk && !otpRequired && paymentState !== "failed") {
      setOtpRequired(true);
      setPaymentState("otp");
      return;
    }

    if (otpRequired && otpCode !== "123456") {
      setMessage("Enter OTP 123456 to simulate bank verification.");
      return;
    }

    setPaymentState("processing");
    setLoadingMessage("Authorizing payment...");

    window.setTimeout(() => {
      setLoadingMessage("Running fraud and secure gateway checks...");
    }, 1000);

    window.setTimeout(() => {
      const shouldFail = selectedMethod === "netbanking" && gateway === "PayPal";
      if (shouldFail) {
        setPaymentState("failed");
        setResult(null);
        setMessage("Payment failed at bank redirect. Please retry or switch gateway.");
        return;
      }

      const paymentStatus = {
        receiptId: `INV-${Date.now()}`,
        amount: totalPayable,
        method: selectedMethodConfig?.label || selectedMethod,
        gateway,
      };

      // Place the actual order in the backend now that payment is "confirmed"
      if (orderFromState) {
        const finalOrder = {
          ...orderFromState,
          // Update address with payment info if not already there
          address: orderFromState.address.includes("Payment:") 
            ? orderFromState.address 
            : `${orderFromState.address} | Payment: ${paymentStatus.method}`
        };

        fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalOrder),
        })
        .then(res => {
          if (res.ok) {
            fetch(`${API_BASE}/cart/clear?userId=${userId}`, { method: "DELETE" }).catch(() => {});
            persistSavedMethod();
            setResult(paymentStatus);
            setPaymentState("success");
            setOtpRequired(false);
            setLoadingMessage("");
          } else {
            return res.text().then(text => { throw new Error(text || "Backend order failed"); });
          }
        })
        .catch(err => {
          setPaymentState("failed");
          setMessage(`Payment processed but order placement failed: ${err.message}`);
          setLoadingMessage("");
        });
      } else {
        // Fallback for unexpected cases
        persistSavedMethod();
        setResult(paymentStatus);
        setPaymentState("success");
        setOtpRequired(false);
        setLoadingMessage("");
      }
    }, 2200);
  };

  const retryPayment = () => {
    setPaymentState("idle");
    setResult(null);
    setMessage("");
    setLoadingMessage("");
    setOtpRequired(fraudRisk);
  };

  const copyDemoQr = async () => {
    try {
      await copyTextToClipboard("upi://pay?pa=shreenathcycles@upi&pn=Shreenath%20Cycle%20Store");
      setMessage("Demo UPI QR link copied.");
    } catch {
      setMessage("Could not copy QR link.");
    }
  };

  if (!userId) {
    return (
      <div className="payment-page">
        <div className="payment-shell payment-empty-state">
          <FaLock />
          <h1>Login Required</h1>
          <p>Please login to continue with secure payment.</p>
          <button className="pay-now-btn" onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-shell">
        <button className="payment-back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <header className="payment-header">
          <div>
            <span className="payment-eyebrow">Secure payment page</span>
            <h1>Complete Your Payment</h1>
            <p>Choose a payment method, verify details, and finish your bicycle order with protected checkout.</p>
          </div>
          <div className="header-trust-panel">
            <span><FaLock /> SSL secured</span>
            <span><FaShieldAlt /> Fraud checks enabled</span>
            <span><FaCheckCircle /> OTP support</span>
          </div>
        </header>

        {message && <div className="payment-message">{message}</div>}

        <div className="payment-layout">
          <main className="payment-main">
            <section className="payment-card">
              <div className="section-heading">
                <h2>Order Summary</h2>
                <span>{cartItems.length} items</span>
              </div>

              {loadingCart ? (
                <div className="processing-inline">
                  <div className="spinner-ring" />
                  <p>Loading your order...</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="empty-inline-card">
                  <p>Your cart is empty.</p>
                  <button className="secondary-btn" onClick={() => navigate("/")}>Browse Products</button>
                </div>
              ) : (
                <>
                  <div className="summary-short-list">
                    {shortOrderItems.map((item) => (
                      <article className="summary-item" key={item.id}>
                        <img
                          src={`${API_BASE}/product/${item.id}/image`}
                          alt={item.name}
                          onError={(e) => { e.target.src = "https://via.placeholder.com/96"; }}
                        />
                        <div>
                          <h3>{item.name}</h3>
                          <p>Qty {item.quantity} • {formatMoney(item.price)}</p>
                        </div>
                        <strong>{formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong>
                      </article>
                    ))}
                  </div>
                  {cartItems.length > 3 && <p className="summary-more">+ {cartItems.length - 3} more item(s) in this order</p>}
                </>
              )}
            </section>

            <section className="payment-card total-card">
              <div className="section-heading">
                <h2>Total Amount to Be Paid</h2>
                <span>Live total</span>
              </div>
              <div className="grand-total-row">
                <strong>{formatMoney(totalPayable)}</strong>
                <span>{selectedMethod === "card" ? "Includes secure card handling fee" : "Inclusive of offers and charges"}</span>
              </div>
            </section>

            <section className="payment-card">
              <div className="section-heading">
                <h2>Select Payment Method</h2>
                <span>Top to bottom flow</span>
              </div>
              <div className="payment-method-grid">
                {PAYMENT_METHODS.map((method) => {
                  const disabled = method.key === "cod" && !codAllowed;
                  return (
                    <button
                      key={method.key}
                      className={`method-card${selectedMethod === method.key ? " active" : ""}`}
                      onClick={() => !disabled && setSelectedMethod(method.key)}
                      disabled={disabled}
                      title={disabled ? `Available up to ${formatMoney(COD_LIMIT)}` : method.label}
                    >
                      <span className="method-icon">{method.icon}</span>
                      <strong>{method.label}</strong>
                      <span>{method.hint}</span>
                      <small>{disabled ? "Not available for this order" : method.description}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="payment-card">
              <div className="section-heading">
                <h2>Payment Details</h2>
                <span>{selectedMethodConfig?.label}</span>
              </div>

              {selectedMethod === "card" && (
                <div className="details-grid">
                  <label>
                    Card Number
                    <input
                      value={details.cardNumber}
                      onChange={(e) => setFormField("cardNumber", e.target.value.replace(/[^\d\s]/g, "").slice(0, 19))}
                      placeholder="1234 5678 9012 3456"
                    />
                  </label>
                  <label>
                    Expiry
                    <input
                      value={details.expiry}
                      onChange={(e) => setFormField("expiry", e.target.value.slice(0, 5))}
                      placeholder="MM/YY"
                    />
                  </label>
                  <label>
                    CVV
                    <input
                      type="password"
                      value={details.cvv}
                      onChange={(e) => setFormField("cvv", e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="123"
                    />
                  </label>
                </div>
              )}

              {selectedMethod === "upi" && (
                <div className="upi-panel">
                  <div className="upi-mode-toggle">
                    <button className={details.useQr ? "active" : ""} onClick={() => setFormField("useQr", true)}>
                      <FaQrcode /> QR Code
                    </button>
                    <button className={!details.useQr ? "active" : ""} onClick={() => setFormField("useQr", false)}>
                      <FaMobileAlt /> UPI ID
                    </button>
                  </div>
                  {details.useQr ? (
                    <div className="qr-card">
                      <div className="demo-qr">
                        <FaQrcode />
                      </div>
                      <div>
                        <strong>Scan with any UPI app</strong>
                        <p>Google Pay, PhonePe, Paytm, or BHIM can be used here.</p>
                      </div>
                      <button className="secondary-btn" onClick={copyDemoQr}>
                        <FaCopy /> Copy QR Link
                      </button>
                    </div>
                  ) : (
                    <label>
                      UPI ID
                      <input
                        value={details.upiId}
                        onChange={(e) => setFormField("upiId", e.target.value)}
                        placeholder="name@bank"
                      />
                    </label>
                  )}
                </div>
              )}

              {selectedMethod === "netbanking" && (
                <div className="details-grid">
                  <label>
                    Select Bank
                    <select value={details.bank} onChange={(e) => setFormField("bank", e.target.value)}>
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {selectedMethod === "cod" && (
                <div className="cod-note">
                  <FaMoneyBillWave />
                  <p>Cash on Delivery is enabled for this order. Our team may call to confirm before dispatch.</p>
                </div>
              )}

              {emiAllowed && (
                <div className="emi-panel">
                  <div className="section-mini-heading">EMI options for high-value bicycles</div>
                  <div className="emi-chip-row">
                    {EMI_OPTIONS.map((plan) => (
                      <button
                        key={plan}
                        className={details.emiPlan === plan ? "active" : ""}
                        onClick={() => setFormField("emiPlan", plan)}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="checkbox-row">
                <input type="checkbox" checked={saveMethod} onChange={() => setSaveMethod((prev) => !prev)} />
                Save this payment method for one-click payment next time
              </label>
            </section>

            {savedMethods.length > 0 && (
              <section className="payment-card">
                <div className="section-heading">
                  <h2>Saved Payment Methods</h2>
                  <span>Optional</span>
                </div>
                <div className="saved-method-list">
                  {savedMethods.map((method) => (
                    <button
                      key={method.id}
                      className={`saved-method-card${selectedSavedMethod === method.id ? " active" : ""}`}
                      onClick={() => handleSavedMethodSelect(method.id)}
                    >
                      <FaBolt />
                      <div>
                        <strong>{method.label}</strong>
                        <span>{method.detail}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="payment-card">
              <div className="section-heading">
                <h2>Apply Coupon / Wallet Balance</h2>
                <span>Offers</span>
              </div>
              <form className="coupon-wallet-row" onSubmit={handleCouponApply}>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Try RIDE10 or BIKE500"
                />
                <button className="secondary-btn" type="submit">Apply</button>
              </form>
              {couponMessage && <p className="support-copy">{couponMessage}</p>}
              <label className="checkbox-row">
                <input type="checkbox" checked={useWallet} onChange={() => setUseWallet((prev) => !prev)} />
                Use wallet balance {formatMoney(WALLET_BALANCE)}
              </label>
            </section>

            <section className="payment-card">
              <div className="section-heading">
                <h2>Payment Security Info</h2>
                <span>Protection</span>
              </div>
              <div className="trust-grid">
                <div><FaLock /><span>SSL encrypted checkout</span></div>
                <div><FaShieldAlt /><span>Fraud detection and secure scoring</span></div>
                <div><FaCreditCard /><span>OTP verification for risky payments</span></div>
              </div>
              <div className="gateway-row">
                {GATEWAYS.map((item) => (
                  <button
                    key={item}
                    className={gateway === item ? "active" : ""}
                    onClick={() => setGateway(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <section className="payment-card">
              <div className="section-heading">
                <h2>Billing Address</h2>
                <span>Same as delivery or edit</span>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={sameAsDelivery} onChange={() => setSameAsDelivery((prev) => !prev)} />
                Billing address is same as delivery
              </label>
              {!sameAsDelivery && (
                <div className="details-grid">
                  <label>
                    Full Name
                    <input value={billingAddress.fullName} onChange={(e) => setBillingAddress((prev) => ({ ...prev, fullName: e.target.value }))} />
                  </label>
                  <label>
                    Address Line
                    <input value={billingAddress.line1} onChange={(e) => setBillingAddress((prev) => ({ ...prev, line1: e.target.value }))} />
                  </label>
                  <label>
                    City
                    <input value={billingAddress.city} onChange={(e) => setBillingAddress((prev) => ({ ...prev, city: e.target.value }))} />
                  </label>
                  <label>
                    State
                    <input value={billingAddress.state} onChange={(e) => setBillingAddress((prev) => ({ ...prev, state: e.target.value }))} />
                  </label>
                  <label>
                    Pincode
                    <input value={billingAddress.pincode} onChange={(e) => setBillingAddress((prev) => ({ ...prev, pincode: e.target.value }))} />
                  </label>
                </div>
              )}
              <div className="address-preview">
                <FaMapMarkerAlt />
                <span>{billingSummary}</span>
              </div>
            </section>
          </main>

          <aside className="payment-sidebar">
            <section className="payment-card sticky-card">
              <div className="section-heading">
                <h2>Final Review</h2>
                <span>Before Pay Now</span>
              </div>

              <div className="price-lines">
                <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
                <div><span>Coupon discount</span><strong>- {formatMoney(couponDiscount)}</strong></div>
                <div><span>Wallet used</span><strong>- {formatMoney(walletApplied)}</strong></div>
                <div><span>Delivery fee</span><strong>{deliveryFee === 0 ? "FREE" : formatMoney(deliveryFee)}</strong></div>
                <div><span>Convenience fee</span><strong>{convenienceFee === 0 ? "FREE" : formatMoney(convenienceFee)}</strong></div>
                <div className="price-total"><span>Total payable</span><strong>{formatMoney(totalPayable)}</strong></div>
              </div>

              {otpRequired && paymentState !== "success" && (
                <div className="otp-box">
                  <div className="section-mini-heading">OTP Verification</div>
                  <p>For demo fraud detection, use OTP <strong>123456</strong>.</p>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter OTP"
                  />
                </div>
              )}

              {paymentState === "processing" && (
                <div className="processing-card">
                  <div className="spinner-ring" />
                  <strong>Processing payment...</strong>
                  <p>{loadingMessage || "Connecting to secure gateway..."}</p>
                </div>
              )}

              {paymentState === "success" && result && (
                <div className="result-card success">
                  <FaCheckCircle />
                  <h3>Payment Successful</h3>
                  <p>{formatMoney(result.amount)} paid via {result.method} using {result.gateway}.</p>
                  <div className="result-actions">
                    <button className="secondary-btn" onClick={() => downloadReceipt(result)}>
                      <FaReceipt /> Generate Receipt
                    </button>
                    <button className="secondary-btn" onClick={() => downloadReceipt(result)}>
                      <FaFileInvoice /> Generate Invoice
                    </button>
                  </div>
                </div>
              )}

              {paymentState === "failed" && (
                <div className="result-card failed">
                  <FaExclamationTriangle />
                  <h3>Payment Failed</h3>
                  <p>The gateway could not confirm this payment. You can retry or switch method.</p>
                  <button className="secondary-btn" onClick={retryPayment}>
                    <FaRedoAlt /> Retry Payment
                  </button>
                </div>
              )}

              <button
                className="pay-now-btn"
                onClick={startPayment}
                disabled={loadingCart || cartItems.length === 0 || paymentState === "processing"}
              >
                {paymentState === "processing" ? "Processing..." : "Pay Now"}
              </button>

              <div className="support-stack">
                <div><FaClock /> One-click payment available with saved methods</div>
                <div><FaWallet /> Wallet, coupon, and EMI support</div>
                <div><FaLock /> Secure gateway integration ready</div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default MakePayment;
