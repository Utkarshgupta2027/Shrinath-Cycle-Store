package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.Cart;
import GuptaCycle.org.Shrinath.Service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "http://localhost:3000")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping("/users/{userId}") // Changed {id} to {userId}
    public ResponseEntity<Cart> getCart(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getCartByUserId(userId));
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getCartSummary(
            @RequestParam Long userId,
            @RequestParam(required = false) String couponCode) {
        try {
            return ResponseEntity.ok(cartService.getCartSummary(userId, couponCode));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            @RequestParam Long userId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        try {
            return ResponseEntity.ok(cartService.addToCart(userId, productId, quantity));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateQuantity(
            @RequestParam Long userId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        try {
            return ResponseEntity.ok(cartService.updateQuantity(userId, productId, quantity));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/remove")
    public ResponseEntity<?> removeItem(
            @RequestParam Long userId,
            @RequestParam Long productId) {
        try {
            return ResponseEntity.ok(cartService.removeItem(userId, productId));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
    }

    @PostMapping("/move-to-wishlist")
    public ResponseEntity<?> moveToWishlist(
            @RequestParam Long userId,
            @RequestParam Long productId) {
        try {
            return ResponseEntity.ok(cartService.moveItemToWishlist(userId, productId));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearCart(@RequestParam Long userId) {
        try {
            return ResponseEntity.ok(cartService.clearCart(userId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
