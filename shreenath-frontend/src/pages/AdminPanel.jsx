import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaChartLine,
  FaEdit,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaShoppingBag,
  FaTag,
  FaTrash,
  FaTruck,
  FaUndoAlt,
  FaUsers,
  FaWarehouse,
  FaBell,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import { confirmAction } from "../utils/browser";
import "./AdminPanel.css";

const API_BASE = "http://localhost:8080";
const CATEGORY_OPTIONS = {
  Bicycle: ["Mountain", "City", "Kids", "Ladies", "Sports", "Electric"],
  Parts: ["Parts", "Spare Parts", "Tyre", "Tube", "Chain", "Brake", "Pedal", "Rim", "Seat", "Handle", "Frame"],
  Accessories: ["Accessories", "Helmet", "Light", "Lock", "Bottle", "Carrier", "Bag", "Pump", "Bell"],
  Tools: ["Tools", "Repair Kit", "Wrench", "Spanner", "Allen Key", "Maintenance Kit"],
  "New Arrivals": ["New Arrivals"],
};
const CATEGORY_CHOICES = Object.values(CATEGORY_OPTIONS).flat();
const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLATION_REQUESTED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "EXCHANGED",
];
const RETURN_EXCHANGE_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "COMPLETED"];
const INITIAL_PRODUCT_FORM = {
  id: null,
  name: "",
  brand: "",
  desc: "",
  price: "",
  category: "",
  quantity: "",
  releaseDate: "",
  available: true,
};

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const formatDateForInput = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).trim();
  const ddMmYyyyMatch = normalizedValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyyMatch) {
    const [, dd, mm, yyyy] = ddMmYyyyMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const formatDateDdMmYyyy = (isoDate) => {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const getStockState = (quantity) => {
  if (quantity <= 0) return { label: "Out of stock", className: "out-of-stock" };
  if (quantity <= 5) return { label: "Low stock", className: "low-stock" };
  return { label: "In stock", className: "in-stock" };
};

const getStatusClass = (status) => (status || "PENDING").toLowerCase().replaceAll("_", "-");
const normalizeOrderStatus = (status) => {
  if (status === "PLACED") return "PENDING";
  if (status === "PROCESSING") return "CONFIRMED";
  return status || "PENDING";
};

function AdminPanel() {
  const user = getStoredUser();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [productImage, setProductImage] = useState(null);
  const [productPreview, setProductPreview] = useState("");
  const [extraImages, setExtraImages] = useState([]);       // additional gallery files
  const [extraPreviews, setExtraPreviews] = useState([]);   // blob URLs for gallery preview
  const [existingGallery, setExistingGallery] = useState([]); // {id,url} already saved
  const [savingProduct, setSavingProduct] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [serviceablePins, setServiceablePins] = useState([]);
  const [pinForm, setPinForm] = useState({ pincode: "", city: "", state: "", baseCharge: 40, perKgCharge: 10, active: true });
  const [pinFormError, setPinFormError] = useState("");
  const [editingPinId, setEditingPinId] = useState(null);
  const [savingPin, setSavingPin] = useState(false);

  // Feature 10 -- Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "PERCENTAGE", discountValue: "", minOrderValue: "", maxUsageLimit: "", expiryDate: "", couponType: "GENERAL", description: "", active: true });
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Feature 11 -- Low-stock
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [restockValues, setRestockValues] = useState({});
  const [restockLoading, setRestockLoading] = useState({});

  // Feature 12 -- Reviews moderation
  const [pendingReviews, setPendingReviews] = useState([]);

  // Feature 13 -- Store settings / GST
  const [settingsForm, setSettingsForm] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Feature 14 -- Categories
  const [categories, setCategories] = useState([]);
  const [catForm, setCatForm] = useState({ name: "", description: "", featured: false, displayOrder: 0, active: true });
  const [editingCatId, setEditingCatId] = useState(null);
  const [savingCat, setSavingCat] = useState(false);

  // Feature 14 -- Brands
  const [brands, setBrands] = useState([]);
  const [brandForm, setBrandForm] = useState({ name: "", description: "", logoUrl: "", featured: false, displayOrder: 0, active: true });
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [savingBrand, setSavingBrand] = useState(false);

  const isAdmin = isAdminUser(user);

  const loadProducts = useCallback(async () => {
    const productsResponse = await axios.get(`${API_BASE}/api/products`);
    setProducts(productsResponse.data || []);
  }, []);

  const loadOrders = useCallback(async () => {
    const ordersResponse = await axios.get(`${API_BASE}/api/orders/admin`, {
      headers: getAuthHeaders(),
    });
    setOrders(ordersResponse.data || []);
  }, []);

  const loadReturnRequests = useCallback(async () => {
    const requestsResponse = await axios.get(`${API_BASE}/api/orders/admin/return-exchange`, {
      headers: getAuthHeaders(),
    });
    setReturnRequests(requestsResponse.data || []);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const analyticsResponse = await axios.get(`${API_BASE}/api/orders/admin/analytics`, {
      headers: getAuthHeaders(),
    });
    setAnalytics(analyticsResponse.data || null);
  }, []);

  const loadUsers = useCallback(async () => {
    const usersResponse = await axios.get(`${API_BASE}/api/auth/admin/users`, {
      headers: getAuthHeaders(),
    });
    setUsers(usersResponse.data || []);
  }, []);

  const loadServiceablePins = useCallback(async () => {
    const res = await axios.get(`${API_BASE}/api/shipping/admin/pins`, { headers: getAuthHeaders() });
    setServiceablePins(res.data || []);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, ordersResponse, analyticsResponse, usersResponse, requestsResponse] = await Promise.allSettled([
        loadProducts(),
        loadOrders(),
        loadAnalytics(),
        loadUsers(),
        loadReturnRequests(),
      ]);

      if (productsResponse.status === "rejected") {
        console.error("Products load failed:", productsResponse.reason);
        setProducts([]);
      }

      if (ordersResponse.status === "rejected") {
        console.error("Orders load failed:", ordersResponse.reason);
        setOrders([]);
      }

      if (analyticsResponse.status === "rejected") {
        console.error("Analytics load failed:", analyticsResponse.reason);
        setAnalytics(null);
      }

      if (usersResponse.status === "rejected") {
        console.error("Users load failed:", usersResponse.reason);
        setUsers([]);
      }

      if (requestsResponse.status === "rejected") {
        console.error("Return requests load failed:", requestsResponse.reason);
        setReturnRequests([]);
      }

      // Only show a blocking error if BOTH products and orders failed (total failure)
      // Otherwise each section handles its own empty state gracefully
      if (
        productsResponse.status === "rejected" &&
        ordersResponse.status === "rejected"
      ) {
        setError("Could not connect to the server. Please restart the backend and refresh the page.");
      }
      // Non-critical failures (analytics / users) — just log, don't block the UI
    } catch (loadError) {
      console.error(loadError);
      setError(getErrorMessage(loadError, "Failed to load admin dashboard data."));
    } finally {
      setLoading(false);
    }
  }, [loadAnalytics, loadOrders, loadProducts, loadReturnRequests, loadUsers]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadDashboard();
  }, [isAdmin, loadDashboard]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (activeSection === "orders" || activeSection === "overview") {
      loadOrders().catch((error) => {
        console.error(error);
      });
      loadReturnRequests().catch((error) => {
        console.error(error);
      });
    }

    if (activeSection === "analytics" || activeSection === "overview") {
      loadAnalytics().catch((error) => {
        console.error(error);
      });
    }

    if (activeSection === "coupons") {
      axios.get(`${API_BASE}/api/admin/coupons`, { headers: getAuthHeaders() }).then(r => setCoupons(r.data || [])).catch(() => {});
    }
    if (activeSection === "low-stock") {
      axios.get(`${API_BASE}/api/admin/low-stock`, { headers: getAuthHeaders() }).then(r => setLowStockProducts(r.data || [])).catch(() => {});
    }
    if (activeSection === "shipping") {
      loadServiceablePins().catch(console.error);
    }
    if (activeSection === "users" || activeSection === "overview") {
      loadUsers().catch((error) => {
        console.error(error);
      });
    }
    if (activeSection === "reviews") {
      axios.get(`${API_BASE}/api/admin/reviews/pending`, { headers: getAuthHeaders() }).then(r => setPendingReviews(r.data || [])).catch(() => {});
    }
    if (activeSection === "settings") {
      axios.get(`${API_BASE}/api/admin/settings`, { headers: getAuthHeaders() }).then(r => setSettingsForm(r.data || {})).catch(() => {});
    }
    if (activeSection === "categories") {
      axios.get(`${API_BASE}/api/categories/all`).then(r => setCategories(r.data || [])).catch(() => {});
    }
    if (activeSection === "brands") {
      axios.get(`${API_BASE}/api/brands/all`).then(r => setBrands(r.data || [])).catch(() => {});
    }
  }, [activeSection, isAdmin, loadAnalytics, loadOrders, loadReturnRequests, loadUsers]);

  useEffect(() => {
    return () => {
      if (productPreview.startsWith("blob:")) {
        URL.revokeObjectURL(productPreview);
      }
    };
  }, [productPreview]);

  const inventorySummary = useMemo(() => {
    const totalValue = products.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 0),
      0
    );
    const lowStockCount = products.filter((product) => product.quantity > 0 && product.quantity <= 5).length;
    const outOfStockCount = products.filter((product) => Number(product.quantity || 0) <= 0).length;

    return {
      totalValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = [product.name, product.brand, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(inventorySearch.toLowerCase()));

      if (!matchesSearch) {
        return false;
      }

      if (inventoryFilter === "low") {
        return product.quantity > 0 && product.quantity <= 5;
      }

      if (inventoryFilter === "out") {
        return Number(product.quantity || 0) <= 0;
      }

      if (inventoryFilter === "available") {
        return product.available;
      }

      return true;
    });
  }, [inventoryFilter, inventorySearch, products]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeOrderStatus(order.status).toUpperCase();
      const query = orderSearch.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        String(order.id).includes(query) ||
        String(order.userId || "").includes(query) ||
        (order.address || "").toLowerCase().includes(query);

      const matchesFilter = orderFilter === "ALL" || status === orderFilter;
      return matchesSearch && matchesFilter;
    });
  }, [orderFilter, orderSearch, orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const openCreateModal = () => {
    if (productPreview.startsWith("blob:")) {
      URL.revokeObjectURL(productPreview);
    }
    setProductForm(INITIAL_PRODUCT_FORM);
    setProductImage(null);
    setProductPreview("");
    setExtraImages([]);
    extraPreviews.forEach(u => URL.revokeObjectURL(u));
    setExtraPreviews([]);
    setExistingGallery([]);
    setShowProductModal(true);
  };

  const openEditModal = (product) => {
    setProductForm({
      id: product.id,
      name: product.name || "",
      brand: product.brand || "",
      desc: product.desc || "",
      price: product.price ?? "",
      category: product.category || "",
      quantity: product.quantity ?? "",
      releaseDate: formatDateForInput(product.releaseDate),
      available: Boolean(product.available),
    });
    if (productPreview.startsWith("blob:")) {
      URL.revokeObjectURL(productPreview);
    }
    setProductImage(null);
    setProductPreview(`${API_BASE}/api/product/${product.id}/image`);
    // Load existing gallery images
    const ids = product.extraImageIds || [];
    setExistingGallery(ids.map(imgId => ({ id: imgId, url: `${API_BASE}/api/product/${product.id}/gallery/${imgId}` })));
    setExtraImages([]);
    extraPreviews.forEach(u => URL.revokeObjectURL(u));
    setExtraPreviews([]);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    if (savingProduct) {
      return;
    }

    if (productPreview.startsWith("blob:")) {
      URL.revokeObjectURL(productPreview);
    }
    setShowProductModal(false);
    setProductForm(INITIAL_PRODUCT_FORM);
    setProductImage(null);
    setProductPreview("");
    setExtraImages([]);
    extraPreviews.forEach(u => URL.revokeObjectURL(u));
    setExtraPreviews([]);
    setExistingGallery([]);
  };

  const handleProductChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProductForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProductImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProductImage(file);
    if (productPreview.startsWith("blob:")) {
      URL.revokeObjectURL(productPreview);
    }
    if (file) {
      setProductPreview(URL.createObjectURL(file));
    } else if (productForm.id) {
      setProductPreview(`${API_BASE}/api/product/${productForm.id}/image`);
    } else {
      setProductPreview("");
    }
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    if (!productForm.name || !productForm.price || productForm.quantity === "") {
      setError("Please fill product name, price and quantity.");
      return;
    }

    if (!productForm.id && !productImage) {
      setError("Please upload a product image.");
      return;
    }

    try {
      setSavingProduct(true);

      const formData = new FormData();
      if (productImage) {
        formData.append("imgFile", productImage);
      }
      // Append every extra image under the same part name
      extraImages.forEach(f => formData.append("extraImages", f));

      const payload = {
        name: productForm.name,
        brand: productForm.brand,
        desc: productForm.desc,
        price: productForm.price?.toString() ?? "0",
        category: productForm.category,
        quantity: Number(productForm.quantity) || 0,
        releaseDate: formatDateDdMmYyyy(productForm.releaseDate),
        available: Boolean(productForm.available),
      };

      formData.append(
        "product",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );

      if (productForm.id) {
        await axios.put(
          `${API_BASE}/api/product/${productForm.id}?replaceExtra=false`,
          formData,
          { headers: getAuthHeaders() }
        );
      } else {
        await axios.post(`${API_BASE}/api/product`, formData, {
          headers: getAuthHeaders(),
        });
      }

      await loadDashboard();
      closeProductModal();
    } catch (submitError) {
      console.error(submitError);
      setError(getErrorMessage(submitError, "Failed to save product."));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!confirmAction(`Delete "${productName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/product/${productId}`, {
        headers: getAuthHeaders(),
      });
      setProducts((current) => current.filter((product) => product.id !== productId));
      await loadDashboard();
    } catch (deleteError) {
      console.error(deleteError);
      setError(getErrorMessage(deleteError, "Unable to delete product."));
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);
      await axios.put(
        `${API_BASE}/api/orders/${orderId}/status`,
        { status },
        { headers: getAuthHeaders() }
      );
      await loadDashboard();
    } catch (statusError) {
      console.error(statusError);
      setError(getErrorMessage(statusError, "Unable to update order."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirmAction(`Delete order #${orderId}?`)) {
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      await axios.delete(`${API_BASE}/api/orders/${orderId}`, {
        headers: getAuthHeaders(),
      });
      await loadDashboard();
    } catch (deleteError) {
      console.error(deleteError);
      setError(getErrorMessage(deleteError, "Unable to delete order."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleProcessRefund = async (order) => {
    if (!confirmAction(`Process refund for order #${order.id}?`)) {
      return;
    }

    try {
      setUpdatingOrderId(order.id);
      await axios.put(
        `${API_BASE}/api/orders/${order.id}/refund`,
        { amount: order.totalAmount, speed: "normal" },
        { headers: getAuthHeaders() }
      );
      await loadDashboard();
    } catch (refundError) {
      console.error(refundError);
      setError(getErrorMessage(refundError, "Unable to process refund."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleReturnRequestStatusChange = async (requestId, status) => {
    try {
      await axios.put(
        `${API_BASE}/api/orders/admin/return-exchange/${requestId}`,
        { status },
        { headers: getAuthHeaders() }
      );
      await loadDashboard();
    } catch (requestError) {
      console.error(requestError);
      setError(getErrorMessage(requestError, "Unable to update return/exchange request."));
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-empty">
            <p>Only the admin can access this dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              Store <span className="admin-title-accent">Command Center</span>
            </h1>
            <p className="admin-subtitle">
              Inventory management, order operations, revenue analytics, and fast product uploads.
            </p>
          </div>
          <div className="admin-header-actions">
            <button className="secondary-btn" onClick={() => setActiveSection("orders")}>
              <FaTruck /> Review Orders
            </button>
            <button className="add-product-btn" onClick={openCreateModal}>
              <FaPlus /> Upload Product
            </button>
          </div>
        </div>

        <div className="admin-section-switcher">
          {[
            { key: "overview", label: "Overview" },
            { key: "inventory", label: "Inventory" },
            { key: "orders", label: "Orders" },
            { key: "returns", label: "Returns" },
            { key: "users", label: "Users" },
            { key: "analytics", label: "Analytics" },
            { key: "shipping", label: "Shipping" },
            { key: "coupons", label: "Coupons" },
            { key: "low-stock", label: "Low Stock" },
            { key: "reviews", label: "⭐ Reviews" },
            { key: "settings", label: "⚙️ GST/Settings" },
            { key: "categories", label: "🗂️ Categories" },
            { key: "brands", label: "🏷️ Brands" },
          ].map((section) => (
            <button
              key={section.key}
              className={`section-chip${activeSection === section.key ? " active" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {loading ? <div className="admin-loading">Loading dashboard...</div> : null}
        {error ? (
          <div className="admin-error" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} style={{background:"transparent",border:"none",color:"inherit",fontSize:"1.1rem",cursor:"pointer",marginLeft:"1rem",lineHeight:1}}>✕</button>
          </div>
        ) : null}

        {!loading && (
          <>
            {(activeSection === "overview" || activeSection === "analytics") && analytics ? (
              <>
                <div className="admin-stats">
                  <div className="stat-card">
                    <span className="stat-icon"><FaShoppingBag /></span>
                    <span className="stat-value">{analytics.totalOrders}</span>
                    <span className="stat-label">Total Orders</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><FaMoneyBillWave /></span>
                    <span className="stat-value">{formatCurrency(analytics.revenue)}</span>
                    <span className="stat-label">Revenue</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><FaUsers /></span>
                    <span className="stat-value">{users.length}</span>
                    <span className="stat-label">Registered Users</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon"><FaUndoAlt /></span>
                    <span className="stat-value">{analytics.returnedOrders + analytics.cancelledOrders}</span>
                    <span className="stat-label">Canceled / Returned</span>
                  </div>
                </div>

                <div className="analytics-grid">
                  <section className="admin-panel-card analytics-card">
                    <div className="card-heading">
                      <div>
                        <h2>Sales & Revenue</h2>
                        <p>Last 7 days revenue performance</p>
                      </div>
                      <FaChartLine />
                    </div>
                    <div className="chart-bars">
                      {analytics.revenueTrend?.map((point) => (
                        <div className="chart-bar-group" key={`revenue-${point.label}`}>
                          <div
                            className="chart-bar revenue-bar"
                            style={{ height: `${Math.max((point.value / Math.max(...analytics.revenueTrend.map((item) => item.value), 1)) * 160, 12)}px` }}
                          />
                          <span className="chart-label">{point.label}</span>
                          <span className="chart-value">{formatCurrency(point.value)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="admin-panel-card analytics-card">
                    <div className="card-heading">
                      <div>
                        <h2>Traffic & Behavior</h2>
                        <p>Order traffic and lifecycle mix</p>
                      </div>
                      <FaUsers />
                    </div>
                    <div className="mini-metrics">
                      <div className="mini-metric">
                        <span>Fulfilled</span>
                        <strong>{analytics.fulfilledOrders}</strong>
                      </div>
                      <div className="mini-metric">
                        <span>Avg Order Value</span>
                        <strong>{formatCurrency(analytics.averageOrderValue)}</strong>
                      </div>
                      <div className="mini-metric">
                        <span>Units Sold</span>
                        <strong>{analytics.unitsSold}</strong>
                      </div>
                    </div>
                    <div className="behavior-list">
                      {analytics.behaviorBreakdown?.map((point) => (
                        <div className="behavior-row" key={`behavior-${point.label}`}>
                          <span>{point.label}</span>
                          <div className="behavior-track">
                            <div
                              className="behavior-fill"
                              style={{
                                width: `${Math.max((point.value / Math.max(...analytics.behaviorBreakdown.map((item) => item.value), 1)) * 100, point.value > 0 ? 8 : 0)}%`,
                              }}
                            />
                          </div>
                          <strong>{point.value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="traffic-strip">
                      {analytics.trafficTrend?.map((point) => (
                        <div key={`traffic-${point.label}`} className="traffic-pill">
                          <span>{point.label}</span>
                          <strong>{point.value}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            ) : null}

            {(activeSection === "overview" || activeSection === "inventory") && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Inventory Management</h2>
                    <p>Search, review stock health, upload, edit, and delete products quickly.</p>
                  </div>
                </div>

                <div className="inventory-summary">
                  <div className="inventory-tile">
                    <span>Total Products</span>
                    <strong>{products.length}</strong>
                  </div>
                  <div className="inventory-tile">
                    <span>Inventory Value</span>
                    <strong>{formatCurrency(inventorySummary.totalValue)}</strong>
                  </div>
                  <div className="inventory-tile">
                    <span>Low Stock</span>
                    <strong>{inventorySummary.lowStockCount}</strong>
                  </div>
                  <div className="inventory-tile">
                    <span>Out of Stock</span>
                    <strong>{inventorySummary.outOfStockCount}</strong>
                  </div>
                </div>

                <div className="table-toolbar">
                  <div className="table-search">
                    <FaSearch className="table-search-icon" />
                    <input
                      className="table-search-input"
                      placeholder="Search product, brand or category"
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                    />
                  </div>
                  <select
                    className="table-filter-select"
                    value={inventoryFilter}
                    onChange={(event) => setInventoryFilter(event.target.value)}
                  >
                    <option value="all">All inventory</option>
                    <option value="available">Available</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                  </select>
                  <span className="table-count">{filteredProducts.length} items</span>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const stock = getStockState(Number(product.quantity || 0));

                        return (
                          <tr key={product.id}>
                            <td>
                              <div className="product-cell">
                                <div className="product-thumb-wrap">
                                  <img
                                    src={`${API_BASE}/api/product/${product.id}/image`}
                                    alt={product.name}
                                    className="product-thumb"
                                    onError={(event) => {
                                      event.target.src = "https://via.placeholder.com/60";
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="product-cell-name">{product.name}</span>
                                  <div className="product-cell-id">Brand: {product.brand || "N/A"}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className="category-chip">{product.category || "Uncategorized"}</span></td>
                            <td className="price-cell">{formatCurrency(product.price)}</td>
                            <td>{product.quantity}</td>
                            <td>
                              <span className={`stock-badge ${stock.className}`}>{stock.label}</span>
                            </td>
                            <td>
                              <div className="action-btns">
                                <button className="action-btn edit-btn" onClick={() => openEditModal(product)} title="Edit">
                                  <FaEdit />
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteProduct(product.id, product.name)}
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 ? (
                    <div className="empty-inline-state">No products match your current inventory filters.</div>
                  ) : null}
                </div>
              </section>
            )}

            {(activeSection === "overview" || activeSection === "orders") && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Order Management Dashboard</h2>
                    <p>Move orders through Pending, Confirmed, Packed, Shipped, Out for Delivery, and Delivered.</p>
                  </div>
                  <div className="orders-highlight">
                    <FaTruck />
                    <span>{orders.length} total orders</span>
                  </div>
                </div>

                <div className="table-toolbar">
                  <div className="table-search">
                    <FaSearch className="table-search-icon" />
                    <input
                      className="table-search-input"
                      placeholder="Search order id, user id, or address"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                    />
                  </div>
                  <select
                    className="table-filter-select"
                    value={orderFilter}
                    onChange={(event) => setOrderFilter(event.target.value)}
                  >
                    <option value="ALL">All statuses</option>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <span className="table-count">{filteredOrders.length} orders</span>
                </div>

                <div className="orders-admin-list">
                  {filteredOrders.map((order) => (
                    <article key={order.id} className="order-admin-card">
                      <div className="order-admin-header">
                        <div>
                          <h3>Order #{order.id}</h3>
                          <p>User #{order.userId}</p>
                        </div>
                        <span className={`order-status-chip ${getStatusClass(order.status)}`}>
                          {normalizeOrderStatus(order.status)}
                        </span>
                      </div>

                      <div className="order-admin-meta">
                        <span>{formatCurrency(order.totalAmount)}</span>
                        <span>{order.items?.length || 0} items</span>
                        <span>{order.paymentStatus || "PENDING"}</span>
                        <span>
                          {order.orderDate
                            ? new Date(order.orderDate).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>

                      <div className="order-admin-address">{order.address || "No address provided."}</div>
                      {order.cancellationReason ? (
                        <div className="order-admin-address">Cancel reason: {order.cancellationReason}</div>
                      ) : null}
                      {order.refundStatus ? (
                        <div className="order-admin-address">
                          Refund: {order.refundStatus}
                          {order.refundId ? ` (${order.refundId})` : ""}
                        </div>
                      ) : null}

                      <div className="order-admin-items">
                        {(order.items || []).slice(0, 3).map((item) => (
                          <div key={item.id} className="order-admin-item">
                            <span>{item.name}</span>
                            <strong>
                              Qty {item.quantity} - {formatCurrency(item.price)}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div className="order-admin-actions">
                        <div className="update-status-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Update Status:</span>
                          <select
                            className="table-filter-select"
                            value={normalizeOrderStatus(order.status)}
                            disabled={updatingOrderId === order.id}
                            onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(order.status === "CANCELLATION_REQUESTED" || order.refundStatus === "REQUESTED") && (
                          <button
                            className="secondary-inline-btn"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleProcessRefund(order)}
                          >
                            <FaMoneyBillWave /> Refund
                          </button>
                        )}
                        <button
                          className="danger-inline-btn"
                          disabled={updatingOrderId === order.id}
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                  {filteredOrders.length === 0 ? (
                    <div className="empty-inline-state">No orders match your current order filters.</div>
                  ) : null}
                </div>
              </section>
            )}

            {(activeSection === "overview" || activeSection === "returns") && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Return & Exchange Requests</h2>
                    <p>Review customer forms and update request status.</p>
                  </div>
                  <div className="orders-highlight">
                    <FaUndoAlt />
                    <span>{returnRequests.length} requests</span>
                  </div>
                </div>

                <div className="orders-admin-list">
                  {returnRequests.map((request) => (
                    <article key={request.id} className="order-admin-card">
                      <div className="order-admin-header">
                        <div>
                          <h3>{request.requestType} request #{request.id}</h3>
                          <p>Order #{request.orderId} - User #{request.userId}</p>
                        </div>
                        <span className={`order-status-chip ${getStatusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="order-admin-address">{request.reason}</div>
                      {request.preferredResolution ? (
                        <div className="order-admin-address">Preferred: {request.preferredResolution}</div>
                      ) : null}
                      <div className="order-admin-actions">
                        <select
                          className="table-filter-select"
                          value={request.status}
                          onChange={(event) => handleReturnRequestStatusChange(request.id, event.target.value)}
                        >
                          {RETURN_EXCHANGE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                  {returnRequests.length === 0 ? (
                    <div className="empty-inline-state">No return or exchange requests yet.</div>
                  ) : null}
                </div>
              </section>
            )}

            {(activeSection === "overview" || activeSection === "users") && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Registered Users</h2>
                    <p>All users registered on the website with their mobile numbers.</p>
                  </div>
                  <div className="orders-highlight">
                    <FaUsers />
                    <span>{users.length} users</span>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile Number</th>
                        <th>Role</th>
                        <th>Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((registeredUser) => (
                        <tr key={registeredUser.id}>
                          <td>{registeredUser.name || "N/A"}</td>
                          <td>{registeredUser.email || "N/A"}</td>
                          <td className="phone-cell">{registeredUser.phoneNumber || "N/A"}</td>
                          <td>
                            <span className={`order-status-chip ${getStatusClass(registeredUser.role)}`}>
                              {registeredUser.role}
                            </span>
                          </td>
                          <td>{registeredUser.verified ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 ? (
                    <div className="empty-inline-state">No registered users found.</div>
                  ) : null}
                </div>
              </section>
            )}

            {activeSection === "overview" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Recent Operational Snapshot</h2>
                    <p>Quick view of the latest order activity and stock behavior.</p>
                  </div>
                  <FaWarehouse />
                </div>

                <div className="snapshot-grid">
                  <div className="snapshot-card">
                    <h3>Recent Orders</h3>
                    {recentOrders.length === 0 ? (
                      <p className="snapshot-empty">No recent orders yet.</p>
                    ) : (
                      recentOrders.map((order) => (
                        <div className="snapshot-row" key={`recent-${order.id}`}>
                          <span>#{order.id}</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                          <strong className={`snapshot-status ${getStatusClass(order.status)}`}>
                            {order.status || "PLACED"}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="snapshot-card">
                    <h3>Stock Alerts</h3>
                    {products.filter((product) => product.quantity <= 5).slice(0, 6).map((product) => (
                      <div className="snapshot-row" key={`stock-${product.id}`}>
                        <span>{product.name}</span>
                        <span>{product.quantity} left</span>
                        <strong className={`snapshot-status ${getStockState(product.quantity).className}`}>
                          {getStockState(product.quantity).label}
                        </strong>
                      </div>
                    ))}
                    {products.filter((product) => product.quantity <= 5).length === 0 ? (
                      <p className="snapshot-empty">All tracked products are comfortably stocked.</p>
                    ) : null}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
            {/* --- Shipping / Serviceable PINs --------------------------- */}
            {activeSection === "shipping" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Serviceable PIN Codes</h2>
                    <p>Manage which PIN codes your store delivers to, and set shipping charges.</p>
                  </div>
                  <FaTruck />
                </div>

                {/* Add / Edit Form */}
                <div className="shipping-pin-form">
                  <h3>{editingPinId ? "Edit PIN" : "Add Serviceable PIN"}</h3>
                  {pinFormError && <div className="admin-error">{pinFormError}</div>}
                  <div className="shipping-pin-form-grid">
                    <input
                      placeholder="6-digit Pincode *"
                      maxLength={6}
                      value={pinForm.pincode}
                      disabled={!!editingPinId}
                      onChange={(e) => setPinForm((p) => ({ ...p, pincode: e.target.value }))}
                    />
                    <input
                      placeholder="City"
                      value={pinForm.city}
                      onChange={(e) => setPinForm((p) => ({ ...p, city: e.target.value }))}
                    />
                    <input
                      placeholder="State"
                      value={pinForm.state}
                      onChange={(e) => setPinForm((p) => ({ ...p, state: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Base Charge (Rs)"
                      value={pinForm.baseCharge}
                      onChange={(e) => setPinForm((p) => ({ ...p, baseCharge: parseFloat(e.target.value) || 0 }))}
                    />
                    <input
                      type="number"
                      placeholder="Per-kg Charge (Rs)"
                      value={pinForm.perKgCharge}
                      onChange={(e) => setPinForm((p) => ({ ...p, perKgCharge: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="shipping-pin-form-actions">
                    <button
                      className="add-product-btn"
                      disabled={savingPin}
                      onClick={async () => {
                        setPinFormError("");
                        if (!pinForm.pincode || pinForm.pincode.length !== 6) { setPinFormError("Enter a valid 6-digit PIN."); return; }
                        setSavingPin(true);
                        try {
                          if (editingPinId) {
                            await axios.put(`${API_BASE}/api/shipping/admin/pins/${editingPinId}`, pinForm, { headers: getAuthHeaders() });
                          } else {
                            await axios.post(`${API_BASE}/api/shipping/admin/pins`, pinForm, { headers: getAuthHeaders() });
                          }
                          setPinForm({ pincode: "", city: "", state: "", baseCharge: 40, perKgCharge: 10, active: true });
                          setEditingPinId(null);
                          await loadServiceablePins();
                        } catch (err) {
                          setPinFormError(getErrorMessage(err, "Failed to save PIN."));
                        } finally { setSavingPin(false); }
                      }}
                    >
                      {savingPin ? "Saving..." : editingPinId ? "Update PIN" : "Add PIN"}
                    </button>
                    {editingPinId && (
                      <button className="secondary-btn" onClick={() => { setEditingPinId(null); setPinForm({ pincode: "", city: "", state: "", baseCharge: 40, perKgCharge: 10, active: true }); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* PIN Table */}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Pincode</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Base (Rs)</th>
                        <th>Per-kg (Rs)</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceablePins.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>No serviceable PINs yet. Add one above.</td></tr>
                      ) : serviceablePins.map((pin) => (
                        <tr key={pin.id}>
                          <td><strong>{pin.pincode}</strong></td>
                          <td>{pin.city || "�"}</td>
                          <td>{pin.state || "�"}</td>
                          <td>Rs. {pin.baseCharge}</td>
                          <td>Rs. {pin.perKgCharge}</td>
                          <td>
                            <span className={`stock-pill ${pin.active ? "in-stock" : "out-of-stock"}`}>
                              {pin.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                className="action-btn edit-btn"
                                onClick={() => { setEditingPinId(pin.id); setPinForm({ pincode: pin.pincode, city: pin.city || "", state: pin.state || "", baseCharge: pin.baseCharge, perKgCharge: pin.perKgCharge, active: pin.active }); }}
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="action-btn"
                                title={pin.active ? "Deactivate" : "Activate"}
                                style={{ color: pin.active ? "#f59e0b" : "#34d399" }}
                                onClick={async () => {
                                  await axios.put(`${API_BASE}/api/shipping/admin/pins/${pin.id}/toggle`, {}, { headers: getAuthHeaders() });
                                  await loadServiceablePins();
                                }}
                              >
                                {pin.active ? "?" : "?"}
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={async () => {
                                  if (!confirmAction(`Delete PIN ${pin.pincode}?`)) return;
                                  await axios.delete(`${API_BASE}/api/shipping/admin/pins/${pin.id}`, { headers: getAuthHeaders() });
                                  await loadServiceablePins();
                                }}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Feature 10: Coupons */}
            {activeSection === "coupons" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div>
                    <h2>Coupon Management</h2>
                    <p>Create and manage discount codes.</p>
                  </div>
                  <FaTag />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <button className="add-product-btn" id="admin-create-coupon-btn" onClick={() => { setEditingCouponId(null); setCouponForm({ code: "", discountType: "PERCENTAGE", discountValue: "", minOrderValue: "", maxUsageLimit: "", expiryDate: "", couponType: "GENERAL", description: "", active: true }); setCouponError(""); setShowCouponModal(true); }}>
                    <FaPlus /> Create Coupon
                  </button>
                </div>
                {couponError && <div className="admin-error">{couponError}</div>}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Usage</th><th>Expiry</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {coupons.length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: "center", color: "#8898aa" }}>No coupons yet.</td></tr>
                      ) : coupons.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.code}</strong></td>
                          <td>{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `Rs.${c.discountValue}`}</td>
                          <td>Rs.{c.minOrderValue || 0}</td>
                          <td>{c.currentUsageCount}{c.maxUsageLimit ? ` / ${c.maxUsageLimit}` : " / inf"}</td>
                          <td>{c.expiryDate || "Never"}</td>
                          <td>{c.couponType}</td>
                          <td>{c.active ? "Active" : "Inactive"}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn edit-btn" id={`edit-coupon-${c.id}`} onClick={() => { setEditingCouponId(c.id); setCouponForm({ code: c.code, discountType: c.discountType, discountValue: String(c.discountValue), minOrderValue: String(c.minOrderValue || ""), maxUsageLimit: c.maxUsageLimit != null ? String(c.maxUsageLimit) : "", expiryDate: c.expiryDate || "", couponType: c.couponType || "GENERAL", description: c.description || "", active: c.active }); setCouponError(""); setShowCouponModal(true); }}><FaEdit /></button>
                              <button className="action-btn delete-btn" id={`delete-coupon-${c.id}`} onClick={async () => { if (!window.confirm(`Delete ${c.code}?`)) return; try { await axios.delete(`${API_BASE}/api/admin/coupons/${c.id}`, { headers: getAuthHeaders() }); const r = await axios.get(`${API_BASE}/api/admin/coupons`, { headers: getAuthHeaders() }); setCoupons(r.data || []); } catch (err) { setCouponError(getErrorMessage(err, "Delete failed.")); } }}><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {showCouponModal && (
                  <div className="admin-modal-overlay" onClick={() => setShowCouponModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3 className="modal-title">{editingCouponId ? "Edit Coupon" : "Create Coupon"}</h3>
                        <button className="modal-close" onClick={() => setShowCouponModal(false)}>X</button>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault(); setSavingCoupon(true); setCouponError("");
                        const payload = { ...couponForm, discountValue: parseFloat(couponForm.discountValue), minOrderValue: couponForm.minOrderValue ? parseFloat(couponForm.minOrderValue) : 0, maxUsageLimit: couponForm.maxUsageLimit ? parseInt(couponForm.maxUsageLimit) : null, expiryDate: couponForm.expiryDate || null };
                        try {
                          if (editingCouponId) { await axios.put(`${API_BASE}/api/admin/coupons/${editingCouponId}`, payload, { headers: getAuthHeaders() }); }
                          else { await axios.post(`${API_BASE}/api/admin/coupons`, payload, { headers: getAuthHeaders() }); }
                          const r = await axios.get(`${API_BASE}/api/admin/coupons`, { headers: getAuthHeaders() }); setCoupons(r.data || []);
                          setShowCouponModal(false);
                        } catch (err) { setCouponError(getErrorMessage(err, "Save failed.")); } finally { setSavingCoupon(false); }
                      }}>
                        <div className="modal-body">
                          {couponError && <div className="admin-error">{couponError}</div>}
                          <div className="form-row">
                            <div className="form-group"><label className="form-label">Code *</label><input id="coupon-code" className="form-input" value={couponForm.code} onChange={(e) => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required /></div>
                            <div className="form-group"><label className="form-label">Category</label>
                              <select id="coupon-type-select" className="form-input" value={couponForm.couponType} onChange={(e) => setCouponForm(p => ({ ...p, couponType: e.target.value }))}>
                                {["GENERAL","FIRST_ORDER","REFERRAL","FESTIVAL"].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group"><label className="form-label">Discount Type *</label>
                              <select id="coupon-discount-type" className="form-input" value={couponForm.discountType} onChange={(e) => setCouponForm(p => ({ ...p, discountType: e.target.value }))}>
                                <option value="PERCENTAGE">Percentage (%)</option><option value="FLAT">Flat (Rs.)</option>
                              </select>
                            </div>
                            <div className="form-group"><label className="form-label">Discount Value *</label><input id="coupon-value" className="form-input" type="number" min={0} value={couponForm.discountValue} onChange={(e) => setCouponForm(p => ({ ...p, discountValue: e.target.value }))} required /></div>
                          </div>
                          <div className="form-row">
                            <div className="form-group"><label className="form-label">Min Order (Rs.)</label><input id="coupon-min-order" className="form-input" type="number" min={0} value={couponForm.minOrderValue} onChange={(e) => setCouponForm(p => ({ ...p, minOrderValue: e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Max Uses (blank=unlimited)</label><input id="coupon-max-uses" className="form-input" type="number" min={1} value={couponForm.maxUsageLimit} onChange={(e) => setCouponForm(p => ({ ...p, maxUsageLimit: e.target.value }))} /></div>
                          </div>
                          <div className="form-row">
                            <div className="form-group"><label className="form-label">Expiry Date</label><input id="coupon-expiry" className="form-input" type="date" value={couponForm.expiryDate} onChange={(e) => setCouponForm(p => ({ ...p, expiryDate: e.target.value }))} /></div>
                            <div className="form-group" style={{ paddingTop: "1.8rem" }}><label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}><input id="coupon-active" type="checkbox" checked={couponForm.active} onChange={(e) => setCouponForm(p => ({ ...p, active: e.target.checked }))} /> Active</label></div>
                          </div>
                          <div className="form-group"><label className="form-label">Description</label><textarea id="coupon-description" className="form-input" rows={2} value={couponForm.description} onChange={(e) => setCouponForm(p => ({ ...p, description: e.target.value }))} /></div>
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn-cancel" onClick={() => setShowCouponModal(false)}>Cancel</button>
                          <button id="coupon-save-btn" type="submit" className="btn-save" disabled={savingCoupon}>{savingCoupon ? "Saving..." : editingCouponId ? "Update" : "Create"}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Feature 11: Low Stock */}
            {activeSection === "low-stock" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div><h2>Low Stock Alert</h2><p>Products with fewer than 5 units. Restock inline.</p></div>
                  <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Stock</th><th>Restock</th></tr></thead>
                    <tbody>
                      {lowStockProducts.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", color: "#34d399" }}>All products are well-stocked!</td></tr>
                      ) : lowStockProducts.map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.brand || "-"}</td>
                          <td>{p.category || "-"}</td>
                          <td>Rs.{p.price?.toLocaleString("en-IN")}</td>
                          <td><span className={p.quantity === 0 ? "status-badge status-cancelled" : "status-badge status-processing"}>{p.quantity === 0 ? "Out of Stock" : `${p.quantity} left`}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <input id={`restock-qty-${p.id}`} type="number" min={1} placeholder="Qty" value={restockValues[p.id] || ""} onChange={(e) => setRestockValues(v => ({ ...v, [p.id]: e.target.value }))} style={{ width: "70px", padding: "0.35rem 0.5rem", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#e0e6f0" }} />
                              <button id={`restock-btn-${p.id}`} className="add-product-btn" style={{ padding: "0.35rem 0.8rem", fontSize: "0.8rem" }} disabled={restockLoading[p.id]}
                                onClick={async () => {
                                  const qty = parseInt(restockValues[p.id]);
                                  if (!qty || qty < 1) return;
                                  setRestockLoading(v => ({ ...v, [p.id]: true }));
                                  try {
                                    const form = new FormData();
                                    form.append("product", JSON.stringify({ name: p.name, brand: p.brand, desc: p.desc, price: p.price, category: p.category, quantity: (p.quantity || 0) + qty, available: true }));
                                    await axios.put(`${API_BASE}/api/product/${p.id}`, form, { headers: { ...getAuthHeaders() } });
                                    const r = await axios.get(`${API_BASE}/api/admin/low-stock`, { headers: getAuthHeaders() });
                                    setLowStockProducts(r.data || []);
                                    setRestockValues(v => ({ ...v, [p.id]: "" }));
                                  } catch (err) { alert(getErrorMessage(err, "Restock failed.")); }
                                  finally { setRestockLoading(v => ({ ...v, [p.id]: false })); }
                                }}
                              >{restockLoading[p.id] ? "..." : "Restock"}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ===== Feature 12: Reviews Moderation ===== */}
            {activeSection === "reviews" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div><h2>⭐ Review Moderation</h2><p>Approve or reject pending customer reviews before they go public.</p></div>
                </div>
                {pendingReviews.length === 0 ? (
                  <p style={{padding:"1rem",color:"var(--text-muted)"}}>No pending reviews — you're all caught up! ✅</p>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                    {pendingReviews.map(review => (
                      <div key={review.id} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"12px",padding:"1rem 1.25rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem"}}>
                          <div>
                            <strong>{review.userName}</strong>
                            {review.verifiedPurchase && <span style={{marginLeft:"0.5rem",background:"#065f46",color:"#d1fae5",fontSize:"0.7rem",padding:"2px 8px",borderRadius:"999px"}}>✅ Verified Purchase</span>}
                            <div style={{color:"#f59e0b",fontSize:"1rem"}}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                            <p style={{marginTop:"0.4rem",fontSize:"0.9rem"}}>{review.comment}</p>
                            {review.hasPhoto && (
                              <img src={`http://localhost:8080/api/review/${review.id}/photo`} alt="Review" style={{marginTop:"0.5rem",maxHeight:"120px",borderRadius:"8px",objectFit:"cover"}} />
                            )}
                          </div>
                          <div style={{display:"flex",gap:"0.5rem",flexShrink:0}}>
                            <button
                              className="add-product-btn"
                              style={{background:"#065f46",fontSize:"0.8rem",padding:"0.4rem 1rem"}}
                              onClick={() => axios.put(`http://localhost:8080/api/admin/reviews/${review.id}/moderate`, {action:"APPROVE"},{headers:getAuthHeaders()}).then(()=>setPendingReviews(prev=>prev.filter(r=>r.id!==review.id))).catch(()=>{})}
                            >✅ Approve</button>
                            <button
                              className="delete-btn"
                              style={{fontSize:"0.8rem",padding:"0.4rem 1rem"}}
                              onClick={() => axios.put(`http://localhost:8080/api/admin/reviews/${review.id}/moderate`, {action:"REJECT"},{headers:getAuthHeaders()}).then(()=>setPendingReviews(prev=>prev.filter(r=>r.id!==review.id))).catch(()=>{})}
                            >❌ Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ===== Feature 13: GST & Store Settings ===== */}
            {activeSection === "settings" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div><h2>⚙️ Store Settings & GST</h2><p>Update GSTIN, store details, and GST rates used on invoices.</p></div>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault(); setSavingSettings(true);
                  try {
                    await axios.put("http://localhost:8080/api/admin/settings", settingsForm, {headers:getAuthHeaders()});
                    alert("Settings saved successfully!");
                  } catch { alert("Failed to save settings."); } finally { setSavingSettings(false); }
                }}>
                  <div className="form-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                    <div className="form-group">
                      <label className="form-label">GSTIN</label>
                      <input className="form-input" placeholder="e.g. 07AABCS1429B1Z6" value={settingsForm.gstin||""} onChange={e=>setSettingsForm(p=>({...p,gstin:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Store Name</label>
                      <input className="form-input" value={settingsForm.storeName||""} onChange={e=>setSettingsForm(p=>({...p,storeName:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={settingsForm.storePhone||""} onChange={e=>setSettingsForm(p=>({...p,storePhone:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" value={settingsForm.storeEmail||""} onChange={e=>setSettingsForm(p=>({...p,storeEmail:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GST Rate — Complete Cycles (e.g. 0.12 for 12%)</label>
                      <input className="form-input" type="number" step="0.01" min="0" max="1" value={settingsForm.gstRateCycles||0.12} onChange={e=>setSettingsForm(p=>({...p,gstRateCycles:parseFloat(e.target.value)}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GST Rate — Parts/Accessories (e.g. 0.18 for 18%)</label>
                      <input className="form-input" type="number" step="0.01" min="0" max="1" value={settingsForm.gstRateParts||0.18} onChange={e=>setSettingsForm(p=>({...p,gstRateParts:parseFloat(e.target.value)}))} />
                    </div>
                  </div>
                  <div className="form-group" style={{marginBottom:"1.5rem"}}>
                    <label className="form-label">Store Address</label>
                    <textarea className="form-textarea" rows={2} value={settingsForm.storeAddress||""} onChange={e=>setSettingsForm(p=>({...p,storeAddress:e.target.value}))} />
                  </div>
                  <button type="submit" className="add-product-btn" disabled={savingSettings}>{savingSettings ? "Saving..." : "💾 Save Settings"}</button>
                </form>
              </section>
            )}

            {/* ===== Feature 14: Category Management ===== */}
            {activeSection === "categories" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div><h2>🗂️ Category Management</h2><p>Add, edit, or delete product categories and hierarchies.</p></div>
                </div>
                <form style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}
                  onSubmit={async(e)=>{
                    e.preventDefault(); setSavingCat(true);
                    try {
                      if(editingCatId) {
                        const r = await axios.put(`http://localhost:8080/api/admin/categories/${editingCatId}`,catForm,{headers:getAuthHeaders()});
                        setCategories(p=>p.map(c=>c.id===editingCatId?r.data:c));
                      } else {
                        const r = await axios.post("http://localhost:8080/api/admin/categories",catForm,{headers:getAuthHeaders()});
                        setCategories(p=>[...p,r.data]);
                      }
                      setCatForm({name:"",description:"",featured:false,displayOrder:0,active:true}); setEditingCatId(null);
                    } catch(err){ alert(err.response?.data||"Error saving category."); } finally { setSavingCat(false); }
                  }}>
                  <input className="form-input" placeholder="Category name *" required value={catForm.name} onChange={e=>setCatForm(p=>({...p,name:e.target.value}))} />
                  <input className="form-input" placeholder="Description" value={catForm.description} onChange={e=>setCatForm(p=>({...p,description:e.target.value}))} />
                  <input className="form-input" type="number" placeholder="Display order" value={catForm.displayOrder} onChange={e=>setCatForm(p=>({...p,displayOrder:parseInt(e.target.value)||0}))} />
                  <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
                    <label><input type="checkbox" checked={catForm.featured} onChange={e=>setCatForm(p=>({...p,featured:e.target.checked}))} /> Featured</label>
                    <label><input type="checkbox" checked={catForm.active} onChange={e=>setCatForm(p=>({...p,active:e.target.checked}))} /> Active</label>
                  </div>
                  <button type="submit" className="add-product-btn" disabled={savingCat} style={{gridColumn:"span 2"}}>{savingCat?"Saving...":editingCatId?"Update Category":"Add Category"}</button>
                </form>
                <div className="inventory-table-wrap">
                  <table className="inventory-table">
                    <thead><tr><th>Name</th><th>Description</th><th>Featured</th><th>Order</th><th>Active</th><th>Actions</th></tr></thead>
                    <tbody>
                      {categories.map(cat=>(
                        <tr key={cat.id}>
                          <td><strong>{cat.name}</strong></td>
                          <td>{cat.description||"—"}</td>
                          <td>{cat.featured?"✅":"—"}</td>
                          <td>{cat.displayOrder}</td>
                          <td>{cat.active?"✅":"❌"}</td>
                          <td>
                            <button className="edit-btn" onClick={()=>{setCatForm({name:cat.name,description:cat.description||"",featured:cat.featured,displayOrder:cat.displayOrder,active:cat.active});setEditingCatId(cat.id);}}>Edit</button>
                            <button className="delete-btn" style={{marginLeft:"0.5rem"}} onClick={()=>{if(window.confirm(`Delete category "${cat.name}"?`))axios.delete(`http://localhost:8080/api/admin/categories/${cat.id}`,{headers:getAuthHeaders()}).then(()=>setCategories(p=>p.filter(c=>c.id!==cat.id))).catch(()=>alert("Could not delete."));}}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ===== Feature 14: Brand Management ===== */}
            {activeSection === "brands" && (
              <section className="admin-panel-card">
                <div className="card-heading">
                  <div><h2>🏷️ Brand Management</h2><p>Add, edit, or delete brands and mark them as featured on the homepage.</p></div>
                </div>
                <form style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}
                  onSubmit={async(e)=>{
                    e.preventDefault(); setSavingBrand(true);
                    try {
                      if(editingBrandId) {
                        const r = await axios.put(`http://localhost:8080/api/admin/brands/${editingBrandId}`,brandForm,{headers:getAuthHeaders()});
                        setBrands(p=>p.map(b=>b.id===editingBrandId?r.data:b));
                      } else {
                        const r = await axios.post("http://localhost:8080/api/admin/brands",brandForm,{headers:getAuthHeaders()});
                        setBrands(p=>[...p,r.data]);
                      }
                      setBrandForm({name:"",description:"",logoUrl:"",featured:false,displayOrder:0,active:true}); setEditingBrandId(null);
                    } catch(err){ alert(err.response?.data||"Error saving brand."); } finally { setSavingBrand(false); }
                  }}>
                  <input className="form-input" placeholder="Brand name *" required value={brandForm.name} onChange={e=>setBrandForm(p=>({...p,name:e.target.value}))} />
                  <input className="form-input" placeholder="Description" value={brandForm.description} onChange={e=>setBrandForm(p=>({...p,description:e.target.value}))} />
                  <input className="form-input" placeholder="Logo URL (optional)" value={brandForm.logoUrl} onChange={e=>setBrandForm(p=>({...p,logoUrl:e.target.value}))} />
                  <input className="form-input" type="number" placeholder="Display order" value={brandForm.displayOrder} onChange={e=>setBrandForm(p=>({...p,displayOrder:parseInt(e.target.value)||0}))} />
                  <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
                    <label><input type="checkbox" checked={brandForm.featured} onChange={e=>setBrandForm(p=>({...p,featured:e.target.checked}))} /> Featured</label>
                    <label><input type="checkbox" checked={brandForm.active} onChange={e=>setBrandForm(p=>({...p,active:e.target.checked}))} /> Active</label>
                  </div>
                  <button type="submit" className="add-product-btn" disabled={savingBrand} style={{gridColumn:"span 2"}}>{savingBrand?"Saving...":editingBrandId?"Update Brand":"Add Brand"}</button>
                </form>
                <div className="inventory-table-wrap">
                  <table className="inventory-table">
                    <thead><tr><th>Name</th><th>Description</th><th>Logo</th><th>Featured</th><th>Active</th><th>Actions</th></tr></thead>
                    <tbody>
                      {brands.map(brand=>(
                        <tr key={brand.id}>
                          <td><strong>{brand.name}</strong></td>
                          <td>{brand.description||"—"}</td>
                          <td>{brand.logoUrl?<img src={brand.logoUrl} alt={brand.name} style={{height:"32px",objectFit:"contain"}} />:"—"}</td>
                          <td>{brand.featured?"✅":"—"}</td>
                          <td>{brand.active?"✅":"❌"}</td>
                          <td>
                            <button className="edit-btn" onClick={()=>{setBrandForm({name:brand.name,description:brand.description||"",logoUrl:brand.logoUrl||"",featured:brand.featured,displayOrder:brand.displayOrder,active:brand.active});setEditingBrandId(brand.id);}}>Edit</button>
                            <button className="delete-btn" style={{marginLeft:"0.5rem"}} onClick={()=>{if(window.confirm(`Delete brand "${brand.name}"?`))axios.delete(`http://localhost:8080/api/admin/brands/${brand.id}`,{headers:getAuthHeaders()}).then(()=>setBrands(p=>p.filter(b=>b.id!==brand.id))).catch(()=>alert("Could not delete."));}}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}


      {showProductModal ? (
        <div className="admin-modal-overlay" onClick={closeProductModal}>
          <div className="admin-modal wide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {productForm.id ? "Edit Product" : "Upload Product"}
              </h3>
              <button className="modal-close" onClick={closeProductModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name</label>
                    <input className="form-input" name="name" value={productForm.name} onChange={handleProductChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input className="form-input" name="brand" value={productForm.brand} onChange={handleProductChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    name="desc"
                    value={productForm.desc}
                    onChange={handleProductChange}
                    placeholder="Short product description"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      name="price"
                      value={productForm.price}
                      onChange={handleProductChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      name="quantity"
                      value={productForm.quantity}
                      onChange={handleProductChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" name="category" value={productForm.category} onChange={handleProductChange}>
                      <option value="">Select category</option>
                      {CATEGORY_CHOICES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Release Date</label>
                    <input
                      className="form-input"
                      type="date"
                      name="releaseDate"
                      value={productForm.releaseDate}
                      onChange={handleProductChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Image{productForm.id ? " (leave blank to keep current)" : ""}</label>
                  <input className="form-input" type="file" accept="image/*" onChange={handleProductImageChange} />
                  {productPreview ? (
                    <div className="modal-image-preview">
                      <img src={productPreview} alt="Preview" />
                    </div>
                  ) : null}
                </div>

                {/* ─── Extra gallery images ─── */}
                <div className="form-group">
                  <label className="form-label">Additional Gallery Images <span style={{fontSize:"0.8rem",color:"#94a3b8"}}>(you can select multiple)</span></label>
                  <input
                    className="form-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files);
                      setExtraImages(files);
                      extraPreviews.forEach(u => URL.revokeObjectURL(u));
                      setExtraPreviews(files.map(f => URL.createObjectURL(f)));
                    }}
                  />
                  {/* Previews of newly selected extra images */}
                  {extraPreviews.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"10px"}}>
                      {extraPreviews.map((url, i) => (
                        <div key={i} style={{position:"relative"}}>
                          <img src={url} alt={`extra-${i}`} style={{width:"80px",height:"80px",objectFit:"cover",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.15)"}} />
                          <button type="button" onClick={() => {
                            const newFiles = extraImages.filter((_,j) => j !== i);
                            const newPreviews = extraPreviews.filter((_,j) => j !== i);
                            URL.revokeObjectURL(url);
                            setExtraImages(newFiles);
                            setExtraPreviews(newPreviews);
                          }} style={{position:"absolute",top:"-6px",right:"-6px",background:"#ef4444",border:"none",borderRadius:"50%",width:"18px",height:"18px",color:"#fff",fontSize:"11px",cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Already-saved gallery images (edit mode) */}
                  {existingGallery.length > 0 && (
                    <div style={{marginTop:"10px"}}>
                      <p style={{fontSize:"0.8rem",color:"#94a3b8",marginBottom:"6px"}}>Saved gallery ({existingGallery.length} images) — click ✕ to remove</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                        {existingGallery.map(img => (
                          <div key={img.id} style={{position:"relative"}}>
                            <img src={img.url} alt="gallery" style={{width:"80px",height:"80px",objectFit:"cover",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.15)"}} />
                            <button type="button" onClick={async () => {
                              try {
                                await axios.delete(`${API_BASE}/api/product/${productForm.id}/gallery/${img.id}`, { headers: getAuthHeaders() });
                                setExistingGallery(g => g.filter(x => x.id !== img.id));
                              } catch(err) { alert("Failed to delete image"); }
                            }} style={{position:"absolute",top:"-6px",right:"-6px",background:"#ef4444",border:"none",borderRadius:"50%",width:"18px",height:"18px",color:"#fff",fontSize:"11px",cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label className="availability-toggle">
                  <input
                    type="checkbox"
                    name="available"
                    checked={productForm.available}
                    onChange={handleProductChange}
                  />
                  <span>Product available for customers</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeProductModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={savingProduct}>
                  {savingProduct ? "Saving..." : productForm.id ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminPanel;







