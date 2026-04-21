import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaPlus, FaMinus, FaArrowLeft } from "react-icons/fa";
import "../styles/components/Cart.css";

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  const storedUser = localStorage.getItem("user");
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    user = null;
  }
  const userId = user?.id;

  const normalizeCartItems = (cart) => {
    if (!cart?.items) {
      return [];
    }

    return cart.items.map((ci) => ({
      ...ci.product,
      quantity: ci.quantity,
      cartItemId: ci.id,
    }));
  };

  const fetchCart = useCallback(async () => {
    if (!userId) {
      setCartItems([]);
      return;
    }

    try {
      const res = await axios.get(`http://localhost:8080/api/cart/users/${userId}`);
      setCartItems(normalizeCartItems(res.data));
    } catch (error) {
      console.error("Fetch error details:", error.response || error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchCart();
  }, [fetchCart, userId]);

  useEffect(() => {
    const total = cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
    setTotalPrice(total);
  }, [cartItems]);

  const handleIncreaseQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (!item) return;

    try {
      const response = await axios.put("http://localhost:8080/api/cart/update", null, {
        params: { userId, productId, quantity: item.quantity + 1 }
      });
      setCartItems(normalizeCartItems(response.data));
    } catch (error) {
      console.error("Quantity update failed", error);
      alert(error.response?.data || "Could not update quantity.");
    }
  };

  const handleDecreaseQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (!item || item.quantity <= 1) return;

    try {
      const response = await axios.put("http://localhost:8080/api/cart/update", null, {
        params: { userId, productId, quantity: item.quantity - 1 }
      });
      setCartItems(normalizeCartItems(response.data));
    } catch (error) {
      console.error("Quantity update failed", error);
      alert(error.response?.data || "Could not update quantity.");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      const response = await axios.delete("http://localhost:8080/api/cart/remove", {
        params: { 
          userId: userId, 
          productId: productId 
        }
      });
      setCartItems(normalizeCartItems(response.data));
    } catch (error) {
      console.error("Backend failed to delete item:", error);
      alert(error.response?.data || "Could not remove item from cart.");
    }
  };

  return (
    <div className="cart-page">
      <div className="cart-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Continue Shopping
        </button>
        
        <div className="shopping-cart-card">
          <h1 className="cart-title">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty.</p>
              <button className="checkout-btn" onClick={() => navigate("/")}>
                Browse Products
              </button>
            </div>
          ) : (
            <div className="cart-content">
              <ul className="cart-list">
                {cartItems.map(item => (
                  <li key={item.id} className="cart-item">
                    <div className="cart-item-image-wrapper">
                      <img
                        src={`http://localhost:8080/api/product/${item.id}/image`}
                        alt={item.name}
                        className="cart-item-img"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/100";
                        }}
                      />
                    </div>

                    <div className="cart-item-details">
                      <span className="item-brand">{item.brand}</span>
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-price">Rs. {item.price}</p>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => handleDecreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                        >
                          <FaMinus />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => handleIncreaseQuantity(item.id)}>
                          <FaPlus />
                        </button>
                      </div>

                      <div className="item-total">
                        Rs. {(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                      </div>

                      <button className="remove-btn" onClick={() => handleRemoveFromCart(item.id)}>
                        <FaTrash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cart-summary">
                <div className="summary-row total-row">
                  <span>Total Amount</span>
                  <span>Rs. {totalPrice.toLocaleString('en-IN')}</span>
                </div>
                
                <button className="checkout-btn" onClick={() => navigate("/checkout")}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
