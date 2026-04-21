import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaShoppingBag, FaArrowLeft } from "react-icons/fa";
import "./CheckoutPopup.css";

function CheckoutPopup() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }

  const userId = user?.id;
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [locationError, setLocationError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    fetch(`http://localhost:8080/api/cart/users/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch cart");
        }
        return res.json();
      })
      .then((data) => {
        if (data?.items) {
          setCartItems(
            data.items.map((ci) => ({
              ...ci.product,
              quantity: ci.quantity,
            }))
          );
        } else {
          setCartItems([]);
        }
      })
      .catch(() => alert("Could not load your cart. Please go back and try again."))
      .finally(() => setLoadingCart(false));

    getUserLocation();
  }, [userId, navigate]);

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * (item.quantity || 1),
    0
  );

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
            const addr = data.address;
            const fullAddress = [
              addr.house_number || "",
              addr.road || "",
              addr.suburb || addr.neighbourhood || "",
              addr.city || addr.town || addr.village || "",
              addr.state || "",
              addr.postcode || "",
              addr.country || "",
            ]
              .filter((segment) => segment !== "")
              .join(", ");

            const resolvedAddress = fullAddress || data.display_name || "";
            setAddress(resolvedAddress);
            setManualAddress(resolvedAddress);
            setLocationError("");
          } catch {
            setLocationError("Unable to detect location. Please enter your address manually.");
          }
        },
        () => {
          setLocationError("Location access denied. Please enter your address manually.");
        }
      );
    } else {
      setLocationError("Geolocation not supported. Please enter your address manually.");
    }
  };

  const handleConfirm = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Add some products first.");
      navigate("/");
      return;
    }

    const finalAddress = manualAddress.trim() || address.trim();
    if (!finalAddress) {
      alert("Please provide a delivery address.");
      return;
    }

    const order = {
      userId,
      items: cartItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      })),
      address: finalAddress,
    };

    setPlacing(true);
    try {
      const res = await fetch("http://localhost:8080/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        await fetch(`http://localhost:8080/api/cart/clear?userId=${userId}`, {
          method: "DELETE",
        }).catch(() => {});

        alert("Order placed successfully!");
        navigate("/orders");
      } else {
        const errorMessage = await res.text();
        alert(errorMessage || "Failed to place order. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please check your connection.");
    } finally {
      setPlacing(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to Cart
        </button>

        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-layout">
          <div className="checkout-left">
            <div className="checkout-section-card">
              <div className="section-title">
                <FaMapMarkerAlt className="section-icon" />
                <h2>Delivery Address</h2>
              </div>

              {locationError && <p className="location-error">{locationError}</p>}

              <textarea
                className="address-input"
                rows={4}
                placeholder="Enter your full delivery address..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />

              <button className="detect-location-btn" onClick={getUserLocation}>
                <FaMapMarkerAlt /> Detect My Location
              </button>
            </div>

            <div className="checkout-section-card">
              <div className="section-title">
                <FaShoppingBag className="section-icon" />
                <h2>Order Items</h2>
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
                        <img
                          src={`http://localhost:8080/api/product/${item.id}/image`}
                          alt={item.name}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/80";
                          }}
                        />
                      </div>
                      <div className="checkout-item-details">
                        <h4>{item.name}</h4>
                        <p>Qty: {item.quantity}</p>
                      </div>
                      <div className="checkout-item-price">
                        Rs. {(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="checkout-right">
            <div className="order-summary-card">
              <h2>Order Summary</h2>

              <div className="summary-lines">
                <div className="summary-line">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>Rs. {totalPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="summary-line">
                  <span>Delivery</span>
                  <span className="free-delivery">FREE</span>
                </div>
                <div className="summary-line total-line">
                  <span>Total Amount</span>
                  <span>Rs. {totalPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                className="confirm-order-btn"
                onClick={handleConfirm}
                disabled={placing || loadingCart || cartItems.length === 0}
              >
                {placing ? "Placing Order..." : "Confirm Order"}
              </button>

              <p className="secure-note">Safe and secure checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPopup;
