import React, { useEffect, useState } from "react";
import "./Orders.css";

const getOrders = (userId) => {
  return fetch(`http://localhost:8080/api/orders/user/${userId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    });
};

export default function Orders() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      getOrders(user.id)
        .then(setOrders)
        .catch(() => setError("Unable to load orders"));
    }
  }, [user]);

  if (!user) {
    return <h3>Please login to view your orders.</h3>;
  }

  return (
    <div className="orders-page">
      <h2>Your Orders</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Total Amount:</strong> ₹{order.totalAmount}</p>
            <p><strong>Address:</strong> {order.address}</p>
            <p><strong>Order Date:</strong> {order.orderDate}</p>

            {/* ✅ ORDER ITEMS */}
            <div className="order-items">
              <h4>Ordered Items:</h4>
              {order.items && order.items.length > 0 ? (
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id} className="order-item">
                      <strong>{item.name}</strong> — ₹{item.price}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No items found</p>
              )}
            </div>

            <p><strong>Status:</strong> Placed</p>
          </div>
        ))
      )}
    </div>
  );
}
