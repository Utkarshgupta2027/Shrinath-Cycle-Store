import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaTrash, FaShoppingCart, FaHeart, FaArrowLeft } from "react-icons/fa";
import "../styles/components/Wishlist.css";

export default function Wishlist() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (error) {
    user = null;
  }

  const [wishlist, setWishlist] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  const userId = user?.id;
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId || fetchedRef.current) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;
    setLoading(true);
    setError("");

    fetch(`http://localhost:8080/api/wishlist/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch wishlist");
        return res.json();
      })
      .then(setWishlist)
      .catch(() => setError("Unable to load wishlist. Please try again."))
      .finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // BUG FIX: use productId (not wishlistId) when calling the remove API
  const handleRemove = async (productId) => {
    if (!user?.id || !productId) {
      alert("Error: Missing User or Product ID");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8080/api/wishlist/remove?userId=${user.id}&productId=${productId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        // Remove the item from UI using productId
        setWishlist((prev) => prev.filter((item) => item.productId !== productId));
      } else {
        const errorMsg = await res.text();
        alert("Failed to remove item: " + errorMsg);
      }
    } catch (err) {
      alert("Connection to server lost.");
    }
  };

  const handleAddToCart = async (productId, productName) => {
    if (!user?.id) {
      alert("Please login to add items to cart");
      navigate("/login");
      return;
    }

    setAddingToCart((prev) => ({ ...prev, [productId]: true }));

    try {
      const params = new URLSearchParams({ userId: user.id, productId, quantity: 1 });
      const res = await fetch(`http://localhost:8080/api/cart/add?${params}`, {
        method: "POST",
      });

      if (res.ok) {
        alert(`${productName} added to cart!`);
      } else {
        alert("Failed to add to cart.");
      }
    } catch (err) {
      alert("Network error while adding to cart.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  };

  if (!user) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty-state">
          <FaHeart className="empty-icon" />
          <h2>Please login to view your wishlist</h2>
          <button className="wishlist-login-btn" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-loading">Loading your wishlist...</div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Continue Shopping
        </button>

        <h1 className="wishlist-title">My Wishlist</h1>

        {error && <div className="wishlist-error">{error}</div>}

        {wishlist.length === 0 ? (
          <div className="wishlist-empty-state">
            <FaHeart className="empty-icon" />
            <h2>Your wishlist is empty</h2>
            <p>Save items you love by clicking the heart icon on any product.</p>
            <button className="wishlist-browse-btn" onClick={() => navigate("/")}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((item) => (
              <div key={item.wishlistId} className="wishlist-card">
                {/* BUG FIX: Use backend image endpoint with productId */}
                <Link to={`/product/${item.productId}`} className="wishlist-img-link">
                  <img
                    src={`http://localhost:8080/api/product/${item.productId}/image`}
                    alt={item.name}
                    className="wishlist-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                    }}
                  />
                </Link>

                <div className="wishlist-info">
                  <Link to={`/product/${item.productId}`} className="wishlist-name">
                    {item.name}
                  </Link>
                  <p className="wishlist-price">₹{item.price}</p>
                </div>

                <div className="wishlist-actions">
                  {/* BUG FIX: Pass productId to handleRemove, not wishlistId */}
                  <button
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(item.productId, item.name)}
                    disabled={addingToCart[item.productId]}
                  >
                    <FaShoppingCart /> {addingToCart[item.productId] ? "Adding..." : "Add to Cart"}
                  </button>

                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(item.productId)}
                    title="Remove from wishlist"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
