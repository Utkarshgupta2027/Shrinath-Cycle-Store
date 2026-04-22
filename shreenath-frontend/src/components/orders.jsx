import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaArrowLeft, FaMapMarkerAlt, FaCalendarAlt } from "react-icons/fa";
import "../styles/components/Orders.css";

export default function Orders() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (error) {
    user = null;
  }

  const userId = user?.id;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8080/api/orders/user/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }
        return res.json();
      })
      .then(setOrders)
      .catch(() => setError("Unable to load your orders. Please try again."))
      .finally(() => setLoading(false));
  }, [userId]);

  const getStatusClass = (status) => (status || "PLACED").toLowerCase();

  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-empty">
          <FaBoxOpen className="empty-icon" />
          <h2>Please login to view your orders</h2>
          <button onClick={() => navigate("/login")} className="orders-action-btn">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <h1 className="orders-title">My Orders</h1>

        {loading && <div className="orders-loading">Loading your orders...</div>}
        {error && <div className="orders-error">{error}</div>}

        {!loading && orders.length === 0 && !error && (
          <div className="orders-empty">
            <FaBoxOpen className="empty-icon" />
            <h2>No orders yet</h2>
            <p>Your order history will appear here after your first purchase.</p>
            <button onClick={() => navigate("/")} className="orders-action-btn">
              Start Shopping
            </button>
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-header-left">
                  <span className="order-number">Order #{order.id}</span>
                  <span className={`order-status ${getStatusClass(order.status)}`}>
                    {order.status || "PLACED"}
                  </span>
                </div>
                <div className="order-header-right">
                  <span className="order-meta">
                    <FaCalendarAlt />
                    {order.orderDate
                      ? new Date(order.orderDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="order-body">
                {order.address && (
                  <div className="order-address">
                    <FaMapMarkerAlt className="address-icon" />
                    <span>{order.address}</span>
                  </div>
                )}

                <div className="order-items">
                  <h4>Items Ordered</h4>
                  {order.items && order.items.length > 0 ? (
                    <ul className="order-item-list">
                      {order.items.map((item) => (
                        <li key={item.id} className="order-item-row">
                          <div className="order-item-img-wrap">
                            <img
                              src={`http://localhost:8080/api/product/${item.productId || item.id}/image`}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src = "https://via.placeholder.com/60";
                              }}
                            />
                          </div>
                          <div className="order-item-info">
                            <span className="order-item-name">{item.name}</span>
                            <span className="order-item-price">
                              Qty: {item.quantity || 1} | Rs. {Number(item.price).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-items">No item details available.</p>
                  )}
                </div>
              </div>

              <div className="order-footer">
                <span className="order-total-label">Total Amount</span>
                <span className="order-total-value">
                  Rs. {Number(order.totalAmount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
