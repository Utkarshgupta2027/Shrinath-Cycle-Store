import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaComments,
  FaHeart,
  FaLock,
  FaMinus,
  FaPlus,
  FaShieldAlt,
  FaShoppingBag,
  FaTag,
  FaTrash,
  FaTruck,
  FaUndoAlt,
} from "react-icons/fa";
import { getStoredUser } from "../utils/auth";
import "../styles/components/Cart.css";

const API_BASE = "http://localhost:8080/api";
const DEFAULT_SUMMARY = {
  subtotal: 0,
  discountAmount: 0,
  deliveryCharges: 0,
  finalTotal: 0,
  couponCode: "",
  couponMessage: "No coupon applied.",
};

const Cart = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const userId = user?.id;

  const [cartItems, setCartItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const normalizeCartItems = (cart) => {
    if (!cart?.items) {
      return [];
    }

    return cart.items.map((ci) => ({
      ...ci.product,
      stockQuantity: ci.product?.quantity ?? 0,
      quantity: ci.quantity,
      cartItemId: ci.id,
    }));
  };

  const localSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const calculateLocalSummary = useCallback((items, code = "") => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const normalizedCode = code.trim().toUpperCase();
    const discountAmount = normalizedCode === "RIDE10" && subtotal >= 1000 ? Math.round(subtotal * 0.1) : 0;
    const deliveryCharges = subtotal === 0 || subtotal >= 2000 ? 0 : 99;

    return {
      subtotal,
      discountAmount,
      deliveryCharges,
      finalTotal: Math.max(subtotal - discountAmount + deliveryCharges, 0),
      couponCode: discountAmount > 0 ? normalizedCode : "",
      couponMessage: discountAmount > 0 ? "RIDE10 applied successfully." : normalizedCode ? "Coupon not applied." : "No coupon applied.",
    };
  }, []);

  const fetchSummary = useCallback(async (code = appliedCoupon, items = []) => {
    if (!userId) {
      setSummary(DEFAULT_SUMMARY);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/cart/summary`, {
        params: { userId, couponCode: code || "" },
      });
      setSummary(res.data);
      setAppliedCoupon(res.data.couponCode || "");
      if (code) {
        setMessage(res.data.couponMessage || "");
      }
    } catch (error) {
      const fallback = calculateLocalSummary(items, code);
      setSummary(fallback);
      setAppliedCoupon(fallback.couponCode);
      setMessage(error.response?.data || fallback.couponMessage);
    }
  }, [appliedCoupon, calculateLocalSummary, userId]);

  const fetchCart = useCallback(async () => {
    if (!userId) {
      setCartItems([]);
      setSummary(DEFAULT_SUMMARY);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/cart/users/${userId}`);
      const items = normalizeCartItems(res.data);
      setCartItems(items);
      await fetchSummary(appliedCoupon, items);
    } catch (error) {
      console.error("Fetch error details:", error.response || error);
      setMessage("Could not load cart. Please check if backend is running.");
    }
  }, [appliedCoupon, fetchSummary, userId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const getStockStatus = (item) => {
    const stockQuantity = Number(item.stockQuantity) || 0;

    if (!item.available || stockQuantity <= 0) {
      return { label: "Out of stock", tone: "out", detail: "Remove or save for later" };
    }

    if (stockQuantity <= 5) {
      return { label: "Low stock", tone: "low", detail: `Only ${stockQuantity} left` };
    }

    return { label: "In stock", tone: "in", detail: "Ready for dispatch" };
  };

  const handleQuantityChange = async (productId, nextQuantity) => {
    if (nextQuantity < 1) return;

    try {
      setLoadingAction(`qty-${productId}`);
      const response = await axios.put(`${API_BASE}/cart/update`, null, {
        params: { userId, productId, quantity: nextQuantity },
      });
      const items = normalizeCartItems(response.data);
      setCartItems(items);
      await fetchSummary(appliedCoupon, items);
    } catch (error) {
      console.error("Quantity update failed", error);
      setMessage(error.response?.data || "Could not update quantity.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      setLoadingAction(`remove-${productId}`);
      const response = await axios.delete(`${API_BASE}/cart/remove`, {
        params: { userId, productId },
      });
      const items = normalizeCartItems(response.data);
      setCartItems(items);
      await fetchSummary(appliedCoupon, items);
      setMessage("Item removed from cart.");
    } catch (error) {
      console.error("Backend failed to delete item:", error);
      setMessage(error.response?.data || "Could not remove item from cart.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleMoveToWishlist = async (item) => {
    try {
      setLoadingAction(`wishlist-${item.id}`);
      const response = await axios.post(`${API_BASE}/cart/move-to-wishlist`, null, {
        params: { userId, productId: item.id },
      });
      const items = normalizeCartItems(response.data);
      setCartItems(items);
      setSavedItems((prev) => [item, ...prev.filter((saved) => saved.id !== item.id)]);
      await fetchSummary(appliedCoupon, items);
      setMessage(`${item.name} moved to wishlist and saved for later.`);
    } catch (error) {
      console.error("Move to wishlist failed:", error);
      setMessage(error.response?.data || "Could not move item to wishlist.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    await fetchSummary(couponCode, cartItems);
  };

  const handleClearCoupon = async () => {
    setCouponCode("");
    setAppliedCoupon("");
    await fetchSummary("", cartItems);
    setMessage("Coupon removed.");
  };

  const canCheckout = cartItems.length > 0 && summary.finalTotal > 0;

  if (!userId) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="empty-cart standalone">
            <FaShoppingBag />
            <h1>My Cart</h1>
            <p>Please login to view your cart and checkout securely.</p>
            <button className="checkout-btn" onClick={() => navigate("/login")}>Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <button className="back-link" onClick={() => navigate("/")}>
          <FaArrowLeft /> Continue Shopping
        </button>

        <header className="cart-header">
          <div>
            <span className="cart-eyebrow">Checkout ready</span>
            <h1>My Cart</h1>
            <p>{cartItems.length} {cartItems.length === 1 ? "item" : "items"} selected for your next ride.</p>
          </div>
          <div className="cart-header-badge">
            <FaShieldAlt />
            <span>Secure cart protected</span>
          </div>
        </header>

        {message && <div className="cart-message">{message}</div>}

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <FaShoppingBag />
            <h2>Your cart is empty.</h2>
            <p>Add cycles, parts, or accessories to see them here.</p>
            <button className="checkout-btn" onClick={() => navigate("/")}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <section className="cart-main-card">
              <div className="cart-section-title">
                <h2>Added Products</h2>
                <span>{cartItems.length} products</span>
              </div>

              <ul className="cart-list">
                {cartItems.map((item) => {
                  const stock = getStockStatus(item);
                  const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

                  return (
                    <li key={item.id} className="cart-item">
                      <Link to={`/product/${item.id}`} className="cart-item-image-wrapper">
                        <img
                          src={`${API_BASE}/product/${item.id}/image`}
                          alt={item.name}
                          className="cart-item-img"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/120";
                          }}
                        />
                      </Link>

                      <div className="cart-item-details">
                        <span className="item-brand">{item.brand || item.category || "Shreenath Select"}</span>
                        <Link to={`/product/${item.id}`} className="item-name">{item.name}</Link>
                        <div className="item-meta-row">
                          <span className="item-price">Price: {formatMoney(item.price)}</span>
                          <span className={`stock-pill stock-${stock.tone}`}>{stock.label}</span>
                        </div>
                        <p className="delivery-info"><FaTruck /> Estimated delivery in 2-5 business days</p>
                        <p className="stock-detail">{stock.detail}</p>
                      </div>

                      <div className="cart-item-actions">
                        <div className="quantity-controls" aria-label={`Quantity selector for ${item.name}`}>
                          <button
                            className="qty-btn"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || loadingAction === `qty-${item.id}`}
                          >
                            <FaMinus />
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            className="qty-btn"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={loadingAction === `qty-${item.id}`}
                          >
                            <FaPlus />
                          </button>
                        </div>

                        <div className="item-total">
                          <span>Item Total</span>
                          <strong>{formatMoney(lineTotal)}</strong>
                        </div>

                        <div className="item-action-buttons">
                          <button className="move-btn" onClick={() => handleMoveToWishlist(item)} disabled={loadingAction === `wishlist-${item.id}`}>
                            <FaHeart /> Move to Wishlist
                          </button>
                          <button className="remove-btn" onClick={() => handleRemoveFromCart(item.id)} disabled={loadingAction === `remove-${item.id}`}>
                            <FaTrash /> Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="cart-sidebar">
              <section className="coupon-card">
                <h2><FaTag /> Apply Coupon</h2>
                <form onSubmit={handleApplyCoupon} className="coupon-form">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Try RIDE10"
                  />
                  <button type="submit">Apply</button>
                </form>
                {appliedCoupon ? (
                  <div className="applied-coupon">
                    <span>{appliedCoupon}</span>
                    <button type="button" onClick={handleClearCoupon}>Remove</button>
                  </div>
                ) : (
                  <p>Use RIDE10 for 10% off above Rs. 1,000.</p>
                )}
                <strong className="discount-line">Discount: {formatMoney(summary.discountAmount)}</strong>
              </section>

              <section className="cart-summary">
                <h2>Price Summary</h2>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatMoney(summary.subtotal || localSubtotal)}</span>
                </div>
                <div className="summary-row discount-row">
                  <span>Discount amount</span>
                  <span>- {formatMoney(summary.discountAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery charges</span>
                  <span>{Number(summary.deliveryCharges) === 0 ? "Free" : formatMoney(summary.deliveryCharges)}</span>
                </div>
                <div className="summary-row total-row">
                  <span>Final total</span>
                  <span>{formatMoney(summary.finalTotal || localSubtotal)}</span>
                </div>

                <button className="checkout-btn" onClick={() => navigate("/checkout")} disabled={!canCheckout}>
                  Proceed to Checkout
                </button>
                <button className="continue-btn" onClick={() => navigate("/")}>
                  Continue Shopping
                </button>
              </section>

              <section className="trust-card">
                <div><FaLock /> Secure checkout</div>
                <div><FaCheckCircle /> Genuine products</div>
                <div><FaUndoAlt /> Easy return support</div>
              </section>

              <section className="support-card-cart">
                <FaComments />
                <h2>Need help?</h2>
                <p>Call our team for size, delivery, payment, or order support.</p>
                <a href="tel:+917052050415">+91 70520 50415</a>
              </section>
            </aside>
          </div>
        )}

        <section className="save-later-section">
          <div className="cart-section-title">
            <h2>Save for Later</h2>
            <span>{savedItems.length} moved item{savedItems.length === 1 ? "" : "s"}</span>
          </div>
          {savedItems.length > 0 ? (
            <div className="saved-grid">
              {savedItems.map((item) => (
                <Link to={`/product/${item.id}`} className="saved-card" key={item.id}>
                  <img src={`${API_BASE}/product/${item.id}/image`} alt={item.name} />
                  <span>{item.brand || item.category}</span>
                  <strong>{item.name}</strong>
                  <p>{formatMoney(item.price)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="save-empty">Move items to wishlist to keep them here for later.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Cart;
