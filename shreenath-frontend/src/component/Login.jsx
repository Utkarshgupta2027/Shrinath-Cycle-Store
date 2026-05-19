import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("Logging in...");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
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

      const user = {
        id: data.userId,
        username: data.username,
        phoneNo: data.phoneNo,
        email: data.email,
        role: data.role,
      };

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("token", data.token);
      // Store refresh token for silent token renewal
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      setMsg("Login successful");
      setTimeout(() => navigate("/"), 500);
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
