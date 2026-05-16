import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaCheckCircle, FaEdit, FaHome, FaMapMarkerAlt,
  FaPlus, FaStar, FaTrash, FaTimes, FaBuilding, FaBriefcase,
} from "react-icons/fa";
import { getStoredUser, getAuthHeaders, readStoredJson } from "../utils/auth";
import "../styles/components/AddressBook.css";

const API_BASE = "http://localhost:8080/api";

const EMPTY_FORM = {
  label: "Home",
  name: "",
  phone: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

const LABEL_ICONS = {
  Home: <FaHome />,
  Office: <FaBriefcase />,
  Other: <FaBuilding />,
};

export default function AddressBook() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const userId = user?.id;

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pinStatus, setPinStatus] = useState(null); // { serviceable, city, state }
  const [pinLoading, setPinLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [pageMsg, setPageMsg] = useState("");

  const loadAddresses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/addresses`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data) ? data : []);
      } else {
        // fallback to localStorage
        const local = readStoredJson(`account:${userId}:addresses`, []);
        setAddresses(local);
      }
    } catch {
      const local = readStoredJson(`account:${userId}:addresses`, []);
      setAddresses(local);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // PIN auto-fill via India Post API
  useEffect(() => {
    const pin = form.pincode.trim();
    if (pin.length !== 6) {
      setPinStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPinLoading(true);
      try {
        // First check serviceability from our backend
        const svcRes = await fetch(`${API_BASE}/shipping/check-pincode?pincode=${pin}`);
        const svcData = svcRes.ok ? await svcRes.json() : null;

        if (svcData?.serviceable) {
          setPinStatus({ serviceable: true, city: svcData.city, state: svcData.state });
          if (svcData.city) setForm((prev) => ({ ...prev, city: svcData.city, state: svcData.state }));
        } else {
          // Try India Post API for city/state auto-fill even if not serviceable
          const ipRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const ipData = ipRes.ok ? await ipRes.json() : null;
          const post = ipData?.[0]?.PostOffice?.[0];
          if (post) {
            setForm((prev) => ({
              ...prev,
              city: post.District || post.Name || "",
              state: post.State || "",
            }));
          }
          setPinStatus({ serviceable: false });
        }
      } catch {
        setPinStatus(null);
      } finally {
        setPinLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [form.pincode]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, name: user?.name || "", phone: user?.phoneNumber || "" });
    setEditingId(null);
    setPinStatus(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setForm({
      label: addr.label || "Home",
      name: addr.name || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      isDefault: addr.isDefault || addr.default || false,
    });
    setEditingId(addr.id);
    setPinStatus(null);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.line1.trim() || !form.pincode.trim() || !form.city.trim()) {
      setFormError("Name, address line, city and pincode are required.");
      return;
    }
    if (pinStatus?.serviceable === false) {
      setFormError("This pincode is not serviceable. Please use a serviceable PIN or contact admin.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload = { ...form };
      let res;
      if (editingId) {
        res = await fetch(`${API_BASE}/addresses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        closeForm();
        await loadAddresses();
      } else {
        const msg = await res.text();
        setFormError(msg || "Failed to save address.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/addresses/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await loadAddresses();
      } else {
        const msg = await res.text();
        setPageMsg(msg || "Failed to delete address.");
      }
    } catch {
      setPageMsg("Network error.");
    } finally {
      setActionId(null);
    }
  };

  const handleSetDefault = async (id) => {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/addresses/${id}/default`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setPageMsg("Default address updated.");
        await loadAddresses();
      } else {
        const msg = await res.text();
        setPageMsg(msg || "Failed to set default.");
      }
    } catch {
      setPageMsg("Network error.");
    } finally {
      setActionId(null);
    }
  };

  if (!user) {
    return (
      <div className="ab-page">
        <div className="ab-container">
          <div className="ab-empty">
            <FaMapMarkerAlt className="ab-empty-icon" />
            <h2>Please login to manage addresses</h2>
            <button onClick={() => navigate("/login")} className="ab-primary-btn">Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ab-page">
      <div className="ab-container">
        <button className="ab-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        <div className="ab-header">
          <div>
            <span className="ab-eyebrow">My Account</span>
            <h1>Address Book</h1>
            <p>Manage your saved delivery addresses. Set a default for faster checkout.</p>
          </div>
          <button className="ab-primary-btn" onClick={openCreate}>
            <FaPlus /> Add New Address
          </button>
        </div>

        {pageMsg && (
          <div className="ab-page-msg">
            <FaCheckCircle /> {pageMsg}
            <button className="ab-msg-close" onClick={() => setPageMsg("")}><FaTimes /></button>
          </div>
        )}

        {loading ? (
          <div className="ab-loading">Loading your addresses…</div>
        ) : addresses.length === 0 ? (
          <div className="ab-empty">
            <FaMapMarkerAlt className="ab-empty-icon" />
            <h2>No saved addresses</h2>
            <p>Add an address to make checkout faster.</p>
            <button className="ab-primary-btn" onClick={openCreate}><FaPlus /> Add Address</button>
          </div>
        ) : (
          <div className="ab-grid">
            {addresses.map((addr) => {
              const icon = LABEL_ICONS[addr.label] || <FaMapMarkerAlt />;
              const isDefault = addr.isDefault || addr.default;
              return (
                <div key={addr.id} className={`ab-card${isDefault ? " ab-card--default" : ""}`}>
                  <div className="ab-card-header">
                    <span className="ab-card-label">
                      {icon} {addr.label || "Address"}
                    </span>
                    {isDefault && (
                      <span className="ab-default-badge"><FaStar /> Default</span>
                    )}
                  </div>
                  <div className="ab-card-body">
                    <p className="ab-card-name">{addr.name}</p>
                    <p className="ab-card-phone">{addr.phone}</p>
                    <p className="ab-card-line">{addr.line1}</p>
                    <p className="ab-card-location">
                      {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="ab-card-actions">
                    <button
                      className="ab-action-btn ab-edit-btn"
                      onClick={() => openEdit(addr)}
                      disabled={actionId === addr.id}
                    >
                      <FaEdit /> Edit
                    </button>
                    {!isDefault && (
                      <button
                        className="ab-action-btn ab-default-btn"
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={actionId === addr.id}
                      >
                        <FaStar /> Set Default
                      </button>
                    )}
                    <button
                      className="ab-action-btn ab-delete-btn"
                      onClick={() => handleDelete(addr.id)}
                      disabled={actionId === addr.id}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={closeForm}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-header">
              <h2>{editingId ? "Edit Address" : "Add New Address"}</h2>
              <button className="ab-modal-close" onClick={closeForm}><FaTimes /></button>
            </div>

            <form className="ab-form" onSubmit={handleSave}>
              {formError && <p className="ab-form-error">{formError}</p>}

              <div className="ab-form-row ab-label-row">
                {["Home", "Office", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    className={`ab-label-chip${form.label === lbl ? " active" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, label: lbl }))}
                  >
                    {LABEL_ICONS[lbl]} {lbl}
                  </button>
                ))}
              </div>

              <div className="ab-form-row">
                <label>Receiver Name *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" required />
              </div>
              <div className="ab-form-row">
                <label>Phone *</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit number" />
              </div>
              <div className="ab-form-row">
                <label>Address Line *</label>
                <input name="line1" value={form.line1} onChange={handleChange} placeholder="House no., street, locality" required />
              </div>

              <div className="ab-form-row">
                <label>Pincode *</label>
                <div className="ab-pin-input-wrap">
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="6-digit PIN"
                    maxLength={6}
                    required
                  />
                  {pinLoading && <span className="ab-pin-checking">Checking…</span>}
                  {!pinLoading && pinStatus?.serviceable === true && (
                    <span className="ab-pin-badge ab-pin-ok">✓ Serviceable</span>
                  )}
                  {!pinLoading && pinStatus?.serviceable === false && (
                    <span className="ab-pin-badge ab-pin-bad">✗ Not serviceable</span>
                  )}
                </div>
              </div>

              <div className="ab-form-row-split">
                <div className="ab-form-row">
                  <label>City *</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="City" required />
                </div>
                <div className="ab-form-row">
                  <label>State *</label>
                  <input name="state" value={form.state} onChange={handleChange} placeholder="State" required />
                </div>
              </div>

              <label className="ab-default-check">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                />
                Set as default delivery address
              </label>

              <div className="ab-form-actions">
                <button type="button" className="ab-cancel-form-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="ab-primary-btn" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
