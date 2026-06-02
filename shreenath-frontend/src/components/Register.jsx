import axios from "axios";
import { API_BASE_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "../styles/components/auth.css";

const INITIAL_FORM = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
};

// ─── Step indicator ────────────────────────────────────────────────────────
function StepBadge({ step }) {
  return (
    <div className="reg-steps">
      <div className={`reg-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
        <span>1</span>
        <small>Details</small>
      </div>
      <div className="reg-step-line" />
      <div className={`reg-step ${step >= 2 ? "active" : ""} ${step > 2 ? "done" : ""}`}>
        <span>2</span>
        <small>Verify Email</small>
      </div>
    </div>
  );
}

// ─── 6-box OTP input ───────────────────────────────────────────────────────
function OtpBoxes({ otp, setOtp, disabled }) {
  const refs = useRef([]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = Array(6).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          className={`otp-box-input${digit ? " filled" : ""}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sending, setSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset on route change
  useEffect(() => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setShowPassword(false);
    setOtp(Array(6).fill(""));
    setMessage({ text: "", type: "" });
    setSending(false);
    setResendCooldown(0);
  }, [location.key, location.state]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const setMsg = (text, type = "error") => setMessage({ text, type });
  const clearMsg = () => setMessage({ text: "", type: "" });

  // ── Step 1: send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMsg();

    const { name, email, phoneNumber, password } = formData;
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      setMsg("All fields are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMsg("Please enter a valid email address.");
      return;
    }
    if (phoneNumber.trim().replace(/\D/g, "").length < 10) {
      setMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    if (password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/send-registration-otp`, {
        email: email.trim().toLowerCase(),
      });
      setMsg(`OTP sent to ${email.trim().toLowerCase()}. Check your inbox (and spam folder).`, "success");
      setOtp(Array(6).fill(""));
      setResendCooldown(60);
      setStep(2);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearMsg();
    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/send-registration-otp`, {
        email: formData.email.trim().toLowerCase(),
      });
      setOtp(Array(6).fill(""));
      setResendCooldown(60);
      setMsg("New OTP sent to your email.", "success");
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: verify OTP + register ───────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMsg();

    const otpString = otp.join("");
    if (otpString.length < 6) {
      setMsg("Please enter the full 6-digit OTP.");
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        otp: otpString,
      });
      setMsg("✅ Registration successful! Redirecting to login...", "success");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join ShreeNathCycleStore today</p>

        <StepBadge step={step} />

        {/* ── Step 1: Registration details ── */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleSendOtp} autoComplete="off">
            <div className="input-group">
              <label>Full Name</label>
              <input
                name="register-name"
                placeholder="Enter Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoComplete="off"
              />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="register-email"
                placeholder="Enter Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="off"
                inputMode="email"
              />
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="register-phone"
                placeholder="10 digit number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                autoComplete="off"
                inputMode="numeric"
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="register-password"
                  placeholder="Create a strong password (min. 6 chars)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={sending}>
              {sending ? "Sending OTP..." : "Send Verification OTP →"}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP verification ── */}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleRegister} autoComplete="off">
            <div className="otp-verify-section">
              <div className="otp-email-label">
                OTP sent to<br />
                <strong>{formData.email}</strong>
              </div>

              <OtpBoxes otp={otp} setOtp={setOtp} disabled={sending} />

              <p className="otp-hint">Enter the 6-digit code from your email. Valid for 5 minutes.</p>

              <div className="otp-resend-row">
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || sending}
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>
                <button
                  type="button"
                  className="otp-back-btn"
                  onClick={() => { setStep(1); clearMsg(); }}
                >
                  ← Change Email
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={sending || otp.join("").length < 6}>
              {sending ? "Verifying..." : "Verify & Create Account"}
            </button>
          </form>
        )}

        {message.text && (
          <p className={`auth-message${message.type === "success" ? " success" : ""}`}>
            {message.text}
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
