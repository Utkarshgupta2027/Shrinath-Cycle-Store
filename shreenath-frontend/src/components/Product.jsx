import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchProductById } from "../api/products";
import AppContext from "../Context/Context";
import "../styles/components/product.css";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import {
  FaArrowLeft,
  FaBicycle,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardCheck,
  FaComments,
  FaCreditCard,
  FaEdit,
  FaFacebookF,
  FaHeart,
  FaInstagram,
  FaLock,
  FaPlay,
  FaQuestionCircle,
  FaRegHeart,
  FaRegStar,
  FaRulerCombined,
  FaShareAlt,
  FaShieldAlt,
  FaShoppingCart,
  FaStar,
  FaTag,
  FaTools,
  FaTrash,
  FaTruck,
  FaUndoAlt,
  FaWhatsapp,
} from "react-icons/fa";

import normalCycle from "../assets/images/normal.webp";
import rangerCycle from "../assets/images/ranger.webp";
import ladiesCycle from "../assets/images/ladies.webp";
import accessoriesImage from "../assets/images/accesories.png";

const COLOR_OPTIONS = ["Matte Black", "Racing Red", "Ocean Blue"];
const SIZE_OPTIONS = ["S", "M", "L"];
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

const getImageUrl = (productId) => `http://localhost:8080/api/product/${productId}/image`;

const fallbackSpecs = (product) => {
  const category = (product?.category || "").toLowerCase();
  const isAccessory = category.includes("accessor") || category.includes("tool") || category.includes("part");

  if (isAccessory) {
    return [
      ["Material", product?.material || "High-grade durable build"],
      ["Compatibility", product?.compatibility || "Most standard bicycle models"],
      ["Usage", product?.category || "Cycling essential"],
      ["Warranty", product?.warranty || "6 months service warranty"],
    ];
  }

  return [
    ["Frame", product?.frame || "Lightweight steel alloy frame"],
    ["Gear", product?.gear || "Smooth multi-speed shifting"],
    ["Brake", product?.brake || "Responsive front and rear brakes"],
    ["Suspension", product?.suspension || "Comfort tuned suspension"],
    ["Tyre", product?.tyre || "High-grip road and trail tyres"],
    ["Ideal For", product?.category || "Daily riding and fitness"],
  ];
};

const Product = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(AppContext);
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewStatus, setReviewStatus] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedSize, setSelectedSize] = useState(SIZE_OPTIONS[1]);
  const [pincode, setPincode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const getProduct = async () => {
      try {
        setLoading(true);
        if (!productId) {
          throw new Error("No Product ID found in URL");
        }

        const data = await fetchProductById(productId);
        setProduct(data);
        setActiveImage(getImageUrl(data.id));

        const reviewResponse = await fetch(`http://localhost:8080/api/product/${productId}/reviews`);
        const reviewData = reviewResponse.ok ? await reviewResponse.json() : [];
        setReviews(Array.isArray(reviewData) ? reviewData : []);

        const productsResponse = await fetch("http://localhost:8080/api/products");
        const allProducts = productsResponse.ok ? await productsResponse.json() : [];
        setRelatedProducts(
          Array.isArray(allProducts)
            ? allProducts
                .filter((item) => Number(item.id) !== Number(productId))
                .filter((item) => item.category === data.category || item.brand === data.brand)
                .slice(0, 4)
            : []
        );
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

  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:8080/api/wishlist/${user.id}`)
      .then((res) => res.json())
      .then((data) => setWishlistIds(Array.isArray(data) ? data.map((item) => item.productId) : []))
      .catch(() => {});
  }, [user?.id]);

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

  const handleAddToCart = async (selectedProduct, shouldCheckout = false) => {
    const userId = user?.id;

    if (!userId) {
      alert("Please login to add items to cart");
      navigate("/login");
      return false;
    }

    if (!selectedProduct.available || selectedProduct.quantity <= 0) {
      setActionMessage("This product is currently out of stock.");
      return false;
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
        if (shouldCheckout) {
          navigate("/cart");
        } else {
          setActionMessage(`${selectedProduct.name} added to cart.`);
        }
        return true;
      }
    } catch (err) {
      console.error("Cart error:", err);
      setActionMessage(err.response?.data || "Failed to add to cart. Please try again.");
    }

    return false;
  };

  const toggleWishlist = async () => {
    if (!user?.id) {
      navigate("/login");
      return;
    }

    const isAdded = wishlistIds.includes(product.id);
    const endpoint = isAdded ? "remove" : "add";
    const method = isAdded ? "DELETE" : "POST";
    const params = new URLSearchParams({ userId: user.id, productId: product.id });

    try {
      const response = await fetch(`http://localhost:8080/api/wishlist/${endpoint}?${params}`, { method });
      if (response.ok) {
        setWishlistIds((prev) =>
          isAdded ? prev.filter((id) => id !== product.id) : [...prev, product.id]
        );
        setActionMessage(isAdded ? "Removed from wishlist." : "Added to wishlist.");
      }
    } catch {
      setActionMessage("Wishlist update failed. Please try again.");
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

  const handleDeliveryCheck = (e) => {
    e.preventDefault();
    if (!PINCODE_PATTERN.test(pincode.trim())) {
      setDeliveryMessage("Enter a valid 6 digit pincode.");
      return;
    }

    setDeliveryMessage("Delivery available in 2-5 business days. Free store support included.");
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} at Shreenath Cycle Store`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setActionMessage("Product link copied to clipboard.");
      }
    } catch {
      setActionMessage("Sharing was cancelled.");
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

  const currentPrice = Number(product?.price || 0);
  const listPrice = currentPrice ? Math.round(currentPrice * 1.15) : 0;
  const savings = Math.max(listPrice - currentPrice, 0);
  const savingsPercent = listPrice > 0 ? Math.round((savings / listPrice) * 100) : 0;
  const stockStatus = !product?.available || product?.quantity <= 0
    ? { label: "Out of stock", tone: "out", detail: "Currently unavailable for purchase" }
    : product.quantity <= 5
      ? { label: "Low stock", tone: "low", detail: `Only ${product.quantity} left in stock` }
      : { label: "In stock", tone: "in", detail: `${product.quantity} units ready to order` };
  const galleryImages = [
    { src: getImageUrl(product.id), label: "Main product" },
    { src: rangerCycle, label: "Side profile" },
    { src: normalCycle, label: "Lifestyle view" },
    { src: ladiesCycle, label: "Frame detail" },
  ];
  const isWishlisted = wishlistIds.includes(product.id);
  const specs = fallbackSpecs(product);
  const faqs = [
    ["Is this product ready for delivery?", stockStatus.tone === "out" ? "This item is currently out of stock. Contact support for availability." : "Yes, this product is ready to order from available stock."],
    ["Can I return this product?", "Yes, returns are accepted within 7 days if the product is unused and in original condition."],
    ["Does it include warranty?", product.warranty || "Yes, branded cycles include warranty support. Exact coverage depends on model and brand."],
    ["Can I get help choosing the right size?", "Yes, call or chat with store support and we will help match your height and riding style."],
  ];

  return (
    <div className="product-page">
      <div className="product-container">
        <button className="back-link" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to products
        </button>

        {actionMessage && <div className="product-action-message">{actionMessage}</div>}

        <div className="product-layout">
          <div className="product-gallery">
            <div className="product-image-box">
              <span className="zoom-hint">Hover to zoom</span>
              <img
                src={activeImage}
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  e.target.src = normalCycle;
                }}
              />
            </div>

            <div className="product-thumbnails" aria-label="Product images">
              {galleryImages.map((image) => (
                <button
                  key={image.label}
                  type="button"
                  className={`thumbnail-btn${activeImage === image.src ? " active" : ""}`}
                  onClick={() => setActiveImage(image.src)}
                >
                  <img src={image.src} alt={image.label} onError={(e) => { e.target.src = normalCycle; }} />
                </button>
              ))}
            </div>

            <div className="product-video-card">
              <span><FaPlay /></span>
              <div>
                <strong>Product video</strong>
                <p>Demo video can be added here for assembly, features, or ride feel.</p>
              </div>
            </div>
          </div>

          <div className="product-details">
            <div className="product-category-row">
              <span className="product-brand">{product.brand || "Shreenath Select"}</span>
              <span className="product-category"><FaBicycle /> {product.category || "Bicycle"}</span>
            </div>

            <h1 className="product-title">{product.name}</h1>

            <div className="product-rating-summary">
              <div className="product-rating-stars">{renderStars(product.averageRating || 0)}</div>
              <span className="product-rating-value">
                {(product.averageRating || 0).toFixed(1)} rating
              </span>
              <a href="#reviews" className="product-rating-count">
                {product.reviewCount || 0} {(product.reviewCount || 0) === 1 ? "review" : "reviews"}
              </a>
            </div>

            <div className="transparent-price-block">
              <div className="price-line">
                <p className="product-price">Rs. {currentPrice.toLocaleString("en-IN")}</p>
                {savingsPercent > 0 && <span className="discount-badge">{savingsPercent}% off</span>}
              </div>
              {listPrice > currentPrice ? (
                <div className="product-price-meta">
                  <span className="detail-list-price">MRP Rs. {listPrice.toLocaleString("en-IN")}</span>
                  <span className="detail-savings">You save Rs. {savings.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <div className="product-price-meta">
                  <span className="detail-regular-price">This product is currently listed at its regular price.</span>
                </div>
              )}
            </div>

            <div className="offer-grid">
              <div className="offer-card"><FaTag /><span>Use coupon RIDE10 for extra store discount</span></div>
              <div className="offer-card"><FaCreditCard /><span>No-cost EMI and UPI payment support</span></div>
            </div>

            <div className="variant-section">
              <div>
                <h3>Color</h3>
                <div className="chip-row">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`variant-chip${selectedColor === color ? " active" : ""}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3>Size / Fit Guide</h3>
                <div className="chip-row">
                  {SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`variant-chip${selectedSize === size ? " active" : ""}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="fit-note"><FaRulerCombined /> S: 4'8"-5'3", M: 5'3"-5'8", L: 5'8"+</p>
              </div>
            </div>

            <div className={`detail-stock-status detail-stock-${stockStatus.tone}`}>
              <span className="detail-stock-label">{stockStatus.label}</span>
              <span className="detail-stock-text">{stockStatus.detail}</span>
            </div>

            <form className="delivery-check" onSubmit={handleDeliveryCheck}>
              <label htmlFor="pincode">Delivery check</label>
              <div>
                <input
                  id="pincode"
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter pincode"
                  maxLength="6"
                />
                <button type="submit">Check</button>
              </div>
              <span>{deliveryMessage || "Estimated delivery: 2-5 business days after dispatch."}</span>
            </form>

            <div className="product-buttons">
              <button className="add-btn" onClick={() => handleAddToCart(product)} disabled={stockStatus.tone === "out"}>
                <FaShoppingCart /> Add to Cart
              </button>
              <button className="buy-btn" onClick={() => handleAddToCart(product, true)} disabled={stockStatus.tone === "out"}>
                Buy Now
              </button>
              <button className={`wishlist-detail-btn${isWishlisted ? " active" : ""}`} onClick={toggleWishlist}>
                {isWishlisted ? <FaHeart /> : <FaRegHeart />} Wishlist
              </button>
            </div>

            <div className="share-row">
              <button type="button" onClick={handleShare}><FaShareAlt /> Share product</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${product.name} ${window.location.href}`)}`} target="_blank" rel="noreferrer"><FaWhatsapp /></a>
              <a href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noreferrer"><FaFacebookF /></a>
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer"><FaInstagram /></a>
            </div>

            {isAdmin && (
              <div className="admin-actions">
                <button className="update-btn" onClick={() => navigate(`/updateproduct/${product.id}`)}>
                  <FaEdit /> Edit
                </button>
                <button className="delete-btn" onClick={handleDelete}>
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="product-info-grid">
          <article className="info-panel wide">
            <h2>Product Specifications</h2>
            <div className="spec-grid">
              {specs.map(([label, value]) => (
                <div className="spec-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="info-panel">
            <h2>Description</h2>
            <p>{product.desc || "No description provided. Contact our store team for complete product details."}</p>
          </article>

          <article className="info-panel">
            <h2>Policies</h2>
            <div className="policy-list">
              <span><FaUndoAlt /> 7 day return policy</span>
              <span><FaShieldAlt /> Warranty: {product.warranty || "Brand warranty available"}</span>
              <span><FaTruck /> Delivery in 2-5 business days</span>
              <span><FaTools /> Store service support</span>
            </div>
          </article>
        </section>

        <section className="trust-strip">
          <div><FaLock /><span>Secure Payment</span></div>
          <div><FaCheckCircle /><span>Genuine Products</span></div>
          <div><FaClipboardCheck /><span>Quality Checked</span></div>
          <div><FaComments /><span>Customer Support</span></div>
        </section>

        <section className="faq-support-grid">
          <div className="faq-panel">
            <h2><FaQuestionCircle /> Frequently Asked Questions</h2>
            {faqs.map(([question, answer], index) => (
              <button
                className={`faq-item${openFaq === index ? " active" : ""}`}
                key={question}
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              >
                <span>{question}<FaChevronDown /></span>
                {openFaq === index && <p>{answer}</p>}
              </button>
            ))}
          </div>

          <aside className="support-card">
            <FaComments />
            <h2>Need help choosing?</h2>
            <p>Chat with our cycle experts for fit, delivery, service, and payment help.</p>
            <a href="tel:+917052050415">Call +91 70520 50415</a>
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-section">
            <div className="section-title-row">
              <h2>Related Products</h2>
              <Link to="/">View all</Link>
            </div>
            <div className="related-grid">
              {relatedProducts.map((item) => (
                <Link to={`/product/${item.id}`} className="related-card" key={item.id}>
                  <img src={getImageUrl(item.id)} alt={item.name} onError={(e) => { e.target.src = accessoriesImage; }} />
                  <span>{item.brand || item.category}</span>
                  <strong>{item.name}</strong>
                  <p>Rs. {Number(item.price || 0).toLocaleString("en-IN")}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="review-section" id="reviews">
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
