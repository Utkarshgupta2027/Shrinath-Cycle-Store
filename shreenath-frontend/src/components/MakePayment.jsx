import React, { useContext, useState, useEffect } from "react";
import AppContext from "../Context/Context";
// import "../styles/components/CheckoutPopup.css";
import { useNavigate } from "react-router-dom";
import "../styles/components/MakePayment.css";

function MakePayment() {
  const navigate = useNavigate();
  const { cart, clearCart } = useContext(AppContext);

  const [address, setAddress] = useState(null);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  // =============================
  // 🌍 Fetch User Location + Address
  // =============================
  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();

            setAddress({
              road: data.address.road || "",
              suburb: data.address.suburb || "",
              city: data.address.city || data.address.town || data.address.village || "",
              district: data.address.county || "",
              state: data.address.state || "",
              country: data.address.country || "",
              postcode: data.address.postcode || "",
            });

            setError("");
          } catch (err) {
            setError("Failed to fetch address");
          }
        },
        (err) => setError(err.message)
      );
    } else {
      setError("Your device does not support location access");
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  // =============================
  // 💳 Handle Payment
  // =============================
  const handlePayment = () => {
    if (!paymentMethod) {
      alert("Please select a payment method!");
      return;
    }

    // Dummy Payment Screen
    alert(`Payment Successful via: ${paymentMethod}`);

    clearCart();
    navigate("/");
  };

  return (
    <div className="checkout-container">
      <h2>Make Payment</h2>

      {/* USER LOCATION */}
      <div className="checkout-section">
        <h3>Your Delivery Address</h3>

        {address ? (
          <p className="address-box">
            {address.road}{address.suburb}{address.city}, {address.district},{" "}
            {address.state}, {address.country} - {address.postcode}
          </p>
        ) : (
          <p>Fetching location...</p>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>

      {/* PRODUCTS SECTION */}
      <div className="checkout-section">
        <h3>Your Items</h3>

        {cart.length === 0 ? (
          <p>No items in cart.</p>
        ) : (
          <ul className="checkout-list">
            {cart.map((item) => (
              <li key={item.id} className="checkout-item">
                <img
                  src={`http://localhost:8080/api/product/${item.id}/image`}
                  alt={item.name}
                />
                <div>
                  <h4>{item.name}</h4>
                  <p>₹{item.price}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* TOTAL PRICE */}
      <h3 className="total-price">Total Payable: ₹{totalPrice}</h3>

      {/* PAYMENT OPTIONS */}
      <div className="checkout-section">
        <h3>Select Payment Method</h3>

        <div className="payment-options">

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="Card"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            💳 Credit / Debit Card
          </label>

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="UPI"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            🏦 UPI
          </label>

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="Google Pay"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            📱 Google Pay (GPay)
          </label>

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="PhonePe"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            📱 PhonePe
          </label>

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="Paytm"
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            💙 Paytm Wallet / UPI
          </label>
        </div>
      </div>

      {/* CONFIRM PAYMENT */}
      <button className="confirm-btn" onClick={handlePayment}>
        Pay Now
      </button>
    </div>
  );
}

export default MakePayment;
