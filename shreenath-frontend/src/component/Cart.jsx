import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // ✅ CORRECT USER FETCH
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  /* ================= FETCH CART ================= */
  useEffect(() => {
    if (!userId) return;

    const fetchCart = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/cart/users/${userId}`);
        
        if (res.data && res.data.items) {
          const items = res.data.items.map(ci => ({
            ...ci.product,
            quantity: ci.quantity,
            cartItemId: ci.id 
          }));
          setCartItems(items);
        }
      } catch (error) {
        console.error("Fetch error details:", error.response || error);
      }
    };

    fetchCart();
  }, [userId]);

  /* ================= CALCULATE TOTAL PRICE ================= */
  // This was the missing piece. It recalculates every time items or quantities change.
  useEffect(() => {
    const total = cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
    setTotalPrice(total);
  }, [cartItems]);

  /* ================= QUANTITY + ================= */
  const handleIncreaseQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (!item) return;

    try {
      await axios.put("http://localhost:8080/api/cart/update", null, {
        params: { userId, productId, quantity: item.quantity + 1 }
      });

      setCartItems(prev =>
        prev.map(i => i.id === productId ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } catch (error) {
      console.error("Quantity update failed", error);
    }
  };

  /* ================= QUANTITY - ================= */
  const handleDecreaseQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (!item || item.quantity <= 1) return;

    try {
      await axios.put("http://localhost:8080/api/cart/update", null, {
        params: { userId, productId, quantity: item.quantity - 1 }
      });

      setCartItems(prev =>
        prev.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
      );
    } catch (error) {
      console.error("Quantity update failed", error);
    }
  };

  /* ================= REMOVE ITEM ================= */
 const handleRemoveFromCart = async (productId) => {
  try {
    // Note: ensure the key is 'productId' to match @RequestParam Long productId
    await axios.delete("http://localhost:8080/api/cart/remove", {
      params: { 
        userId: userId, 
        productId: productId 
      }
    });

    // Only update UI if the backend call was successful
    setCartItems(prev => prev.filter(item => item.id !== productId));
    alert("Item removed!");
  } catch (error) {
    console.error("Backend failed to delete item:", error);
    //alert("Could not remove item from server.");
  }
};

  return (
    <div className="cart-container">
      <div className="shopping-cart">
        <div className="title">Shopping Bag</div>

        {cartItems.length === 0 ? (
          <div className="empty">
            <h4>Your cart is empty</h4>
          </div>
        ) : (
          <>
            {cartItems.map(item => (
              <li key={item.id} className="cart-item">
                <div className="item">
                  <img
                    src={`http://localhost:8080/api/product/${item.id}/image`}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="description">
                    <span>{item.brand}</span>
                    <span>{item.name}</span>
                  </div>

                  <div className="quantity">
                    <button className="qty-btn" onClick={() => handleIncreaseQuantity(item.id)}>+</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button 
                      className="qty-btn" 
                      onClick={() => handleDecreaseQuantity(item.id)}
                      disabled={item.quantity <= 1}
                    >-</button>
                  </div>

                  <div className="total-price">
                    ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                  </div>

                  <button className="remove-btn" onClick={() => handleRemoveFromCart(item.id)}>🗑</button>
                </div>
              </li>
            ))}

            <div className="total">
               <strong>Total Amount: ₹{totalPrice.toLocaleString('en-IN')}</strong>
            </div>

            <Button className="checkout-btn" style={{ width: "100%" }} onClick={() => navigate("/checkout")}>
              Proceed to Checkout
            </Button>
          </>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Go Back
      </button>
    </div>
  );
};

export default Cart;