import React, { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { fetchProductById } from "../api/products"; // Verify this path!
import AppContext from "../Context/Context";
import "./product.css";
import axios from "axios";

const Product = () => {
  const { productId } = useParams(); // 'productId' must match the name in App.js Route
  const navigate = useNavigate();
  const { addToCart } = useContext(AppContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getProduct = async () => {
      try {
        setLoading(true);
        // Ensure productId exists before calling
        if (!productId) throw new Error("No Product ID found in URL");
        
        const data = await fetchProductById(productId);
        setProduct(data);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Could not load product. Check if Backend is running.");
      } finally {
        setLoading(false);
      }
    };
    getProduct();
  }, [productId]);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        await axios.delete(`http://localhost:8080/api/product/${product.id}`);
        alert("Product deleted!");
        navigate("/");
      } catch (err) {
        alert("Failed to delete. Is the product linked to existing orders/wishlists?");
      }
    }
  };
  // 2. Add to Cart Logic (Database Integrated)
  const handleAddToCart = async (product) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  if (!userId) {
    alert("Please login to add items to cart");
    navigate("/login"); // Optional: redirect to login
    return;
  }

  try {
    // We use URLSearchParams because most Spring Boot Cart controllers 
    // use @RequestParam for userId and productId
    const params = new URLSearchParams({
      userId: userId,
      productId: product.id,
      quantity: 1
    });

    const response = await axios.post(`http://localhost:8080/api/cart/add?${params.toString()}`);

    if (response.status === 200 || response.status === 201) {
      alert(`${product.name} added to cart! 🛒`);
    }
  } catch (err) {
    console.error("Cart error:", err);
    alert(err.response?.data || "Failed to add to cart. Please try again.");
  }
};


  if (loading) return <div className="loading">⏳ Loading Product Details...</div>;
  if (error) return <div className="error-box">❌ {error}</div>;
  if (!product) return <div className="error-box">Product not found.</div>;

  return (
    <div className="product-page">
      <div className="product-container">
        <div className="product-image-box">
          <img
            src={`http://localhost:8080/api/product/${product.id}/image`}
            alt={product.name}
            className="product-image"
            onError={(e) => (e.target.src = "https://via.placeholder.com/300")}
          />
        </div>

        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-brand">Brand: {product.brand}</p>
          <p className="product-price">₹{product.price}</p>
          <p className="product-description">{product.desc || "No description provided."}</p>

          <div className="product-buttons">
            <button className="add-btn" onClick={() => handleAddToCart(product)}>
              🛒 Add to Cart
            </button>
            
            <button className="update-btn" onClick={() => navigate(`/UpdateProduct/${product.id}`)}>
              ✏️ Update
            </button>

            <button className="delete-btn" onClick={handleDelete}>
              🗑️ Delete
            </button>
          </div>
          
          <button className="back-btn" onClick={() => navigate(-1)}>⬅ Back</button>
        </div>
      </div>
    </div>
  );
};

export default Product;