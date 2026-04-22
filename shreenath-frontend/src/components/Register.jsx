import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "../styles/components/auth.css";

const INITIAL_FORM_DATA = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
};

function Register() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setFormData(INITIAL_FORM_DATA);
    setShowPassword(false);
  }, [location.key, location.state]);

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
      };

      const response = await axios.post(
        "http://localhost:8080/api/auth/register",
        payload
      );

      setFormData(INITIAL_FORM_DATA);
      setShowPassword(false);
      alert(response.data.message);
      navigate("/login");
    } catch (error) {
      alert(
        "Registration failed: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join ShreeNathCycleStore today</p>

        <form className="auth-form" onSubmit={handleRegister} autoComplete="off">
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
              placeholder="Enter Your Gmail"
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
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
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
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
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

          <button type="submit" className="auth-submit-btn">Register</button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
