import React, { useState } from "react";
import { FaBell, FaTimes, FaEnvelope, FaCheckCircle } from "react-icons/fa";
import { getStoredUser } from "../utils/auth";
import "./NotifyMeModal.css";

const API_BASE = "http://localhost:8080/api";

export default function NotifyMeModal({ product, onClose }) {
  const user = getStoredUser();
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/products/${product.id}/notify-restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), userId: user?.id || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You'll be notified when this product is back in stock!");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please check your connection.");
    }
  };

  return (
    <div className="nmm-overlay" onClick={onClose}>
      <div className="nmm-card" onClick={(e) => e.stopPropagation()}>
        <button className="nmm-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className="nmm-icon-wrap">
          <FaBell className="nmm-bell" />
        </div>

        <h2 className="nmm-title">Notify Me When Available</h2>
        <p className="nmm-product-name">{product?.name}</p>
        <p className="nmm-subtitle">
          This product is currently out of stock. Enter your email below and we'll
          send you a one-time notification the moment it's back.
        </p>

        {status === "success" ? (
          <div className="nmm-success">
            <FaCheckCircle className="nmm-success-icon" />
            <p>{message}</p>
            <button className="nmm-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="nmm-form" onSubmit={handleSubmit}>
            <div className="nmm-input-wrap">
              <FaEnvelope className="nmm-input-icon" />
              <input
                id="nmm-email-input"
                type="email"
                className="nmm-input"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
              />
            </div>
            {status === "error" && <p className="nmm-error">{message}</p>}
            <button
              id="nmm-submit-btn"
              type="submit"
              className="nmm-submit-btn"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="nmm-spinner" />
              ) : (
                <><FaBell /> Notify Me</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
