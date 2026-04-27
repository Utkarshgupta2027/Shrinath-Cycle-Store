import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaArrowLeft, FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaEdit, FaCheck, FaUndo } from "react-icons/fa";
import { getStoredUser } from "../utils/auth";
import "../styles/components/Orders.css";

export default function Orders() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const userId = user?.id;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`http://localhost:8080/api/orders/user/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then(setOrders)
      .catch(() => setError("Unable to load your orders. Please try again."))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setActionLoading(true);
    try {
      console.log(`Attempting to cancel order ${orderId}...`);
      const res = await fetch(`http://localhost:8080/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Some servers require a body for PUT
      });
      
      if (res.ok) {
        alert("Order cancelled successfully.");
        fetchOrders();
      } else {
        const msg = await res.text();
        console.error("Cancel order failed:", res.status, msg);
        alert(`Failed to cancel order (${res.status}): ${msg || "Server error"}`);
      }
    } catch (err) {
      console.error("Network error cancelling order:", err);
      alert("Network error. Could not connect to the server to cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  const startEditingAddress = (order) => {
    setEditingAddressId(order.id);
    setNewAddress(order.address);
  };

  const handleUpdateAddress = async (orderId) => {
    if (!newAddress.trim()) {
      alert("Address cannot be empty.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/orders/${orderId}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress }),
      });
      if (res.ok) {
        setEditingAddressId(null);
        fetchOrders();
      } else {
        const msg = await res.text();
        alert(msg || "Failed to update address.");
      }
    } catch (err) {
      alert("Network error. Could not update address.");
    } finally {
      setActionLoading(false);
    }
  };

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
                    {editingAddressId === order.id ? (
                      <div className="address-edit-group">
                        <textarea
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          className="address-edit-input"
                          rows={3}
                        />
                        <div className="address-edit-actions">
                          <button className="save-addr-btn" onClick={() => handleUpdateAddress(order.id)} disabled={actionLoading}>
                            <FaCheck /> Save
                          </button>
                          <button className="cancel-addr-btn" onClick={() => setEditingAddressId(null)}>
                            <FaUndo /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="address-display-group">
                        <span>{order.address}</span>
                        {(order.status === "PLACED" || !order.status) && (
                          <button className="edit-addr-btn" onClick={() => startEditingAddress(order)}>
                            <FaEdit /> Edit
                          </button>
                        )}
                      </div>
                    )}
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
                <div className="order-total-section">
                  <span className="order-total-label">Total Amount</span>
                  <span className="order-total-value">
                    Rs. {Number(order.totalAmount).toLocaleString("en-IN")}
                  </span>
                </div>
                
                <div className="order-actions-section">
                  <button 
                    className="track-order-btn" 
                    onClick={() => navigate(`/track/${order.id}`)}
                  >
                    Track Order
                  </button>
                  {(order.status === "PLACED" || order.status === "PROCESSING" || !order.status) && (
                    <button 
                      className="cancel-order-btn" 
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={actionLoading}
                    >
                      <FaTimes /> Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
