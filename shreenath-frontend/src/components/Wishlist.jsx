import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { API_BASE_URL } from "../config";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaHeart,
  FaRegStar,
  FaShareAlt,
  FaShoppingCart,
  FaStar,
  FaTag,
  FaTrash,
} from "react-icons/fa";
import { getStoredUser } from "../utils/auth";
import { copyTextToClipboard } from "../utils/browser";
import AppContext from "../Context/Context";
import "../styles/components/Wishlist.css";

const API_BASE = `${API_BASE_URL}/api`;

export default function Wishlist() {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useContext(AppContext);
  const user = getStoredUser();
  const userId = user?.id;

  const [wishlist, setWishlist] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [priceAlerts, setPriceAlerts] = useState([]);

  const wishlistProductIds = useMemo(
    () => wishlist.map((item) => Number(item.productId)),
    [wishlist]
  );

  const fetchWishlist = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/wishlist/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch wishlist");
      const data = await res.json();
      setWishlist(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load wishlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRecommendedProducts(Array.isArray(data) ? data : []))
      .catch(() => setRecommendedProducts([]));
  }, []);

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const getListPrice = (item) => {
    const price = Number(item.price || 0);
    return price ? Math.round(price * 1.15) : 0;
  };

  const getStockStatus = (item) => {
    if (!item.available || item.quantity <= 0) {
      return { label: "Out of stock", tone: "out" };
    }

    if (item.quantity <= 5) {
      return { label: "Low stock", tone: "low" };
    }

    return { label: "In stock", tone: "in" };
  };

  const renderStars = (value) =>
    [1, 2, 3, 4, 5].map((star) =>
      star <= Math.round(value || 0) ? (
        <FaStar key={star} className="wishlist-star filled" />
      ) : (
        <FaRegStar key={star} className="wishlist-star" />
      )
    );

  const handleRemove = async (productId) => {
    if (!userId || !productId) {
      setMessage("Missing user or product details.");
      return;
    }

    try {
      setActionLoading(`remove-${productId}`);
      const res = await fetch(
        `${API_BASE}/wishlist/remove?userId=${userId}&productId=${productId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setWishlist((prev) => prev.filter((item) => item.productId !== productId));
      setMessage("Removed from wishlist.");
    } catch (err) {
      setMessage(err.message || "Failed to remove item.");
    } finally {
      setActionLoading("");
    }
  };

  const addToCart = async (item) => {
    if (!userId) {
      navigate("/login");
      return false;
    }

    const stock = getStockStatus(item);
    if (stock.tone === "out") {
      setMessage("This item is out of stock.");
      return false;
    }

    try {
      const productObj = {
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        available: item.available
      };
      const success = await contextAddToCart(productObj, 1);
      if (!success) {
        throw new Error("Failed to add item to cart.");
      }
      return true;
    } catch (err) {
      setMessage(err.message || "Failed to add item to cart.");
      return false;
    }
  };

  const handleAddToCart = async (item) => {
    setActionLoading(`cart-${item.productId}`);
    const added = await addToCart(item);
    if (added) {
      setMessage(`${item.name} added to cart.`);
    }
    setActionLoading("");
  };

  const handleMoveToCart = async (item) => {
    setActionLoading(`move-${item.productId}`);
    const added = await addToCart(item);
    if (added) {
      await handleRemove(item.productId);
      setMessage(`${item.name} moved to cart.`);
    }
    setActionLoading("");
  };

  const handleBuyNow = async (item) => {
    setActionLoading(`buy-${item.productId}`);
    const added = await addToCart(item);
    setActionLoading("");
    if (added) {
      navigate("/checkout");
    }
  };

  const togglePriceAlert = (productId) => {
    setPriceAlerts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    setMessage(
      priceAlerts.includes(productId)
        ? "Price drop alert removed."
        : "Price drop alert enabled for this product."
    );
  };

  const handleShareWishlist = async () => {
    const shareData = {
      title: "My Shreenath Cycle Wishlist",
      text: `I saved ${wishlist.length} products in my Shreenath Cycle wishlist.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyTextToClipboard(window.location.href);
        setMessage("Wishlist link copied to clipboard.");
      }
    } catch {
      setMessage("Wishlist sharing is not available right now.");
    }
  };

  const recommendedToShow = recommendedProducts
    .filter((product) => !wishlistProductIds.includes(Number(product.id)))
    .slice(0, 4);

  if (!user) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty-state standalone">
          <FaHeart className="empty-icon" />
          <h1>My Wishlist</h1>
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
        <button className="back-link" onClick={() => navigate("/")}>
          <FaArrowLeft /> Continue Shopping
        </button>

        <header className="wishlist-header">
          <div>
            <span className="wishlist-eyebrow">Saved favourites</span>
            <h1>My Wishlist</h1>
            <p>{wishlist.length} saved {wishlist.length === 1 ? "product" : "products"} ready for your next ride.</p>
          </div>
          <button className="share-wishlist-btn" onClick={handleShareWishlist} disabled={wishlist.length === 0}>
            <FaShareAlt /> Share Wishlist
          </button>
        </header>

        {error && <div className="wishlist-error">{error}</div>}
        {message && <div className="wishlist-message">{message}</div>}

        {wishlist.length === 0 ? (
          <div className="wishlist-empty-state">
            <FaHeart className="empty-icon" />
            <h2>Your wishlist is empty</h2>
            <p>Save items you love by clicking the heart icon on any product.</p>
            <button className="wishlist-browse-btn" onClick={() => navigate("/")}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <section className="wishlist-panel">
            <div className="wishlist-section-title">
              <h2>Saved Products</h2>
              <span>Current price, rating, stock, and quick actions</span>
            </div>

            <div className="wishlist-list">
              {wishlist.map((item) => {
                const listPrice = getListPrice(item);
                const price = Number(item.price || 0);
                const savings = Math.max(listPrice - price, 0);
                const savingsPercent = listPrice > 0 ? Math.round((savings / listPrice) * 100) : 0;
                const stock = getStockStatus(item);
                const alertEnabled = priceAlerts.includes(item.productId);

                return (
                  <article key={item.wishlistId} className="wishlist-card">
                    <Link to={`/product/${item.productId}`} className="wishlist-img-link">
                      <img
                        src={`${API_BASE}/product/${item.productId}/image`}
                        alt={item.name}
                        className="wishlist-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e8eeff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234f52c8' font-size='14' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </Link>

                    <div className="wishlist-info">
                      <div className="wishlist-meta-row">
                        <span className="wishlist-brand">{item.brand || "Shreenath Select"}</span>
                        <span className={`wishlist-stock stock-${stock.tone}`}>{stock.label}</span>
                      </div>

                      <Link to={`/product/${item.productId}`} className="wishlist-name">
                        {item.name}
                      </Link>

                      <div className="wishlist-rating">
                        {renderStars(item.averageRating)}
                        <span>
                          {(item.averageRating || 0).toFixed(1)} ({item.reviewCount || 0})
                        </span>
                      </div>

                      <div className="wishlist-price-row">
                        <strong>{formatMoney(item.price)}</strong>
                        {listPrice > price && <span className="wishlist-list-price">{formatMoney(listPrice)}</span>}
                        {savingsPercent > 0 && <span className="wishlist-discount"><FaTag /> {savingsPercent}% off</span>}
                      </div>

                      <button
                        className={`price-alert-btn${alertEnabled ? " active" : ""}`}
                        onClick={() => togglePriceAlert(item.productId)}
                      >
                        <FaBell /> {alertEnabled ? "Price Alert On" : "Notify Price Drop"}
                      </button>
                    </div>

                    <div className="wishlist-actions">
                      <button
                        className="wishlist-cart-btn"
                        onClick={() => handleAddToCart(item)}
                        disabled={actionLoading === `cart-${item.productId}` || stock.tone === "out"}
                      >
                        <FaShoppingCart /> {actionLoading === `cart-${item.productId}` ? "Adding..." : "Add to Cart"}
                      </button>

                      <button
                        className="wishlist-buy-btn"
                        onClick={() => handleBuyNow(item)}
                        disabled={actionLoading === `buy-${item.productId}` || stock.tone === "out"}
                      >
                        Buy Now
                      </button>

                      <button
                        className="move-cart-btn"
                        onClick={() => handleMoveToCart(item)}
                        disabled={actionLoading === `move-${item.productId}` || stock.tone === "out"}
                      >
                        Move to Cart
                      </button>

                      <button
                        className="wishlist-remove-btn"
                        onClick={() => handleRemove(item.productId)}
                        disabled={actionLoading === `remove-${item.productId}`}
                      >
                        <FaTrash /> Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="wishlist-recommendations">
          <div className="wishlist-section-title">
            <h2>Similar Products</h2>
            <span>Recommended products you may also like</span>
          </div>

          {recommendedToShow.length > 0 ? (
            <div className="recommendation-grid">
              {recommendedToShow.map((product) => (
                <Link to={`/product/${product.id}`} className="recommendation-card" key={product.id}>
                  <img
                    src={`${API_BASE}/product/${product.id}/image`}
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='160' viewBox='0 0 250 160'%3E%3Crect width='250' height='160' fill='%23e8eeff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234f52c8' font-size='12' font-family='sans-serif'%3EProduct%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <span>{product.brand || product.category || "Recommended"}</span>
                  <strong>{product.name}</strong>
                  <p>{formatMoney(product.price)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="recommendation-empty">Recommendations will appear once products are available.</p>
          )}
        </section>
      </div>
    </div>
  );
}
