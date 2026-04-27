package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.OrderStatusUpdateRequest;
import GuptaCycle.org.Shrinath.Model.Order;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Model.OrderRequest;
import GuptaCycle.org.Shrinath.Service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(orderService.saveOrder(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public List<Order> getOrdersByUser(@PathVariable Long userId) {
        return orderService.getOrdersByUser(userId);
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getAllOrders(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/admin/analytics")
    public ResponseEntity<?> getAdminAnalytics(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        return ResponseEntity.ok(orderService.getAdminAnalytics());
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long orderId,
                                               @RequestBody OrderStatusUpdateRequest request,
                                               @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            return ResponseEntity.ok(orderService.updateOrderStatus(orderId, request.getStatus()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<?> deleteOrder(@PathVariable Long orderId,
                                         @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        try {
            orderService.deleteOrder(orderId);
            return ResponseEntity.ok("Order deleted successfully.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{orderId}/address")
    public ResponseEntity<?> updateOrderAddress(@PathVariable Long orderId, @RequestBody Map<String, String> request) {
        try {
            String newAddress = request.get("address");
            return ResponseEntity.ok(orderService.updateOrderAddress(orderId, newAddress));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long orderId) {
        try {
            return ResponseEntity.ok(orderService.cancelOrder(orderId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrderPost(@PathVariable Long orderId) {
        return cancelOrder(orderId);
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
                    .body("Only the admin can manage orders.");
        }

        return null;
    }
}
