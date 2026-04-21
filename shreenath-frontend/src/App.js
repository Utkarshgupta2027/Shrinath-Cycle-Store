import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AppProvider from "./Context/AppProvider";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import AddProduct from "./components/AddProduct";
import Cart from "./components/Cart";
import Product from "./components/Product";
import UpdateProduct from "./components/UpdateProduct";
import CheckoutPopup from "./components/CheckoutPopup";
import MakePayment from "./components/MakePayment";
import UserAccount from "./components/UserAccount";
import Orders from "./components/orders.jsx";
import Wishlist from "./components/Wishlist.jsx";
import Settings from "./components/Settings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

function App() {
  return (
    <AppProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/addproduct" element={<AddProduct />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/product/:productId" element={<Product />} />
              <Route path="/updateproduct/:id" element={<UpdateProduct />} />
              <Route path="/checkout" element={<CheckoutPopup />} />
              <Route path="/makepayment" element={<MakePayment />} />
              <Route path="/useraccount" element={<UserAccount />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
