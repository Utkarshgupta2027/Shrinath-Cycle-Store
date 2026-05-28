import React, { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaArrowLeft, FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaEdit, FaCheck, FaUndo, FaFileInvoice, FaCheckCircle, FaExclamationTriangle, FaBan } from "react-icons/fa";
import { getStoredUser, getAuthHeaders } from "../utils/auth";
import "../styles/components/Orders.css";

/* ── Custom dialog state shape ──
   mode: 'cancel-confirm' | 'success' | 'error' | null
   title, message, orderId, reason (for cancel form)
*/
const DIALOG_NONE = { mode: null, title: "", message: "", orderId: null, reason: "" };

function OrderDialog({ dialog, onClose, onCancelConfirm, onReasonChange }) {
  if (!dialog.mode) return null;

  const isCancel = dialog.mode === "cancel-confirm";
  const isSuccess = dialog.mode === "success";
  const isError = dialog.mode === "error";

  return (
    <div className="od-overlay" role="dialog" aria-modal="true" aria-labelledby="od-title">
      <div className={`od-dialog ${isSuccess ? "od-success" : isError ? "od-error" : "od-warn"}`}>

        {/* Icon */}
        <div className="od-icon-ring">
          {isSuccess && <FaCheckCircle className="od-icon od-icon-success" />}
          {isError   && <FaExclamationTriangle className="od-icon od-icon-error" />}
          {isCancel  && <FaBan className="od-icon od-icon-warn" />}
        </div>

        <h2 id="od-title" className="od-title">{dialog.title}</h2>
        <p className="od-message">{dialog.message}</p>

        {/* Reason input — only for cancel-confirm */}
        {isCancel && (
          <div className="od-reason-wrap">
            <label className="od-reason-label">Reason for cancellation</label>
            <textarea
              className="od-reason-input"
              rows={3}
              placeholder="e.g. Changed my mind, Found a better price..."
              value={dialog.reason}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>
        )}

        <div className="od-actions">
          {isCancel && (
            <>
              <button className="od-btn od-btn-danger" onClick={() => onCancelConfirm(dialog.orderId, dialog.reason)}>
                Yes, Cancel Order
              </button>
              <button className="od-btn od-btn-ghost" onClick={onClose}>
                Keep Order
              </button>
            </>
          )}
          {(isSuccess || isError) && (
            <button className={`od-btn ${isSuccess ? "od-btn-gold" : "od-btn-danger"}`} onClick={onClose}>
              OK
            </button>
          )}
        </div>

        {/* Close × */}
        <button className="od-close" onClick={onClose} aria-label="Close dialog">✕</button>
      </div>
    </div>
  );
}

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
  const [returnForms, setReturnForms] = useState({});
  const [dialog, setDialog] = useState(DIALOG_NONE);

  const closeDialog = () => setDialog(DIALOG_NONE);

  const showSuccess = (title, message) =>
    setDialog({ mode: "success", title, message, orderId: null, reason: "" });

  const showError = (title, message) =>
    setDialog({ mode: "error", title, message, orderId: null, reason: "" });

  const fetchOrders = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/orders/user/${userId}`)
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

  /* Opens the cancel confirmation dialog */
  const handleCancelOrder = (orderId) => {
    setDialog({
      mode: "cancel-confirm",
      title: "Cancel this order?",
      message: "This action cannot be undone. Please provide a reason so we can improve.",
      orderId,
      reason: "Changed my mind",
    });
  };

  /* Called when user confirms inside the dialog */
  const executeCancelOrder = async (orderId, reason) => {
    closeDialog();
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        showSuccess("Order Cancelled", "Your order has been cancelled successfully.");
        fetchOrders();
      } else {
        const msg = await res.text();
        showError("Cancellation Failed", msg || "Could not cancel the order. Please try again.");
      }
    } catch (err) {
      showError("Network Error", "Could not connect to the server. Please check your connection.");
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
      showError("Invalid Address", "Address cannot be empty.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress }),
      });
      if (res.ok) {
        setEditingAddressId(null);
        fetchOrders();
      } else {
        const msg = await res.text();
        showError("Update Failed", msg || "Failed to update address.");
      }
    } catch (err) {
      showError("Network Error", "Could not update address. Please check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnFormChange = (orderId, field, value) => {
    setReturnForms((current) => ({
      ...current,
      [orderId]: {
        requestType: "RETURN",
        reason: "",
        preferredResolution: "",
        ...(current[orderId] || {}),
        [field]: value,
      },
    }));
  };

  const downloadInvoice = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) { showError("Invoice Error", "Failed to generate invoice."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `invoice-${orderId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Invoice Error", "Could not download invoice.");
    }
  };

  const handleReturnExchangeRequest = async (orderId) => {
    const form = returnForms[orderId] || {};
    if (!form.reason?.trim()) {
      showError("Missing Reason", "Please enter a reason for your return/exchange request.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/return-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: form.requestType || "RETURN",
          reason: form.reason,
          preferredResolution: form.preferredResolution || "",
        }),
      });
      if (res.ok) {
        showSuccess("Request Submitted", "Your return/exchange request has been submitted successfully.");
        setReturnForms((current) => ({ ...current, [orderId]: {} }));
      } else {
        const msg = await res.text();
        showError("Request Failed", msg || "Failed to submit request.");
      }
    } catch (err) {
      showError("Network Error", "Could not submit request. Please check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => (status || "PENDING").toLowerCase().replaceAll("_", "-");
  const canCancel = (status) => ["PENDING", "CONFIRMED", "PACKED", "PLACED", "PROCESSING", undefined, null, ""].includes(status);

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
      {/* Custom dialog overlay */}
      <OrderDialog
        dialog={dialog}
        onClose={closeDialog}
        onCancelConfirm={executeCancelOrder}
        onReasonChange={(val) => setDialog((d) => ({ ...d, reason: val }))}
      />

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
                  {order.awbNumber && (
                    <span className="order-awb-badge">
                      {"📦 AWB: "}{order.awbNumber}{order.courierName ? " - " + order.courierName : ""}
                      {order.trackingUrl && (
                        <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="awb-track-link"> Track Shipment</a>
                      )}
                    </span>
                  )}
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
                        {(order.status === "PENDING" || order.status === "PLACED" || !order.status) && (
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
                              src={`${API_BASE_URL}/api/product/${item.productId || item.id}/image`}
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
                  {(order.paymentStatus === "PAID" || order.status === "DELIVERED") && (
                    <button
                      className="invoice-btn"
                      onClick={() => downloadInvoice(order.id)}
                      title="Download GST Invoice"
                    >
                      <FaFileInvoice /> Invoice
                    </button>
                  )}
                  {canCancel(order.status) && (
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
              {order.status === "DELIVERED" && (
                <div className="return-exchange-form">
                  <select
                    value={returnForms[order.id]?.requestType || "RETURN"}
                    onChange={(event) => handleReturnFormChange(order.id, "requestType", event.target.value)}
                  >
                    <option value="RETURN">Return</option>
                    <option value="EXCHANGE">Exchange</option>
                  </select>
                  <textarea
                    placeholder="Reason"
                    value={returnForms[order.id]?.reason || ""}
                    onChange={(event) => handleReturnFormChange(order.id, "reason", event.target.value)}
                    rows={2}
                  />
                  <input
                    placeholder="Preferred resolution"
                    value={returnForms[order.id]?.preferredResolution || ""}
                    onChange={(event) => handleReturnFormChange(order.id, "preferredResolution", event.target.value)}
                  />
                  <button
                    className="track-order-btn"
                    disabled={actionLoading}
                    onClick={() => handleReturnExchangeRequest(order.id)}
                  >
                    Submit Request
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
