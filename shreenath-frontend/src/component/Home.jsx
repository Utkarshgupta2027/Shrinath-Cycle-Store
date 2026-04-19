import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./home.css";

import logo from "../images/logo.png";
import cart from "../images/cart.jpg";
import login from "../images/login.webp";
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

  const handleAddToCart = async (product) => {
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

  const toggleWishlist = async (productId) => {
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
            <h4 className="store-name">ShreeNathCycleStore.com</h4>
          </div>
          <ul className="nav-links">
            <li>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(`Searching: ${searchTerm}`);
                }}
                className="search-form"
              >
                <input
                  type="text"
                  placeholder="Search cycles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">
                  Search
                </button>
              </form>
            </li>
            {isAdmin && (
              <li>
                <Link to="/admin">Admin Panel</Link>
              </li>
            )}
            <li className="nav-icon">
              <Link to="/Cart">
                <img src={cart} className="icon-img" alt="Cart" />
              </Link>
            </li>
            <li className="nav-icon">
              <Link to="/UserAccount">
                <img src={login} className="icon-img" alt="Login" />
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="location-box">
        <button className="location-btn" onClick={getUserLocation}>
          Get Live Location
        </button>

        {address && (
          <div className="address-container">
            <p className="location-info">
              <strong>Delivery to:</strong> {address}
            </p>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>

      <section className="hero-slider">
        <div className="slider">
          {[hero1, hero2, hero3, hero4].map((image, index) => (
            <div key={index} className="slide">
              <img src={image} alt={`Hero ${index}`} />
            </div>
          ))}
        </div>
        <div className="hero-overlay">
          <h2>Welcome to ShreeNathCycleStore!</h2>
          <p>Your one-stop shop for all cycling needs.</p>
        </div>
      </section>

      <div className="product-section">
        <h2>Featured Products</h2>
        <div className="product-grid">
          {products.length > 0 ? (
            products.map((product) => (
              <div className="product-card" key={product.id}>
                <Link to={`/product/${product.id}`} className="product-link">
                  <img
                    src={`http://localhost:8080/api/product/${product.id}/image`}
                    className="product-img"
                    alt={product.name}
                  />
                  <h3>{product.name}</h3>
                  <p className="product-price">Rs. {product.price}</p>
                </Link>
                <div className="button-group">
                  <button
                    className="wishlist-btn"
                    onClick={() => toggleWishlist(product.id)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "1.5rem",
                    }}
                  >
                    {wishlistIds.includes(product.id) ? "♥" : "♡"}
                  </button>
                  <button
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
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
        <div className="footer-bottom">
          © 2025 ShreeNathCycleStore.com
        </div>
      </footer>
    </>
  );
}

export default Home;
