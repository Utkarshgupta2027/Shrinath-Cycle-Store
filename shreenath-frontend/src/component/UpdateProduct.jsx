import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./UpdateProduct.css"; // ✅ separate CSS

const UpdateProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState({});
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
  const fetchProduct = async () => {
    try {
      // 1. Fetch Product Data
      const response = await axios.get(`http://localhost:8080/api/product/${id}`);
      setProduct(response.data);
      setUpdateProduct(response.data);

      // 2. Fetch Image Data as a Blob
      const responseImage = await axios.get(
        `http://localhost:8080/api/product/${id}/image`,
        { responseType: "blob" }
      );

      // 3. SAFE IMAGE CONVERSION
      if (responseImage.data && responseImage.data.size > 0) {
        const imgFile = new File([responseImage.data], response.data.imgName || "image.jpg", {
          type: responseImage.data.type,
        });
        setImage(imgFile);
      }
      
    } catch (error) {
      console.error("Error fetching product or image:", error);
    }
  };

  fetchProduct();
}, [id]);
 const handleSubmit = (e) => {
  e.preventDefault();

  const form = new FormData();
  
  // 1. Key must match backend @RequestPart("imgFile")
  form.append("imgFile", image); 

  // 2. Ensure the object fields match your Java Model (e.g., 'desc' instead of 'description')
  const productData = {
    ...updateProduct,
    desc: updateProduct.description, // Mapping React 'description' to Java 'desc'
    quantity: updateProduct.stockQuantity, // Mapping 'stockQuantity' to 'quantity'
    available: updateProduct.productAvailable // Mapping 'productAvailable' to 'available'
  };

  form.append(
    "product",
    new Blob([JSON.stringify(productData)], { type: "application/json" })
  );

  axios
    .put(`http://localhost:8080/api/product/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(() => {
      alert("Product updated successfully!");
      navigate(`/Product/${id}`);
    })
    .catch((error) => {
      console.error("Error updating:", error.response ? error.response.data : error);
      alert("Failed to update. Check console for details.");
    });
};
  const handleChange = (e) => {
    setUpdateProduct({ ...updateProduct, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  return (
    <div className="update-container">

      <div className="update-card">
        <h1 className="update-title">Update Product</h1>

        <form onSubmit={handleSubmit} className="update-form">

          <div className="form-group">
            <label>Name</label>
            <input name="name" value={updateProduct.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Brand</label>
            <input name="brand" value={updateProduct.brand} onChange={handleChange} />
          </div>

          <div className="form-group full">
            <label>Description</label>
            <input name="description" value={updateProduct.description} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input type="number" name="price" value={updateProduct.price} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select name="category" value={updateProduct.category} onChange={handleChange}>
              <option>Select category</option>
              <option value="Desi">Desi</option>
              <option value="Ranger">Ranger</option>
              <option value="Ladies">Ladies</option>
              <option value="Mountain">Mountain</option>
              <option value="Raw Material">Raw Material</option>
            </select>
          </div>

          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" name="stockQuantity"
                   value={updateProduct.stockQuantity} onChange={handleChange} />
          </div>

          <div className="form-group full">
            <label>Product Image</label>
            <img
              src={image ? URL.createObjectURL(image) : ""}
              alt="Product"
              className="preview-img"
            />
            <input type="file" onChange={handleImageChange} />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={updateProduct.productAvailable}
              onChange={(e) =>
                setUpdateProduct({ ...updateProduct, productAvailable: e.target.checked })
              }
            />
            <label>Product Available</label>
          </div>

          <button type="submit" className="submit-btn">Update Product</button>
        </form>

        <button className="back-btn" onClick={() => navigate(-1)}>⬅ Go Back</button>
      </div>

    </div>
  );
};

export default UpdateProduct;
