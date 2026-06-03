import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./auth.css";

function Register() {
  // Step 1: fill in details + send OTP
  // Step 2: enter OTP to verify and complete registration
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [msg, setMsg] = useState({ text: "", type: "" }); // type: "error" | "success"
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef([]);
  const navigate = useNavigate();

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const showMsg = (text, type = "error") => setMsg({ text, type });
  const clearMsg = () => setMsg({ text: "", type: "" });

  // ── Step 1: Send OTP ─────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMsg();

    const email = formData.email.trim().toLowerCase();
    if (!email) return showMsg("Please enter your email address.");

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/send-registration-otp`, {
        email,
      });
      showMsg(res.data?.message || `OTP sent to ${email}`, "success");
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      showMsg(
        "Failed to send OTP: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP + Register ────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMsg();

    const otpValue = otp.join("");
    if (otpValue.length < 6) return showMsg("Please enter the 6-digit OTP.");

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        otp: otpValue,
      };

      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
      showMsg(res.data?.message || "Registration successful!", "success");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      showMsg(
        "Registration failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearMsg();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/send-registration-otp`, {
        email: formData.email.trim().toLowerCase(),
      });
      showMsg(res.data?.message || "OTP resent!", "success");
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      showMsg("Resend failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handling ───────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ── Step indicator ── */}
        <div className="auth-steps">
          <span className={`auth-step ${step >= 1 ? "active" : ""}`}>1</span>
          <span className="auth-step-line" />
          <span className={`auth-step ${step === 2 ? "active" : ""}`}>2</span>
        </div>

        <h2>{step === 1 ? "Create Account" : "Verify Email"}</h2>
        <p className="auth-subtitle">
          {step === 1
            ? "Join ShreeNath Cycle Store today"
            : `Enter the 6-digit OTP sent to ${formData.email}`}
        </p>

        {/* ══ STEP 1: Registration form ══ */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="10 digit number"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a strong password (min 6 chars)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Send Verification OTP"}
            </button>
          </form>
        )}

        {/* ══ STEP 2: OTP verification ══ */}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="otp-input-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify & Register"}
            </button>

            <div className="auth-resend">
              {resendCooldown > 0 ? (
                <span>Resend OTP in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => { setStep(1); clearMsg(); }}
            >
              ← Back to Details
            </button>
          </form>
        )}

        {msg.text && (
          <p className={`auth-message ${msg.type === "success" ? "auth-message-success" : ""}`}>
            {msg.text}
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
