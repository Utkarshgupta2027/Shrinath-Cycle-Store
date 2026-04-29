import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStoredTheme, THEME_EVENT } from "../utils/theme";
import "../styles/components/Feedback.css";

const CATEGORIES = [
  { value: "", label: "— Select a category —" },
  { value: "GENERAL",    label: "💬 General Enquiry" },
  { value: "PRODUCT",    label: "🚲 Product Feedback" },
  { value: "ORDER",      label: "📦 Order / Delivery" },
  { value: "SUGGESTION", label: "💡 Suggestion" },
  { value: "COMPLAINT",  label: "⚠️ Complaint" },
  { value: "OTHER",      label: "🔖 Other" },
];

const INFO_CARDS = [
  {
    icon: "📧",
    title: "Email Support",
    desc: "gutkarsh702@gmail.com — we reply within 24 hrs",
  },
  {
    icon: "⏱️",
    title: "Quick Response",
    desc: "Our team reviews every feedback personally",
  },
  {
    icon: "🔒",
    title: "Private & Safe",
    desc: "Your details are never shared with third parties",
  },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  category: "",
  message: "",
};

export default function Feedback() {
  const [isLight, setIsLight] = useState(() => getStoredTheme() === "light");

  useEffect(() => {
    const sync = () => setIsLight(getStoredTheme() === "light");
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  const [form, setForm]     = useState(INITIAL_FORM);
  const [rating, setRating] = useState(0);
  const [hover,  setHover]  = useState(0);
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMsg]   = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.category || !form.message) {
      setStatus("error");
      setMsg("Please fill in all required fields.");
      return;
    }

    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("http://localhost:8080/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: rating || null }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMsg(data.message || "Thank you! Your feedback has been submitted.");
        setForm(INITIAL_FORM);
        setRating(0);
      } else {
        setStatus("error");
        setMsg(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Unable to reach the server. Please check your connection.");
    }
  };

  return (
    <main className={`feedback-page${isLight ? " light-surface" : ""}`}>
      {/* Breadcrumb */}
      <nav className="feedback-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <span>Feedback</span>
      </nav>

      <div className="feedback-layout">
        {/* ── Left hero panel ─────────────────────────────── */}
        <aside className="feedback-hero">
          <div className="feedback-eyebrow">
            <span>💬</span> Customer Feedback
          </div>
          <h1>
            We'd love to<br />
            hear from <span>you</span>
          </h1>
          <p>
            Share your experience, suggestions, or concerns — every piece of
            feedback helps us serve you better at ShreeNath Cycle Store.
          </p>

          <div className="feedback-info-cards">
            {INFO_CARDS.map((c) => (
              <div className="feedback-info-card" key={c.title}>
                <div className="fic-icon">{c.icon}</div>
                <div className="fic-text">
                  <strong>{c.title}</strong>
                  <span>{c.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right form card ──────────────────────────────── */}
        <section className="feedback-card">
          <h2 className="feedback-card-title">Send us a message</h2>

          {/* Status banners */}
          {status === "success" && (
            <div className="feedback-success" role="alert">
              <span className="status-icon">✅</span>
              <div>
                <strong>Message received!</strong>
                <br />
                {message}
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="feedback-error" role="alert">
              <span className="status-icon">⚠️</span>
              <div>{message}</div>
            </div>
          )}

          {status !== "success" && (
            <form
              id="feedback-form"
              className="feedback-form"
              onSubmit={handleSubmit}
              noValidate
            >
              {/* Name + Email */}
              <div className="feedback-row">
                <div className="feedback-field">
                  <label htmlFor="fb-name">Full Name *</label>
                  <input
                    id="fb-name"
                    name="name"
                    type="text"
                    placeholder="Utkarsh Gupta"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="feedback-field">
                  <label htmlFor="fb-email">Email Address *</label>
                  <input
                    id="fb-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Category + Subject */}
              <div className="feedback-row">
                <div className="feedback-field">
                  <label htmlFor="fb-category">Category *</label>
                  <select
                    id="fb-category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} disabled={c.value === ""}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="feedback-field">
                  <label htmlFor="fb-subject">Subject *</label>
                  <input
                    id="fb-subject"
                    name="subject"
                    type="text"
                    placeholder="Brief subject..."
                    value={form.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Message */}
              <div className="feedback-field">
                <label htmlFor="fb-message">Your Message *</label>
                <textarea
                  id="fb-message"
                  name="message"
                  placeholder="Tell us what's on your mind..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Star rating (optional) */}
              <div className="star-rating-group">
                <label>Overall Experience (optional)</label>
                <div className="stars" role="group" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn${star <= (hover || rating) ? " active" : ""}`}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <span className="star-hint">
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]} — {rating}/5
                  </span>
                )}
              </div>

              {/* Submit */}
              <button
                id="feedback-submit-btn"
                type="submit"
                className="feedback-submit-btn"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <span>📩</span> Send Feedback
                  </>
                )}
              </button>
            </form>
          )}

          {/* New submission link after success */}
          {status === "success" && (
            <button
              className="feedback-submit-btn"
              style={{ marginTop: "20px" }}
              onClick={() => { setStatus(null); setMsg(""); }}
            >
              Submit another
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
