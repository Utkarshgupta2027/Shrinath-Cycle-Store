package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.ProductResponse;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.ProductImage;
import GuptaCycle.org.Shrinath.Repository.ProductImageRepository;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private ProductService service;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    @GetMapping("/products")
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        return new ResponseEntity<>(service.getAllProducts(), HttpStatus.OK);
    }

    /**
     * Feature 9 — Filtered / sorted product search.
     * GET /api/products/search?q=ranger&category=Mountain&minPrice=500&maxPrice=15000&inStockOnly=true&sortBy=PRICE_ASC
     */
    @GetMapping("/products/search")
    public ResponseEntity<List<ProductResponse>> searchProducts(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "brand", required = false) String brand,
            @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(value = "inStockOnly", defaultValue = "false") boolean inStockOnly,
            @RequestParam(value = "sortBy", required = false) String sortBy) {
        return ResponseEntity.ok(service.getFilteredProducts(keyword, category, brand, minPrice, maxPrice, inStockOnly, sortBy));
    }
    @PutMapping("/product/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable int id,
                                           @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
                                           @RequestPart("product") Product product,
                                           @RequestParam(value = "imgFile", required = false) MultipartFile imgFile,
                                           @RequestParam(value = "extraImages", required = false) List<MultipartFile> extraImages,
                                           @RequestParam(value = "replaceExtra", defaultValue = "false") boolean replaceExtra) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            Product updatedProduct = service.updateProduct(id, product, imgFile, extraImages, replaceExtra);
            if (updatedProduct != null) {
                return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("Failed to update", HttpStatus.BAD_REQUEST);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/product")
    public ResponseEntity<?> addProduct(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestPart("product") Product product,
            @RequestPart("imgFile") MultipartFile imgFile,
            @RequestParam(value = "extraImages", required = false) List<MultipartFile> extraImages) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            Product savedProduct = service.addProduct(product, imgFile, extraImages);
            return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Add this inside ProductController.java
    @GetMapping("/product/{id}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable int id) {
        ProductResponse product = service.getProductResponseById(id);

        if (product != null) {
            return new ResponseEntity<>(product, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    // 🔥 ADD THIS METHOD
    @GetMapping("/product/{id}/image")
    public ResponseEntity<byte[]> getImgByProductId(@PathVariable int id) {

        Product product = service.getProductById(id);

        if (product == null || product.getImgData() == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header("Content-Type", product.getImgType())
                .body(product.getImgData());
    }

    /** Serve an extra gallery image by its own ID */
    @GetMapping("/product/{productId}/gallery/{imageId}")
    public ResponseEntity<byte[]> getGalleryImage(@PathVariable int productId,
                                                   @PathVariable Long imageId) {
        return productImageRepository.findById(imageId)
                .filter(pi -> pi.getProductId().equals(productId))
                .map(pi -> ResponseEntity.ok()
                        .header("Content-Type", pi.getImgType())
                        .body(pi.getImgData()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** Delete a single extra gallery image (admin only) */
    @DeleteMapping("/product/{productId}/gallery/{imageId}")
    public ResponseEntity<?> deleteGalleryImage(@PathVariable int productId,
                                                 @PathVariable Long imageId,
                                                 @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) return authFailure;
        return productImageRepository.findById(imageId)
                .filter(pi -> pi.getProductId().equals(productId))
                .map(pi -> { productImageRepository.delete(pi); return ResponseEntity.ok().body("Deleted"); })
                .orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/product/{id}")
    public ResponseEntity<String> deleteProduct(@PathVariable int id,
                                                @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return ResponseEntity.status(authFailure.getStatusCode())
                    .body(String.valueOf(authFailure.getBody()));
        }

        try {
            service.deleteProduct(id);
            return new ResponseEntity<>("Product deleted successfully", HttpStatus.OK);
        } catch (Exception e) {
            // This will send the "Product not found" or "Constraint violation" error to React
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> authorizeAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Admin authorization is required.");
        }

        String token = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid or expired token.");
        }

        String phoneNumber = jwtUtils.getUserNameFromJwtToken(token);
        if (!authService.isAdminPhoneNumber(phoneNumber)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Only the admin can manage products.");
        }

        return null;
    }
}
