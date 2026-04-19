package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.Scanner;
import java.util.regex.MatchResult;
import java.util.stream.Stream;
@Service
public class ProductService {

    @Autowired
    private ProductRepo repo;

    public List<Product> getAllProducts() {
        return repo.findAll();
    }

    public Product getProductById(int id) {
        return repo.findById(id).orElse(null);
    }

    public Product addProduct(Product product, MultipartFile imgFile) throws IOException {
        product.setImgName(imgFile.getOriginalFilename());
        product.setImgType(imgFile.getContentType());
        product.setImgData(imgFile.getBytes());
        return repo.save(product);
    }

    public Product updateProduct(int id, Product newProduct, MultipartFile imgFile) throws IOException {
        Optional<Product> optional = repo.findById(id);

        if (optional.isEmpty()) return null;

        Product existing = optional.get();

        // Update all fields
        existing.setName(newProduct.getName());
        existing.setDesc(newProduct.getDesc());
        existing.setBrand(newProduct.getBrand());
        existing.setPrice(newProduct.getPrice());
        existing.setCategory(newProduct.getCategory());
        existing.setReleaseDate(newProduct.getReleaseDate());
        existing.setAvailable(newProduct.isAvailable());
        existing.setQuantity(newProduct.getQuantity());

        // Update image if provided
        if (imgFile != null && !imgFile.isEmpty()) {
            existing.setImgName(imgFile.getOriginalFilename());
            existing.setImgType(imgFile.getContentType());
            existing.setImgData(imgFile.getBytes());
        }

        return repo.save(existing);
    }

    public void deleteProduct(int id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Product not found with ID " + id);
        }
        repo.deleteById(id);
    }
}
