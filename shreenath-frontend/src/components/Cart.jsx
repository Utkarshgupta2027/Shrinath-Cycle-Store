import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { API_BASE_URL } from "../config";
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
import AppContext from "../Context/Context";
import "../styles/components/Cart.css";

const API_BASE = `${API_BASE_URL}/api`;
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
  const { user, cart: cartItems, updateQuantity, removeFromCart } = useContext(AppContext);
  const userId = user?.id;

  const [savedItems, setSavedItems] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const localSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const calculateLocalSummary = useCallback((items, code = "") => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const deliveryCharges = subtotal === 0 || subtotal >= 2000 ? 0 : 99;
    return {
      subtotal,
      discountAmount: 0,
      deliveryCharges,
      finalTotal: Math.max(subtotal + deliveryCharges, 0),
      couponCode: "",
      couponMessage: code ? "Unable to validate coupon. Check connection." : "No coupon applied.",
    };
  }, []);

  const fetchSummary = useCallback(async (code = appliedCoupon, items = []) => {
    if (!userId) {
      const fallback = calculateLocalSummary(items, code);
      setSummary(fallback);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/cart/summary`, {
        params: { userId, couponCode: code || "" },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setSummary(res.data);
      setAppliedCoupon(res.data.couponCode || "");
      if (code) {
        setMessage(res.data.couponMessage || "");
      }
    } catch {
      // Fallback: validate via coupon API
      try {
        if (code) {
          const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
          const valRes = await axios.post(`${API_BASE}/coupon/validate`, { code, userId, subtotal }, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          });
          const v = valRes.data;
          const deliveryCharges = subtotal === 0 || subtotal >= 2000 ? 0 : 99;
          setSummary({
            subtotal,
            discountAmount: v.discountAmount || 0,
            deliveryCharges,
            finalTotal: Math.max(subtotal - (v.discountAmount || 0) + deliveryCharges, 0),
            couponCode: v.appliedCode || "",
            couponMessage: v.message || "",
          });
          setAppliedCoupon(v.appliedCode || "");
          setMessage(v.message || "");
        } else {
          const fallback = calculateLocalSummary(items, code);
          setSummary(fallback);
          setAppliedCoupon("");
        }
      } catch {
        const fallback = calculateLocalSummary(items, code);
        setSummary(fallback);
        setAppliedCoupon(fallback.couponCode);
        setMessage(fallback.couponMessage);
      }
    }
  }, [appliedCoupon, calculateLocalSummary, userId]);

  useEffect(() => {
    fetchSummary(appliedCoupon, cartItems);
  }, [cartItems, fetchSummary, appliedCoupon]);

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
      const success = await updateQuantity(productId, nextQuantity);
      if (!success) {
        setMessage("Could not update quantity. Check if stock is available.");
      }
    } catch (error) {
      console.error("Quantity update failed", error);
      setMessage(error.message || "Could not update quantity.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      setLoadingAction(`remove-${productId}`);
      const success = await removeFromCart(productId);
      if (success) {
        setMessage("Item removed from cart.");
      } else {
        setMessage("Could not remove item from cart.");
      }
    } catch (error) {
      console.error("Backend failed to delete item:", error);
      setMessage(error.message || "Could not remove item from cart.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleMoveToWishlist = async (item) => {
    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      setLoadingAction(`wishlist-${item.id}`);
      const response = await axios.post(`${API_BASE}/cart/move-to-wishlist`, null, {
        params: { userId, productId: item.id },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setSavedItems((prev) => [item, ...prev.filter((saved) => saved.id !== item.id)]);
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

  const handleCheckoutClick = () => {
    if (!userId) {
      navigate("/login", { state: { from: "/cart" } });
    } else {
      navigate("/checkout");
    }
  };

  const canCheckout = cartItems.length > 0;

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
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23e8eeff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234f52c8' font-size='12' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
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

                <button className="checkout-btn" onClick={handleCheckoutClick} disabled={!canCheckout}>
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
