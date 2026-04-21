import React from "react";
import { Link } from "react-router-dom";
import "../styles/components/Footer.css";

const Footer = () => {
  return (
    <footer className="global-footer">
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
  );
};

export default Footer;
