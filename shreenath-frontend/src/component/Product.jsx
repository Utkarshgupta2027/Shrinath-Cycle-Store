import React, { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { fetchProductById } from "../api/products";
import AppContext from "../Context/Context";
import "./product.css";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";

const Product = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(AppContext);
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getProduct = async () => {
      try {
        setLoading(true);
        if (!productId) {
          throw new Error("No Product ID found in URL");
        }

        const data = await fetchProductById(productId);
        setProduct(data);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Could not load product. Check if backend is running.");
      } finally {
        setLoading(false);
      }
    };

    getProduct();
  }, [productId]);

  const handleDelete = async () => {
    if (!product || !window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/product/${product.id}`, {
        headers: getAuthHeaders(),
      });
      alert("Product deleted!");
      navigate("/admin");
    } catch (err) {
      alert(
        err.response?.data ||
          "Failed to delete. The product may be linked to other records."
      );
    }
  };

  const handleAddToCart = async (selectedProduct) => {
    const userId = user?.id;

    if (!userId) {
      alert("Please login to add items to cart");
      navigate("/login");
      return;
    }

    try {
      const params = new URLSearchParams({
        userId,
        productId: selectedProduct.id,
        quantity: 1,
      });

      const response = await axios.post(
        `http://localhost:8080/api/cart/add?${params.toString()}`
      );

      if (response.status === 200 || response.status === 201) {
        addToCart(selectedProduct);
        alert(`${selectedProduct.name} added to cart!`);
      }
    } catch (err) {
      console.error("Cart error:", err);
      alert(err.response?.data || "Failed to add to cart. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading product details...</div>;
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!product) {
    return <div className="error-box">Product not found.</div>;
  }

  return (
    <div className="product-page">
      <div className="product-container">
        <div className="product-image-box">
          <img
            src={`http://localhost:8080/api/product/${product.id}/image`}
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/300";
            }}
          />
        </div>

        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-brand">Brand: {product.brand}</p>
          <p className="product-price">Rs. {product.price}</p>
          <p className="product-description">
            {product.desc || "No description provided."}
          </p>

          <div className="product-buttons">
            <button className="add-btn" onClick={() => handleAddToCart(product)}>
              Add to Cart
            </button>

            {isAdmin && (
              <>
                <button
                  className="update-btn"
                  onClick={() => navigate(`/updateproduct/${product.id}`)}
                >
                  Update
                </button>

                <button className="delete-btn" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
          </div>

          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Product;
