import { API_BASE_URL } from "../config";

export async function fetchProductById(id) {
  const response = await fetch(`${API_BASE_URL}/api/product/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch product");
  }
  return response.json();
}
