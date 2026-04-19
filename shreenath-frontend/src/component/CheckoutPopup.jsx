import React, { useEffect, useState, useContext } from "react";
import AppContext from "../Context/Context";
import "./CheckoutPopup.css";
import { useNavigate } from "react-router-dom";

function CheckoutPopup() {
  const navigate = useNavigate();
  const { cart, clearCart } = useContext(AppContext);

  const [address, setAddress] = useState(null);
  const [error, setError] = useState("");

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
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

            setAddress({
              road: data.address.road || "",
              suburb: data.address.suburb || "",
              city:
                data.address.city ||
                data.address.town ||
                data.address.village ||
                "",
              district: data.address.county || "",
              state: data.address.state || "",
              country: data.address.country || "",
              postcode: data.address.postcode || "",
            });
            setError("");
          } catch {
            setError("Unable to load address");
          }
        },
        (err) => setError(err.message)
      );
    } else {
      setError("Location not supported in your browser");
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const handleConfirm = async () => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.id || localStorage.getItem("userId");

    if (!userId) {
      navigate("/login");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const orderAddress = address
      ? `${address.road}, ${address.suburb}, ${address.city}, ${address.district}, ${address.state}, ${address.country} - ${address.postcode}`
      : "";

    const order = {
      userId,
      items: cart.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
      })),
      totalAmount: totalPrice,
      address: orderAddress,
    };

    try {
      const res = await fetch("http://localhost:8080/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        alert("Order Saved Successfully!");
        clearCart();
        navigate("/makepayment");
      } else {
        alert("Failed to save order!");
      }
    } catch (err) {
      console.log(err);
      alert("Something went wrong!");
    }
  };

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>

      <div className="checkout-section">
        <h3>Your Location</h3>

        {address ? (
          <p className="address-box">
            {address.road}, {address.suburb}, {address.city}, {address.district},
            {address.state}, {address.country} - {address.postcode}
          </p>
        ) : (
          <p>Fetching location...</p>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="checkout-section">
        <h3>Selected Products</h3>

        {cart.length === 0 ? (
          <p>No items in your cart.</p>
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
                  <p>Rs. {item.price}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="total-price">Total Amount: Rs. {totalPrice}</h3>

      <button className="confirm-btn" onClick={handleConfirm}>
        Confirm Order
      </button>
      <button className="back-btn" onClick={() => navigate(-1)}>
        Go Back
      </button>
    </div>
  );
}

export default CheckoutPopup;
