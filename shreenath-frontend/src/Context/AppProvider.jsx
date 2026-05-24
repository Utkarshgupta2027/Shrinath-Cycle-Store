import React, { useState, useEffect, useCallback } from "react";
import AppContext from "./Context";
import { getStoredUser, setStoredUser, clearStoredAuth } from "../utils/auth";

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  // Helper to get guest cart
  const getGuestCart = () => {
    try {
      const stored = localStorage.getItem("guest_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Helper to save guest cart
  const saveGuestCart = (items) => {
    localStorage.setItem("guest_cart", JSON.stringify(items));
  };

  // Fetch cart
  const fetchCart = useCallback(async (currentUserId = user?.id) => {
    if (!currentUserId) {
      const guestItems = getGuestCart();
      setCart(guestItems);
      setCartCount(guestItems.reduce((acc, item) => acc + (item.quantity || 1), 0));
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/cart/users/${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.items) {
          const normalized = data.items.map(item => ({
            ...item.product,
            stockQuantity: item.product?.quantity ?? 0,
            quantity: item.quantity,
            cartItemId: item.id
          }));
          setCart(normalized);
          setCartCount(data.items.reduce((acc, item) => acc + (item.quantity || 1), 0));
        } else {
          setCart([]);
          setCartCount(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch cart from server", err);
    }
  }, [user?.id]);

  // Initial cart load and user synchronization
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Merge guest cart to backend after login
  const mergeCart = async (userId, token) => {
    const guestItems = getGuestCart();
    if (guestItems.length > 0) {
      for (const item of guestItems) {
        try {
          const params = new URLSearchParams({
            userId: String(userId),
            productId: String(item.id),
            quantity: String(item.quantity)
          });
          await fetch(`http://localhost:8080/api/cart/add?${params}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (err) {
          console.error("Failed to merge item to database cart", err);
        }
      }
      localStorage.removeItem("guest_cart");
    }
    await fetchCart(userId);
  };

  const login = async (userData, token) => {
    setStoredUser(userData);
    localStorage.setItem("userId", String(userData.id));
    localStorage.setItem("token", token);
    setUser(userData);
    await mergeCart(userData.id, token);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setCart([]);
    setCartCount(0);
  };

  const addToCart = async (product, quantity = 1) => {
    if (user?.id) {
      try {
        const params = new URLSearchParams({
          userId: String(user.id),
          productId: String(product.id),
          quantity: String(quantity)
        });
        const response = await fetch(`http://localhost:8080/api/cart/add?${params}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          await fetchCart(user.id);
          return true;
        } else {
          const errMsg = await response.text();
          throw new Error(errMsg || "Failed to add to cart.");
        }
      } catch (err) {
        console.error(err);
        throw err;
      }
    } else {
      // Guest add
      const guestItems = getGuestCart();
      const exists = guestItems.find(item => item.id === product.id);
      let updated;
      if (exists) {
        updated = guestItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        updated = [...guestItems, { ...product, quantity, stockQuantity: product.quantity || 0 }];
      }
      saveGuestCart(updated);
      setCart(updated);
      setCartCount(updated.reduce((acc, item) => acc + (item.quantity || 1), 0));
      return true;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (user?.id) {
      try {
        const params = new URLSearchParams({
          userId: String(user.id),
          productId: String(productId),
          quantity: String(quantity)
        });
        const response = await fetch(`http://localhost:8080/api/cart/update?${params}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          await fetchCart(user.id);
          return true;
        } else {
          const errMsg = await response.text();
          throw new Error(errMsg || "Failed to update quantity.");
        }
      } catch (err) {
        console.error(err);
        throw err;
      }
    } else {
      const guestItems = getGuestCart();
      let updated;
      if (quantity <= 0) {
        updated = guestItems.filter(item => item.id !== productId);
      } else {
        updated = guestItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        );
      }
      saveGuestCart(updated);
      setCart(updated);
      setCartCount(updated.reduce((acc, item) => acc + (item.quantity || 1), 0));
      return true;
    }
  };

  const removeFromCart = async (productId) => {
    if (user?.id) {
      try {
        const params = new URLSearchParams({
          userId: String(user.id),
          productId: String(productId)
        });
        const response = await fetch(`http://localhost:8080/api/cart/remove?${params}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          await fetchCart(user.id);
          return true;
        } else {
          const errMsg = await response.text();
          throw new Error(errMsg || "Failed to remove item.");
        }
      } catch (err) {
        console.error(err);
        throw err;
      }
    } else {
      const guestItems = getGuestCart();
      const updated = guestItems.filter(item => item.id !== productId);
      saveGuestCart(updated);
      setCart(updated);
      setCartCount(updated.reduce((acc, item) => acc + (item.quantity || 1), 0));
      return true;
    }
  };

  const clearCart = async () => {
    if (user?.id) {
      try {
        const params = new URLSearchParams({
          userId: String(user.id)
        });
        const response = await fetch(`http://localhost:8080/api/cart/clear?${params}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          await fetchCart(user.id);
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    } else {
      localStorage.removeItem("guest_cart");
      setCart([]);
      setCartCount(0);
      return true;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        cart,
        cartCount,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
