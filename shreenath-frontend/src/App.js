import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AppProvider from "./Context/AppProvider";

import Navbar from "./component/Navbar";
import Footer from "./component/Footer";

import Home from "./component/Home";
import Login from "./component/Login";
import Register from "./component/Register";
import AddProduct from "./component/AddProduct";
import Cart from "./component/Cart";
import Product from "./component/Product";
import UpdateProduct from "./component/UpdateProduct";
import CheckoutPopup from "./component/CheckoutPopup";
import MakePayment from "./component/MakePayment";
import UserAccount from "./component/UserAccount";
import Orders from "./component/orders.jsx";
import Wishlist from "./component/Wishlist.jsx";
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
