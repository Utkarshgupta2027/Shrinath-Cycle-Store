import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchProductById } from "../api/products";
import AppContext from "../Context/Context";
import "../styles/components/product.css";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import { FaArrowLeft, FaShoppingCart, FaEdit, FaTrash, FaStar, FaRegStar } from "react-icons/fa";

const Product = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(AppContext);
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewStatus, setReviewStatus] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const getProduct = async () => {
      try {
        setLoading(true);
        if (!productId) {
          throw new Error("No Product ID found in URL");
        }

        const data = await fetchProductById(productId);
        setProduct(data);

        const reviewResponse = await fetch(`http://localhost:8080/api/product/${productId}/reviews`);
        const reviewData = reviewResponse.ok ? await reviewResponse.json() : [];
        setReviews(Array.isArray(reviewData) ? reviewData : []);
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

  const loadReviews = async () => {
    const response = await fetch(`http://localhost:8080/api/product/${productId}/reviews`);
    if (!response.ok) {
      throw new Error("Failed to load reviews");
    }

    const data = await response.json();
    setReviews(Array.isArray(data) ? data : []);
  };

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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert("Please login to leave a review.");
      navigate("/login");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewStatus("");

      const response = await fetch(`http://localhost:8080/api/product/${product.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof data === "string" ? data : "Failed to submit review.");
      }

      await Promise.all([loadReviews(), fetchProductById(productId).then(setProduct)]);
      setReviewStatus("Your review has been saved.");
    } catch (err) {
      setReviewStatus(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatReviewDate = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderStars = (value) =>
    [1, 2, 3, 4, 5].map((star) =>
      star <= Math.round(value) ? (
        <FaStar key={star} className="star filled" />
      ) : (
        <FaRegStar key={star} className="star" />
      )
    );

  const existingUserReview = reviews.find((review) => Number(review.userId) === Number(user?.id));

  useEffect(() => {
    if (existingUserReview) {
      setReviewForm({
        rating: existingUserReview.rating || 5,
        comment: existingUserReview.comment || "",
      });
    }
  }, [existingUserReview]);

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
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to products
        </button>
        
        <div className="product-layout">
          <div className="product-image-box">
            <img
              src={`http://localhost:8080/api/product/${product.id}/image`}
              alt={product.name}
              className="product-image"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/400";
              }}
            />
          </div>

          <div className="product-details">
            <span className="product-brand">{product.brand}</span>
            <h1 className="product-title">{product.name}</h1>
            <div className="product-rating-summary">
              <div className="product-rating-stars">{renderStars(product.averageRating || 0)}</div>
              <span className="product-rating-value">
                {(product.averageRating || 0).toFixed(1)} rating
              </span>
              <span className="product-rating-count">
                {product.reviewCount || 0} {(product.reviewCount || 0) === 1 ? "review" : "reviews"}
              </span>
            </div>
            <p className="product-price">Rs. {product.price}</p>
            
            <div className="product-description">
              <h3>About this item</h3>
              <p>{product.desc || "No description provided."}</p>
            </div>

            <div className="product-buttons">
              <button className="add-btn" onClick={() => handleAddToCart(product)}>
                <FaShoppingCart /> Add to Cart
              </button>

              {isAdmin && (
                <div className="admin-actions">
                  <button
                    className="update-btn"
                    onClick={() => navigate(`/updateproduct/${product.id}`)}
                  >
                    <FaEdit /> Edit
                  </button>

                  <button className="delete-btn" onClick={handleDelete}>
                    <FaTrash /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="review-section">
          <div className="review-panel">
            <div className="review-panel-header">
              <div>
                <h2>Customer Reviews</h2>
                <p>Real feedback from customers for this product.</p>
              </div>
              <div className="review-overview">
                <span className="review-overview-score">{(product.averageRating || 0).toFixed(1)}</span>
                <div className="review-overview-stars">{renderStars(product.averageRating || 0)}</div>
                <span className="review-overview-count">
                  Based on {product.reviewCount || 0} {(product.reviewCount || 0) === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>

            <form className="review-form" onSubmit={handleReviewSubmit}>
              <div className="review-form-header">
                <h3>{existingUserReview ? "Update your review" : "Write a review"}</h3>
                {!user && <span className="review-login-note">Login required to submit feedback</span>}
              </div>

              <div className="rating-input-group">
                <span className="rating-input-label">Your rating</span>
                <div className="rating-selector">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rating-star-btn${reviewForm.rating >= value ? " active" : ""}`}
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                    >
                      <FaStar />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="review-textarea"
                rows="4"
                placeholder="Share what you liked, how the product feels, quality, delivery, or anything future buyers should know."
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
              />

              <div className="review-form-actions">
                <button type="submit" className="review-submit-btn" disabled={submittingReview}>
                  {submittingReview ? "Saving..." : existingUserReview ? "Update Review" : "Submit Review"}
                </button>
                {reviewStatus && <span className="review-status">{reviewStatus}</span>}
              </div>
            </form>

            <div className="review-list">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card-top">
                      <div>
                        <h4>{review.userName || "Customer"}</h4>
                        <span className="review-date">{formatReviewDate(review.updatedAt || review.createdAt)}</span>
                      </div>
                      <div className="review-card-rating">{renderStars(review.rating)}</div>
                    </div>
                    <p>{review.comment}</p>
                  </article>
                ))
              ) : (
                <div className="no-reviews">
                  No reviews yet. Be the first customer to rate this product.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Product;
