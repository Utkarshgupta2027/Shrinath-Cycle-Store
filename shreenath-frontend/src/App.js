import React, { lazy, Suspense, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";

import AppProvider from "./Context/AppProvider";
import AppContext from "./Context/Context";
import { THEME_EVENT, syncThemeFromStorage } from "./utils/theme";
import { trackPageView } from "./utils/analytics";
import { gaTrackPageView } from "./utils/googleAnalytics";
import { getStoredUser, isAdminUser } from "./utils/auth";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// ─── Eager imports (critical, always needed) ───────────────
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";

// ─── Lazy imports (code-split, loaded only when visited) ───
const AddProduct    = lazy(() => import("./components/AddProduct"));
const Cart          = lazy(() => import("./components/Cart"));
const Product       = lazy(() => import("./components/Product"));
const UpdateProduct = lazy(() => import("./components/UpdateProduct"));
const CheckoutPopup = lazy(() => import("./components/CheckoutPopup"));
const MakePayment   = lazy(() => import("./components/MakePayment"));
const UserAccount   = lazy(() => import("./components/UserAccount"));
const Orders        = lazy(() => import("./components/orders.jsx"));
const Wishlist      = lazy(() => import("./components/Wishlist.jsx"));
const Settings      = lazy(() => import("./components/Settings.jsx"));
const Dashboard     = lazy(() => import("./pages/Dashboard.jsx"));
const AdminPanel    = lazy(() => import("./pages/AdminPanel.jsx"));
const TrackOrder    = lazy(() => import("./pages/TrackOrder.jsx"));
const Feedback      = lazy(() => import("./components/Feedback.jsx"));
const AddressBook   = lazy(() => import("./components/AddressBook.jsx"));

// ─── Loading fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      background: "var(--theme-bg, #080d28)",
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: "3px solid rgba(54,173,163,0.18)",
        borderTop: "3px solid #36ADA3",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AdminRoute({ children }) {
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppLayout() {
  const location = useLocation();
  // Read user from React context (authoritative live state) so analytics
  // always sends the correct userId — even immediately after login.
  const { user } = useContext(AppContext);
  const hideNavbar = ["/login", "/register", "/addproduct"].includes(location.pathname)
    || location.pathname.startsWith("/updateproduct/");

  useEffect(() => {
    // Reset scroll to top on page navigation
    window.scrollTo(0, 0);
    syncThemeFromStorage();
    // Pass userId explicitly so the analytics call uses the live React state,
    // not a potentially stale localStorage read.
    trackPageView(location.pathname, user?.id ?? null);
    // GA4 page view
    gaTrackPageView(location.pathname);
  }, [location.pathname, user?.id]);

  useEffect(() => {
    const syncTheme = () => {
      syncThemeFromStorage();
    };

    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_EVENT, syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_EVENT, syncTheme);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!hideNavbar && <Navbar />}
      <div style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Critical routes (not lazy) ── */}
            <Route path="/"          element={<Home />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />

            {/* ── Lazy-loaded routes ── */}
            <Route path="/addproduct"             element={<AdminRoute><AddProduct /></AdminRoute>} />
            <Route path="/cart"                   element={<Cart />} />
            <Route path="/product/:productId"     element={<Product />} />
            <Route path="/updateproduct/:id"      element={<AdminRoute><UpdateProduct /></AdminRoute>} />
            <Route path="/checkout"               element={<CheckoutPopup />} />
            <Route path="/makepayment"            element={<MakePayment />} />
            <Route path="/useraccount"            element={<UserAccount />} />
            <Route path="/orders"                 element={<Orders />} />
            <Route path="/wishlist"               element={<Wishlist />} />
            <Route path="/settings"              element={<Settings />} />
            <Route path="/dashboard"              element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route path="/admin"                  element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/track/:orderId"         element={<TrackOrder />} />
            <Route path="/feedback"              element={<Feedback />} />
            <Route path="/addresses"             element={<AddressBook />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout />
      </Router>
    </AppProvider>
  );
}

export default App;
