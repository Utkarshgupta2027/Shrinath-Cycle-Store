// src/component/AddProduct.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css"; // Create this CSS file for styling

const formatDate_ddMMyyyy = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const AddProduct = () => {
  const navigate = useNavigate();
  const [product, setProduct] = useState({
    name: "",
    brand: "",
    desc: "",
    price: "",
    category: "",
    quantity: "",
    releaseDate: "",
    available: true,
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setProduct((p) => ({ ...p, [name]: checked }));
    } else {
      setProduct((p) => ({ ...p, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0] || null);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    // basic validation
    if (!product.name || !product.price || !product.quantity) {
      alert("Please fill name, price and quantity.");
      return;
    }
    if (!image) {
      alert("Please upload a product image.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // append image with the exact name backend expects: "imgFile"
      formData.append("imgFile", image);

      // convert product to backend-friendly shape
      const backendProduct = {
        ...product,
        price: product.price?.toString() ?? "0",
        quantity: Number(product.quantity) || 0,
        available: Boolean(product.available),
        // convert date to dd-MM-yyyy if provided (backend's expected format)
        releaseDate: product.releaseDate ? formatDate_ddMMyyyy(product.releaseDate) : null,
      };

      // append product JSON as Blob named "product" (matches @RequestPart("product"))
      formData.append(
        "product",
        new Blob([JSON.stringify(backendProduct)], { type: "application/json" })
      );

      // IMPORTANT: do NOT set 'Content-Type' header here — let axios/browser set boundary
      const res = await axios.post("http://localhost:8080/api/product", formData);

      console.log("Saved:", res.data);
      alert("Product added successfully ✔");

      // reset
      setProduct({
        name: "",
        brand: "",
        desc: "",
        price: "",
        category: "",
        quantity: "",
        releaseDate: "",
        available: true,
      });
      setImage(null);
    } catch (err) {
      console.error("Add product error:", err);

      // show backend message when available
      if (err.response && err.response.data) {
        // show text or JSON message
        const detail = typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
        alert("Failed to add product: " + detail);
      } else {
        alert("Failed to add product. See console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="center-container">
        <form className="row g-3 pt-5" onSubmit={submitHandler}>

          <div className="col-md-6">
            <label className="form-label"><h6>Name</h6></label>
            <input required type="text" className="form-control" name="name" value={product.name} onChange={handleChange} />
          </div>

          <div className="col-md-6">
            <label className="form-label"><h6>Brand</h6></label>
            <input type="text" className="form-control" name="brand" value={product.brand} onChange={handleChange} />
          </div>

          <div className="col-12">
            <label className="form-label"><h6>Description</h6></label>
            <input type="text" className="form-control" name="desc" value={product.desc} onChange={handleChange} />
          </div>

          <div className="col-md-4">
            <label className="form-label"><h6>Price (₹)</h6></label>
            <input required type="number" className="form-control" name="price" value={product.price} onChange={handleChange} />
          </div>

          <div className="col-md-4">
            <label className="form-label"><h6>Category</h6></label>
            <select className="form-select" name="category" value={product.category} onChange={handleChange}>
              <option value="">Select Category</option>
              <option value="Desi">Desi</option>
              <option value="Ranger">Ranger</option>
              <option value="Ladies">Ladies</option>
              <option value="Mountain">Mountain</option>
              <option value="Raw Material">Raw Material</option>
              
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label"><h6>Quantity</h6></label>
            <input required type="number" className="form-control" name="quantity" value={product.quantity} onChange={handleChange} />
          </div>

          <div className="col-md-4">
            <label className="form-label"><h6>Release Date</h6></label>
            <input type="date" className="form-control" name="releaseDate" value={product.releaseDate} onChange={handleChange} />
            {/* <small className="text-muted">Will be converted to dd-MM-yyyy for backend</small> */}
          </div>

          <div className="col-md-4">
            <label className="form-label"><h6>Product Image</h6></label>
            <input required className="form-control" type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="col-12">
            <div className="form-check">
              <input type="checkbox" name="available" className="form-check-input" checked={product.available} onChange={handleChange} />
              <label className="form-check-label">Product Available</label>
            </div>
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Uploading..." : "Submit Product"}
            </button>
          </div>

        </form>
      </div>
      <button className="back-btn" onClick={() => navigate(-1)}>
        ⬅ Go Back
      </button>
    </div>
  );
};

export default AddProduct;
