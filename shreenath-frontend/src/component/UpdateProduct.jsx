import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./UpdateProduct.css";
import { getAuthHeaders, getStoredUser, isAdminUser } from "../utils/auth";

const UpdateProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const [image, setImage] = useState(null);
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
          releaseDate: product.releaseDate || "",
          productAvailable: Boolean(product.available),
          stockQuantity: product.quantity || "",
        });

        const responseImage = await axios.get(
          `http://localhost:8080/api/product/${id}/image`,
          { responseType: "blob" }
        );

        if (responseImage.data && responseImage.data.size > 0) {
          const imgFile = new File(
            [responseImage.data],
            product.imgName || "image.jpg",
            {
              type: responseImage.data.type,
            }
          );
          setImage(imgFile);
        }
      } catch (error) {
        console.error("Error fetching product or image:", error);
      }
    };

    fetchProduct();
  }, [id, isAdmin, navigate]);

  const handleSubmit = (e) => {
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
      price: updateProduct.price,
      category: updateProduct.category,
      releaseDate: updateProduct.releaseDate,
      quantity: updateProduct.stockQuantity,
      available: updateProduct.productAvailable,
    };

    form.append(
      "product",
      new Blob([JSON.stringify(productData)], { type: "application/json" })
    );

    axios
      .put(`http://localhost:8080/api/product/${id}`, form, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
      })
      .then(() => {
        alert("Product updated successfully!");
        navigate("/admin");
      })
      .catch((error) => {
        console.error(
          "Error updating:",
          error.response ? error.response.data : error
        );
        alert(error.response?.data || "Failed to update product.");
      });
  };

  const handleChange = (e) => {
    setUpdateProduct({ ...updateProduct, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0] || null);
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
                {image && (
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Product"
                    className="preview-img"
                  />
                )}
                <input type="file" onChange={handleImageChange} />
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
