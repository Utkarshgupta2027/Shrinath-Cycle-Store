import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

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

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.message || "Invalid credentials");
        return;
      }

      const user = {
        id: data.userId,
        username: data.username,
        phoneNo: data.phoneNo,
        email: data.email,
      };

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("token", data.token);

      setMsg("Login successful");
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      console.error(err);
      setMsg("Network error");
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>

      <form onSubmit={handleLogin}>
        <input
          required
          placeholder="Phone Number (10 digits)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>

      <p className="auth-message">{msg}</p>

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
