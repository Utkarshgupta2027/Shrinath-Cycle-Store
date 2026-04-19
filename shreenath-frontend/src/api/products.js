export async function fetchProductById(id) {
  const response = await fetch(`http://localhost:8080/api/product/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch product");
  }
  return response.json();
}
