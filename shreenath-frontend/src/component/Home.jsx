import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./home.css";

import { FaShoppingCart, FaUser, FaSearch, FaMapMarkerAlt, FaHeart, FaRegHeart } from "react-icons/fa";

import logo from "../images/logo.png";
import hero1 from "../images/hero1.webp";
import hero2 from "../images/hero2.webp";
import hero3 from "../images/hero3.webp";
import hero4 from "../images/hero4.jpeg";
import { getStoredUser, isAdminUser } from "../utils/auth";

function Home() {
  const [address, setAddress] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  useEffect(() => {
    fetch("http://localhost:8080/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Product fetch error:", err));

    if (user?.id) {
      fetch(`http://localhost:8080/api/wishlist/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setWishlistIds(data.map((item) => item.productId));
        })
        .catch((err) => console.error("Wishlist fetch error:", err));
    }
  }, [user?.id]);

  const handleAddToCart = async (e, product) => {
    e.preventDefault(); // Prevent navigating to product detail
    if (!user?.id) {
      alert("Please login to add items to cart");
      return;
    }

    try {
      const params = new URLSearchParams({
        userId: user.id,
        productId: product.id,
        quantity: 1,
      });

      const response = await fetch(
        `http://localhost:8080/api/cart/add?${params.toString()}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        alert(`${product.name} added to cart!`);
      } else {
        alert("Failed to add to cart.");
      }
    } catch (err) {
      alert("Network error while adding to cart");
    }
  };

  const toggleWishlist = async (e, productId) => {
    e.preventDefault(); // Prevent navigating to product detail
    if (!user?.id) {
      alert("Please login first");
      return;
    }

    const isAdded = wishlistIds.includes(productId);
    const endpoint = isAdded ? "remove" : "add";
    const method = isAdded ? "DELETE" : "POST";
    const params = new URLSearchParams({
      userId: user.id,
      productId,
    });

    try {
      const res = await fetch(
        `http://localhost:8080/api/wishlist/${endpoint}?${params.toString()}`,
        {
          method,
        }
      );

      if (res.ok) {
        if (isAdded) {
          setWishlistIds((prev) => prev.filter((id) => id !== productId));
        } else {
          setWishlistIds((prev) => [...prev, productId]);
        }
      }
    } catch (err) {
      alert("Network error updating wishlist");
    }
  };

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      setError("");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const addr = data.address;
            const fullAddress = [
              addr.house_number || "",
              addr.road || "",
              addr.suburb || addr.neighbourhood || "",
              addr.city || addr.town || addr.village || "",
              addr.state || "",
              addr.postcode || "",
            ]
              .filter((segment) => segment !== "")
              .join(", ");

            setAddress(fullAddress || data.display_name);
          } catch (err) {
            setError("Unable to fetch address details. Please try again.");
          }
        },
        (err) => {
          if (err.code === 1) {
            setError("Location access denied. Please enable it in settings.");
          } else {
            setError("Location unavailable.");
          }
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  return (
    <>
      <nav>
        <div className="nav-container">
          <div className="logo-section">
            <Link to="/">
              <img src={logo} alt="Logo" className="logo" />
            </Link>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(`Searching: ${searchTerm}`);
            }}
            className="search-form"
          >
            <input
              type="text"
              placeholder="Search for cycles, accessories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <FaSearch />
            </button>
          </form>

          <ul className="nav-links">
            {isAdmin && (
              <li>
                <Link to="/admin">Admin Panel</Link>
              </li>
            )}
            <li>
              <Link to="/Cart" className="nav-icon-link">
                <FaShoppingCart />
              </Link>
            </li>
            <li>
              <Link to="/UserAccount" className="nav-icon-link">
                <FaUser />
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="location-box">
        <button className="location-btn" onClick={getUserLocation}>
          <FaMapMarkerAlt /> {address ? "Update Location" : "Set Delivery Location"}
        </button>

        {address && (
          <span className="location-info">
            Delivery to: <strong>{address}</strong>
          </span>
        )}

        {error && <span className="error-text">{error}</span>}
      </div>

      <section className="hero-banner">
        <div className="slider">
          {[hero1, hero2, hero3, hero4].map((image, index) => (
            <div key={index} className="slide">
              <img src={image} alt={`Hero ${index}`} />
            </div>
          ))}
        </div>
        <div className="hero-content">
          <h2>Ride Your Passion</h2>
          <p>Discover our premium selection of cycles, gear, and accessories. Designed for performance, built for the journey.</p>
          <a href="#products" className="hero-cta">Shop Now</a>
        </div>
      </section>

      <div className="product-section" id="products">
        <div className="section-header">
          <h2>Featured Products</h2>
        </div>
        
        <div className="product-grid">
          {products.length > 0 ? (
            products.map((product) => (
              <div className="product-card" key={product.id}>
                <Link to={`/product/${product.id}`} className="product-img-wrapper">
                  <img
                    src={`http://localhost:8080/api/product/${product.id}/image`}
                    className="product-img"
                    alt={product.name}
                  />
                  <button
                    className={`wishlist-btn ${wishlistIds.includes(product.id) ? "active" : ""}`}
                    onClick={(e) => toggleWishlist(e, product.id)}
                  >
                    {wishlistIds.includes(product.id) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </Link>
                
                <div className="product-info">
                  <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                    <h3>{product.name}</h3>
                    <p className="product-price">Rs. {product.price}</p>
                  </Link>
                  <button
                    className="add-to-cart-btn"
                    onClick={(e) => handleAddToCart(e, product)}
                  >
                    <FaShoppingCart /> Add to Cart
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="loading">Loading products...</p>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>ShreeNathCycleStore</h4>
            <p>Your premium destination for cycles and accessories. We deliver quality directly to your doorstep.</p>
          </div>
          <div className="footer-section">
            <h4>Shop</h4>
            <ul>
              <li><Link to="/">Mountain Bikes</Link></li>
              <li><Link to="/">Road Bikes</Link></li>
              <li><Link to="/">Accessories</Link></li>
              <li><Link to="/">New Arrivals</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><Link to="/">Contact Us</Link></li>
              <li><Link to="/">FAQs</Link></li>
              <li><Link to="/">Shipping & Returns</Link></li>
              <li><Link to="/">Track Order</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ShreeNathCycleStore.com. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default Home;
