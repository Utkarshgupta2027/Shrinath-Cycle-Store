package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.ProductResponse;
import GuptaCycle.org.Shrinath.Model.RestockSubscription;
import GuptaCycle.org.Shrinath.Repository.RestockSubscriptionRepository;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
                   RequestMethod.DELETE, RequestMethod.OPTIONS})
public class InventoryController {

    @Autowired
    private ProductService productService;

    @Autowired
    private RestockSubscriptionRepository restockSubscriptionRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    /**
     * GET /api/admin/low-stock
     * Returns products with quantity < 5.
     */
    @GetMapping("/admin/low-stock")
    public ResponseEntity<?> getLowStockProducts(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        ResponseEntity<?> auth = authorizeAdmin(authHeader);
        if (auth != null) return auth;
        List<ProductResponse> lowStock = productService.getLowStockProducts();
        return ResponseEntity.ok(lowStock);
    }

    /**
     * POST /api/products/{id}/notify-restock
     * Body: { "email": "user@example.com", "userId": 5 (optional) }
     * Subscribe to a restock notification for an out-of-stock product.
     */
    @PostMapping("/products/{id}/notify-restock")
    public ResponseEntity<?> subscribeToRestock(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {

        String email = body.containsKey("email") ? body.get("email").toString().trim() : "";
        Long userId = body.containsKey("userId") && body.get("userId") != null
                ? Long.parseLong(body.get("userId").toString()) : null;

        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        if (productService.getProductById(id) == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Product not found."));
        }

        if (restockSubscriptionRepository.existsByProductIdAndUserEmail(id, email)) {
            return ResponseEntity.ok(Map.of("message", "You are already subscribed to restock notifications for this product."));
        }

        RestockSubscription sub = new RestockSubscription();
        sub.setProductId(id);
        sub.setUserEmail(email);
        sub.setUserId(userId);
        sub.setSubscribedAt(LocalDateTime.now());
        sub.setNotified(false);
        restockSubscriptionRepository.save(sub);

        return ResponseEntity.ok(Map.of("message", "You will be notified when this product is back in stock!"));
    }

    // ─── Auth helper ──────────────────────────────────────────────────────────

    private ResponseEntity<?> authorizeAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin authorization is required.");
        }
        String token = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired token.");
        }
        String phoneNumber = jwtUtils.getUserNameFromJwtToken(token);
        if (!authService.isAdminPhoneNumber(phoneNumber)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the admin can access inventory data.");
        }
        return null;
    }
}
