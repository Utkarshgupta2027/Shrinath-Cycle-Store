import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import "../component/Wishlist.css";
import "../component/Orders.css";

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

    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:8080/api/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [navigate, user]);

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/product/${productId}`, {
        headers: getAuthHeaders(),
      });
      setProducts((prev) => prev.filter((product) => product.id !== productId));
      alert("Product deleted successfully.");
    } catch (error) {
      alert(error.response?.data || "Unable to delete product.");
    }
  };

  if (!isAdminUser(user)) {
    return null;
  }

  return (
    <div className="orders-page">
      <h2>Admin Panel</h2>
      <p>Only the admin can add, update and remove products.</p>

      <div style={{ marginBottom: "16px" }}>
        <Link to="/addproduct">Add New Product</Link>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products available.</p>
      ) : (
        <div className="wishlist-grid">
          {products.map((product) => (
            <div key={product.id} className="wishlist-card">
              <img
                src={`http://localhost:8080/api/product/${product.id}/image`}
                alt={product.name}
                className="wishlist-img"
              />
              <h4 className="wishlist-name">{product.name}</h4>
              <p className="wishlist-price">Rs. {product.price}</p>
              <p>{product.brand}</p>

              <button onClick={() => navigate(`/product/${product.id}`)}>
                View
              </button>
              <button onClick={() => navigate(`/updateproduct/${product.id}`)}>
                Update
              </button>
              <button onClick={() => handleDelete(product.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
