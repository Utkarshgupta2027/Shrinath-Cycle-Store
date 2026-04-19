package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService service;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getAllProducts() {
        return new ResponseEntity<>(service.getAllProducts(), HttpStatus.OK);
    }
    @PutMapping("/product/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable int id,
                                           @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
                                           @RequestPart("product") Product product,
                                           @RequestPart(value = "imgFile", required = false) MultipartFile imgFile) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            Product updatedProduct = service.updateProduct(id, product, imgFile);
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
            @RequestPart("imgFile") MultipartFile imgFile) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            Product savedProduct = service.addProduct(product, imgFile);
            return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Add this inside ProductController.java
    @GetMapping("/product/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable int id) {
        Product product = service.getProductById(id);

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
