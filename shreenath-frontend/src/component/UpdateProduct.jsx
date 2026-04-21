import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./UpdateProduct.css";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";

const formatDateForInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const formatDateDdMmYyyy = (isoDate) => {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const UpdateProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [updateProduct, setUpdateProduct] = useState({
    id: null,
    name: "",
    description: "",
    brand: "",
    price: "",
    category: "",
    releaseDate: "",
    productAvailable: false,
    stockQuantity: "",
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }

    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/product/${id}`);
        const product = response.data;

        setUpdateProduct({
          id: product.id,
          name: product.name || "",
          description: product.desc || "",
          brand: product.brand || "",
          price: product.price || "",
          category: product.category || "",
          releaseDate: formatDateForInput(product.releaseDate),
          productAvailable: Boolean(product.available),
          stockQuantity: product.quantity || "",
        });

        setPreviewUrl(`http://localhost:8080/api/product/${id}/image`);
      } catch (error) {
        console.error("Error fetching product or image:", error);
        alert("Failed to load product details.");
      }
    };

    fetchProduct();
  }, [id, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      alert("Only the admin can update products.");
      navigate("/");
      return;
    }

    const form = new FormData();

    if (image) {
      form.append("imgFile", image);
    }

    const productData = {
      id: updateProduct.id,
      name: updateProduct.name,
      brand: updateProduct.brand,
      desc: updateProduct.description,
      price: updateProduct.price?.toString() ?? "0",
      category: updateProduct.category,
      releaseDate: formatDateDdMmYyyy(updateProduct.releaseDate),
      quantity: Number(updateProduct.stockQuantity) || 0,
      available: updateProduct.productAvailable,
    };

    form.append(
      "product",
      new Blob([JSON.stringify(productData)], { type: "application/json" })
    );

    try {
      await axios.put(`http://localhost:8080/api/product/${id}`, form, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
      });
      alert("Product updated successfully!");
      navigate("/admin");
    } catch (error) {
      console.error("Error updating:", error.response ? error.response.data : error);
      alert(error.response?.data || "Failed to update product.");
    }
  };

  const handleChange = (e) => {
    setUpdateProduct({ ...updateProduct, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0] || null;
    setImage(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="update-container">
      <div className="update-card">
        {!isAdmin ? (
          <h1 className="update-title">Admin Access Only</h1>
        ) : (
          <>
            <h1 className="update-title">Update Product</h1>

            <form onSubmit={handleSubmit} className="update-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  name="name"
                  value={updateProduct.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Brand</label>
                <input
                  name="brand"
                  value={updateProduct.brand}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full">
                <label>Description</label>
                <input
                  name="description"
                  value={updateProduct.description}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  name="price"
                  value={updateProduct.price}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={updateProduct.category}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  <option value="Desi">Desi</option>
                  <option value="Ranger">Ranger</option>
                  <option value="Ladies">Ladies</option>
                  <option value="Mountain">Mountain</option>
                  <option value="Raw Material">Raw Material</option>
                </select>
              </div>

              <div className="form-group">
                <label>Release Date</label>
                <input
                  type="date"
                  name="releaseDate"
                  value={updateProduct.releaseDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={updateProduct.stockQuantity}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full">
                <label>Product Image</label>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Product"
                    className="preview-img"
                  />
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={updateProduct.productAvailable}
                  onChange={(e) =>
                    setUpdateProduct({
                      ...updateProduct,
                      productAvailable: e.target.checked,
                    })
                  }
                />
                <label>Product Available</label>
              </div>

              <button type="submit" className="submit-btn">
                Update Product
              </button>
            </form>
          </>
        )}

        <button className="back-btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  );
};

export default UpdateProduct;
