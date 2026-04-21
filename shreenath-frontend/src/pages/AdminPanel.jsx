import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import "../styles/pages/AdminPanel.css";

function AdminPanel() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminUser(user)) {
      navigate("/");
      return;
    }

    axios
      .get("http://localhost:8080/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => alert("Failed to load products."))
      .finally(() => setLoading(false));
  }, [navigate, user]);

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`http://localhost:8080/api/product/${productId}`, {
        headers: getAuthHeaders(),
      });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (error) {
      alert(error.response?.data || "Unable to delete product.");
    }
  };

  if (!isAdminUser(user)) return null;

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Panel</h1>
            <p className="admin-subtitle">Manage your store's products</p>
          </div>
          <Link to="/addproduct" className="add-product-btn">
            <FaPlus /> Add New Product
          </Link>
        </div>

        {/* Stats Bar */}
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-value">{products.length}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>

        {/* Product Table */}
        {loading ? (
          <div className="admin-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="admin-empty">
            <p>No products yet. Add your first product!</p>
            <Link to="/addproduct" className="add-product-btn">
              <FaPlus /> Add Product
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb-wrap">
                          <img
                            src={`http://localhost:8080/api/product/${product.id}/image`}
                            alt={product.name}
                            className="product-thumb"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/60";
                            }}
                          />
                        </div>
                        <span className="product-cell-name">{product.name}</span>
                      </div>
                    </td>
                    <td className="brand-cell">{product.brand}</td>
                    <td className="price-cell">₹{Number(product.price).toLocaleString("en-IN")}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn view-btn"
                          onClick={() => navigate(`/product/${product.id}`)}
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => navigate(`/updateproduct/${product.id}`)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(product.id, product.name)}
                          title="Delete"
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
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
