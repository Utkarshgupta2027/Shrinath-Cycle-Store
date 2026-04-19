import React, { useEffect, useState, useRef } from "react";
import "./Wishlist.css";
import { useNavigate } from "react-router-dom";
/* ===========================
   API FUNCTIONS
   =========================== */
const getWishlist = async (userId) => {
    // Matches the @GetMapping("/{userId}") in WishlistController
  const res = await fetch(`http://localhost:8080/api/wishlist/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch wishlist");
  return res.json();
};

const removeFromWishlistApi = async (userId, productId) => {
  // Matches the @DeleteMapping("/remove") in WishlistController
  const res = await fetch(`http://localhost:8080/api/wishlist/remove?userId=${userId}&productId=${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove item");
  return true;
};
/* ===========================
   WISHLIST COMPONENT
   =========================== */
export default function Wishlist() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [wishlist, setWishlist] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchedRef = useRef(false);

  // 1. Fetch Wishlist on Mount
  useEffect(() => {
    if (!user || fetchedRef.current) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;
    setLoading(true);
    setError("");

    getWishlist(user.id)
      .then(setWishlist)
      .catch(() => setError("Unable to load wishlist"))
      .finally(() => setLoading(false));
  }, [user]);

  // 2. Handler to Remove Item
 const handleRemove = async (productId) => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  // Debugging: Check if user.id and productId actually exist
  console.log("Removing Item - User ID:", user?.id, "Product ID:", productId);

  if (!user?.id || !productId) {
    alert("Error: Missing User or Product ID");
    return;
  }

  try {
    // Use template literals to build the query string
    const res = await fetch(
      `http://localhost:8080/api/wishlist/remove?userId=${user.id}&productId=${productId}`, 
      { method: "DELETE" }
    );

    if (res.ok) {
      // Success: Update the UI
      setWishlist((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      const errorMsg = await res.text();
      console.error("Server responded with:", errorMsg);
      alert("Failed to remove item: " + errorMsg);
    }
  } catch (err) {
    console.error("Network error:", err);
    alert("Connection to server lost.");
  }
};

  /* ===========================
     UI STATES
     =========================== */
  if (!user) {
    return <h3>Please login to view your wishlist.</h3>;
  }

  if (loading) {
    return <p>Loading wishlist...</p>;
  }

  return (
    <div className="wishlist-page">
      <h2>Your Wishlist</h2>

      {error && <p className="error-text">{error}</p>}

      {wishlist.length === 0 ? (
        <p>Your wishlist is empty.</p>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map((item) => (
            <div key={item.wishlistId} className="wishlist-card">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="wishlist-img"
                loading="lazy"
              />
              <h4 className="wishlist-name">{item.name}</h4>
              <p className="wishlist-price">₹{item.price}</p>

              <button
                className="remove-btn"
                onClick={() => handleRemove(item.wishlistId)}
              >
                ❌ Remove
              </button>
            </div>
          ))}
        </div>
        
      )}
      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Go Back
      </button>
    </div>
  );
}

export { Wishlist };