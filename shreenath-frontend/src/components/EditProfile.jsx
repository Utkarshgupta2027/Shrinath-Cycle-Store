import React, { useState } from "react";
import "../styles/components/editProfile.css";

export default function EditProfile() {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [name, setName] = useState(storedUser?.name || "");
  const [email] = useState(storedUser?.email || "");
  const [phone, setPhone] = useState(storedUser?.phone || "");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedUser = {
      ...storedUser,
      name,
      phone,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setMessage("Profile updated successfully!");
  };

  if (!storedUser) {
    return <h3>Please login to edit your profile.</h3>;
  }

  return (
    <div className="edit-profile-container">
      <h2>Edit Profile</h2>

      {message && <p className="success-msg">{message}</p>}

      <form className="edit-profile-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>Email (cannot be changed)</label>
        <input type="email" value={email} disabled />

        <label>Phone</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}
export { EditProfile };
