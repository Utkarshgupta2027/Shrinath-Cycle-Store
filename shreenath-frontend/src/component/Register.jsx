import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: ""
  });
  const navigate = useNavigate();

const handleRegister = async (e) => {
  e.preventDefault();

  try {
    const response = await axios.post(
      'http://localhost:8080/api/auth/register',
      formData
    );

    alert(response.data.message);
    navigate("/login");

  } catch (error) {
    alert("Registration failed: " + 
      (error.response?.data?.message || error.message)
    );
  }
};
  return (
    <div className="register-container">
      <form className="register-card" onSubmit={handleRegister}>
        <h3>Create Account</h3>
        <input 
          placeholder="Full Name" 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          required 
        />
        <input 
          type="email" 
          placeholder="Email Address" 
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
          required 
        />
        <input 
          type="tel" 
          placeholder="Phone Number" 
          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          required 
        />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;