import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { setStoredUser } from "../utils/auth";
import "../styles/components/auth.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setPhoneNumber("");
    setPassword("");
    setShowPassword(false);
    setMsg("");
  }, [location.key, location.state]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("Logging in...");

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Invalid credentials");
        return;
      }

      const user = {
        id: data.userId,
        username: data.username,
        phoneNo: data.phoneNo,
        email: data.email,
        role: data.role,
      };

      setStoredUser(user);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("token", data.token);

      setPhoneNumber("");
      setPassword("");
      setShowPassword(false);
      setMsg("");
      setMsg("Login successful");
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      console.error(err);
      setMsg("Network error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to your account</p>

        <form onSubmit={handleLogin} className="auth-form" autoComplete="off">
          <div className="input-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="login-phone"
              required
              placeholder="Enter your 10 digit number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-field">
              <input
                required
                name="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn">Login</button>
        </form>

        {msg && <p className="auth-message">{msg}</p>}

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
