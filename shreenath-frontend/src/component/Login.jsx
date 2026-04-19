import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
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
        phoneNumber: username,   // 🔥 FIXED HERE
        password: password
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMsg("Login successful ✔");

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.userId,
          username: data.username,
          phoneNo: data.phoneNo,
        })
      );

      setTimeout(() => navigate("/"), 500);
    } else {
      setMsg(data.message || "Invalid credentials ❌");
    }
  } catch (err) {
    console.error(err);
    setMsg("Network error ❌");
  }
};
  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>

      <form onSubmit={handleLogin}>
        <input
          required
          placeholder="Phone Number (10 digits)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
