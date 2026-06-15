import React, { useEffect, useState, useContext } from "react";
import { API_BASE_URL } from "../config";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchProductById } from "../api/products";
import AppContext from "../Context/Context";
import "../styles/components/product.css";
import axios from "axios";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";
import { confirmAction, copyTextToClipboard } from "../utils/browser";
import { gaTrackProductView, gaTrackAddToCart } from "../utils/googleAnalytics";
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

const getImageUrl = (productId) => `${API_BASE_URL}/api/product/${productId}/image`;

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
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState("");
  const [reviewSortBy, setReviewSortBy] = useState("NEWEST");
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
        // GA4: track product view after data loads
        gaTrackProductView(data);

        const reviewResponse = await fetch(
          `${API_BASE_URL}/api/product/${productId}/reviews?sortBy=${reviewSortBy}`
        );
        const reviewData = reviewResponse.ok ? await reviewResponse.json() : [];
        setReviews(Array.isArray(reviewData) ? reviewData : []);

        const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
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
  }, [productId, reviewSortBy]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_BASE_URL}/api/wishlist/${user.id}`)
      .then((res) => res.json())
      .then((data) => setWishlistIds(Array.isArray(data) ? data.map((item) => item.productId) : []))
      .catch(() => {});
  }, [user?.id]);

  const loadReviews = async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/product/${productId}/reviews?sortBy=${reviewSortBy}`
    );
    if (!response.ok) throw new Error("Failed to load reviews");
    const data = await response.json();
    setReviews(Array.isArray(data) ? data : []);
  };

  const handleDelete = async () => {
    if (!product || !confirmAction(`Delete ${product.name}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/product/${product.id}`, {
        headers: getAuthHeaders(),
      });
      setActionMessage("Product deleted.");
      navigate("/admin");
    } catch (err) {
      setActionMessage(
        err.response?.data ||
          "Failed to delete. The product may be linked to other records."
      );
    }
  };

  const handleAddToCart = async (selectedProduct, shouldCheckout = false) => {
    if (!selectedProduct.available || selectedProduct.quantity <= 0) {
      setActionMessage("This product is currently out of stock.");
      return false;
    }

    try {
      const success = await addToCart(selectedProduct, 1);
      if (success) {
        // GA4: add to cart event
        gaTrackAddToCart(selectedProduct, 1);
        if (shouldCheckout) {
          navigate("/checkout");
        } else {
          setActionMessage(`${selectedProduct.name} added to cart.`);
        }
        return true;
      } else {
        setActionMessage("Failed to add to cart. Please try again.");
      }
    } catch (err) {
      console.error("Cart error:", err);
      setActionMessage(err.message || "Failed to add to cart. Please try again.");
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
      const response = await fetch(`${API_BASE_URL}/api/wishlist/${endpoint}?${params}`, { method });
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
      setReviewStatus("Please login to leave a review.");
      navigate("/login");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewStatus("");

      const formData = new FormData();
      formData.append("review", JSON.stringify({
        userId: user.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      }));
      if (reviewPhoto) {
        formData.append("photo", reviewPhoto);
      }

      const response = await fetch(`${API_BASE_URL}/api/product/${product.id}/reviews`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof data === "string" ? data : "Failed to submit review.");
      }

      await Promise.all([loadReviews(), fetchProductById(productId).then(setProduct)]);
      setReviewStatus("Your review has been submitted and is awaiting moderation.");
      setReviewPhoto(null);
      setReviewPhotoPreview("");
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
      } else {
        await copyTextToClipboard(window.location.href);
        setActionMessage("Product link copied to clipboard.");
      }
    } catch {
      setActionMessage("Sharing is not available right now.");
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
  // Build gallery: primary image first, then any extra gallery images from the DB
  const galleryImages = [
    { src: getImageUrl(product.id), label: "Main" },
    ...((product.extraImageIds || []).map((imgId, i) => ({
      src: `${API_BASE_URL}/api/product/${product.id}/gallery/${imgId}`,
      label: `Photo ${i + 2}`,
    }))),
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

              {/* Photo upload */}
              <div style={{marginBottom:"0.75rem"}}>
                <label style={{fontSize:"0.85rem",color:"var(--text-muted)",display:"block",marginBottom:"0.4rem"}}>📷 Add a photo (optional)</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  setReviewPhoto(file || null);
                  setReviewPhotoPreview(file ? URL.createObjectURL(file) : "");
                }} />
                {reviewPhotoPreview && <img src={reviewPhotoPreview} alt="preview" style={{marginTop:"0.5rem",maxHeight:"100px",borderRadius:"8px",objectFit:"cover"}} />}
              </div>

              <div className="review-form-actions">
                <button type="submit" className="review-submit-btn" disabled={submittingReview}>
                  {submittingReview ? "Saving..." : existingUserReview ? "Update Review" : "Submit Review"}
                </button>
                {reviewStatus && <span className="review-status">{reviewStatus}</span>}
              </div>
            </form>

            {/* Sort controls */}
            <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",alignItems:"center"}}>
              <span style={{fontSize:"0.85rem",color:"var(--text-muted)"}}>Sort by:</span>
              {["NEWEST", "MOST_HELPFUL"].map(sort => (
                <button key={sort}
                  type="button"
                  style={{padding:"0.3rem 0.8rem",borderRadius:"999px",border:"1px solid var(--border)",background:reviewSortBy===sort?"var(--primary)":"transparent",color:reviewSortBy===sort?"#fff":"var(--text)",fontSize:"0.8rem",cursor:"pointer"}}
                  onClick={() => setReviewSortBy(sort)}
                >{sort === "NEWEST" ? "🕒 Newest" : "👍 Most Helpful"}</button>
              ))}
            </div>

            <div className="review-list">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card-top">
                      <div>
                        <h4>
                          {review.userName || "Customer"}
                          {review.verifiedPurchase && (
                            <span style={{marginLeft:"0.5rem",background:"#065f46",color:"#d1fae5",fontSize:"0.65rem",padding:"2px 7px",borderRadius:"999px",fontWeight:600}}>✅ Verified Purchase</span>
                          )}
                        </h4>
                        <span className="review-date">{formatReviewDate(review.updatedAt || review.createdAt)}</span>
                      </div>
                      <div className="review-card-rating">{renderStars(review.rating)}</div>
                    </div>
                    <p>{review.comment}</p>
                    {review.hasPhoto && (
                      <img src={`${API_BASE_URL}/api/review/${review.id}/photo`} alt="Customer photo" style={{marginTop:"0.5rem",maxHeight:"160px",borderRadius:"10px",objectFit:"cover"}} />
                    )}
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginTop:"0.5rem"}}>
                      <button
                        type="button"
                        style={{fontSize:"0.8rem",background:"transparent",border:"1px solid var(--border)",borderRadius:"999px",padding:"3px 10px",cursor:"pointer",color:"var(--text-muted)"}}
                        onClick={() => fetch(`${API_BASE_URL}/api/review/${review.id}/helpful`,{method:"POST"}).then(()=>loadReviews()).catch(()=>{})}
                      >👍 Helpful ({review.helpfulVotes})</button>
                    </div>
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
