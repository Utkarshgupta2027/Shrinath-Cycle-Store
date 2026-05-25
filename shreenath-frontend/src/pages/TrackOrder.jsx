import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaTruck, FaBox, FaHome, FaTimesCircle, FaClock, FaUndo } from "react-icons/fa";
import "./TrackOrder.css";
import { API_BASE_URL } from "../config";

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [orderId]);

  const steps = [
    { label: "Pending", status: "PENDING", icon: <FaBox /> },
    { label: "Confirmed", status: "CONFIRMED", icon: <FaClock /> },
    { label: "Packed", status: "PACKED", icon: <FaBox /> },
    { label: "Shipped", status: "SHIPPED", icon: <FaTruck /> },
    { label: "Out for Delivery", status: "OUT_FOR_DELIVERY", icon: <FaTruck /> },
    { label: "Delivered", status: "DELIVERED", icon: <FaHome /> },
  ];

  const getStatusIndex = (status) => {
    const legacyMap = { PLACED: "PENDING", PROCESSING: "CONFIRMED" };
    const normalizedStatus = legacyMap[status?.toUpperCase()] || status?.toUpperCase();
    const statuses = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
    return statuses.indexOf(normalizedStatus);
  };

  const currentStatusIndex = getStatusIndex(order?.status);

  if (loading) return <div className="track-container loading">Locating your package...</div>;
  if (error) return <div className="track-container error">
    <h2>Error</h2>
    <p>{error}</p>
    <button onClick={() => navigate("/orders")}>Back to Orders</button>
  </div>;

  const isCancelled = order?.status === "CANCELLED";
  const isReturned = order?.status === "RETURNED" || order?.status === "RETURN_REQUESTED";

  return (
    <div className="track-page">
      <div className="track-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <div className="track-header">
          <h1>Track Order #{orderId}</h1>
          <p className="order-date">Placed on: {new Date(order.orderDate).toLocaleDateString()}</p>
        </div>

        <div className="track-content">
          {isCancelled ? (
            <div className="cancelled-status">
              <FaTimesCircle className="cancel-icon" />
              <h2>Order Cancelled</h2>
              <p>This order has been cancelled and will not be delivered.</p>
            </div>
          ) : isReturned ? (
            <div className="cancelled-status returned">
              <FaUndo className="cancel-icon" />
              <h2>Order Returned</h2>
              <p>This order has been returned to the warehouse.</p>
            </div>
          ) : (
            <div className="tracking-timeline">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                return (
                  <div key={step.label} className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                    <div className="step-icon-wrap">
                      {step.icon}
                      {isCompleted && <FaCheckCircle className="check-mark" />}
                    </div>
                    <div className="step-info">
                      <span className="step-label">{step.label}</span>
                      {isCurrent && <span className="current-badge">Current Stage</span>}
                    </div>
                    {index < steps.length - 1 && <div className="step-line" />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="order-summary-card">
            <h3>Order Details</h3>
            <div className="summary-row">
              <span>Status:</span>
              <span className={`status-badge ${order.status.toLowerCase().replaceAll("_", "-")}`}>{order.status}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Address:</span>
              <p className="track-address">{order.address}</p>
            </div>
                        {order.awbNumber && (
              <div className="awb-section">
                <div className="summary-row">
                  <span>AWB Number:</span>
                  <span className="awb-number-val">{order.awbNumber}</span>
                </div>
                {order.courierName && (<div className="summary-row"><span>Courier:</span><span>{order.courierName}</span></div>)}
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="courier-track-btn">
                    Track on {order.courierName || "Courier"} Website
                  </a>
                )}
              </div>
            )}<div className="summary-items">
              <h4>Items:</h4>
              {order.items.map((item) => (
                <div key={item.id} className="track-item">
                  <span>{item.name} x {item.quantity}</span>
                  <span>Rs. {item.price * item.quantity}</span>
                </div>
              ))}
              <div className="track-total">
                <span>Total Amount:</span>
                <span>Rs. {order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;

