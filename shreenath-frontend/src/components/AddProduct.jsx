import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/components/AddProduct.css";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";

const formatDateDdMmYyyy = (isoDate) => {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const AddProduct = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0] || null);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      alert("Only the admin can add products.");
      navigate("/");
      return;
    }

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
      formData.append("imgFile", image);

      const backendProduct = {
        ...product,
        price: product.price?.toString() ?? "0",
        quantity: Number(product.quantity) || 0,
        available: Boolean(product.available),
        releaseDate: product.releaseDate
          ? formatDateDdMmYyyy(product.releaseDate)
          : null,
      };

      formData.append(
        "product",
        new Blob([JSON.stringify(backendProduct)], {
          type: "application/json",
        })
      );

      await axios.post("http://localhost:8080/api/product", formData, {
        headers: getAuthHeaders(),
      });

      alert("Product added successfully");
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
      navigate("/admin");
    } catch (err) {
      console.error("Add product error:", err);
      const detail =
        typeof err.response?.data === "string"
          ? err.response.data
          : "Failed to add product. See console for details.";
      alert(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="center-container">
        {!isAdmin ? (
          <h3>Only the admin can access this page.</h3>
        ) : (
          <form className="row g-3 pt-5" onSubmit={submitHandler}>
            <div className="col-md-6">
              <label className="form-label"><h6>Name</h6></label>
              <input
                required
                type="text"
                className="form-control"
                name="name"
                value={product.name}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label"><h6>Brand</h6></label>
              <input
                type="text"
                className="form-control"
                name="brand"
                value={product.brand}
                onChange={handleChange}
              />
            </div>

            <div className="col-12">
              <label className="form-label"><h6>Description</h6></label>
              <input
                type="text"
                className="form-control"
                name="desc"
                value={product.desc}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label"><h6>Price (Rs.)</h6></label>
              <input
                required
                type="number"
                className="form-control"
                name="price"
                value={product.price}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label"><h6>Category</h6></label>
              <select
                className="form-select"
                name="category"
                value={product.category}
                onChange={handleChange}
              >
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
              <input
                required
                type="number"
                className="form-control"
                name="quantity"
                value={product.quantity}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label"><h6>Release Date</h6></label>
              <input
                type="date"
                className="form-control"
                name="releaseDate"
                value={product.releaseDate}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label"><h6>Product Image</h6></label>
              <input
                required
                className="form-control"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div className="col-12">
              <div className="form-check">
                <input
                  type="checkbox"
                  name="available"
                  className="form-check-input"
                  checked={product.available}
                  onChange={handleChange}
                />
                <label className="form-check-label">Product Available</label>
              </div>
            </div>

            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Uploading..." : "Submit Product"}
              </button>
            </div>
          </form>
        )}
      </div>
      <button className="back-btn" onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
};

export default AddProduct;
