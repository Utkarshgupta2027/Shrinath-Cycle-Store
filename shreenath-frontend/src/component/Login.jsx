import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import AppContext from "../Context/Context";
import "./auth.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("Logging in...");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMsg("Too many login attempts. Please wait a moment and try again.");
        return;
      }

      if (!res.ok) {
        setMsg(data.message || "Invalid credentials");
        return;
      }

      // Store refresh token before calling login() so axiosInstance can use it
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      // Use context login() — this updates React state, persists to localStorage,
      // AND merges guest cart. Analytics will now correctly send userId on the
      // very next page-view because getStoredUser() reads from localStorage.
      const userData = {
        id: data.userId,
        username: data.username,
        name: data.username,
        phoneNo: data.phoneNo,
        phoneNumber: data.phoneNo,
        email: data.email,
        role: data.role,
        verified: data.verified ?? true,
      };

      await login(userData, data.token);

      setMsg("Login successful");
      setTimeout(() => navigate("/"), 300);
    } catch (err) {
      console.error(err);
      setMsg("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to your account</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label>Phone Number</label>
            <input
              required
              placeholder="Enter your 10 digit number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              required
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {msg && <p className="auth-message">{msg}</p>}

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

