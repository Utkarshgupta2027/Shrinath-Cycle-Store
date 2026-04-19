package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.Cart;
import GuptaCycle.org.Shrinath.Service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
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

    @PostMapping("/add")
    public ResponseEntity<Cart> addToCart(
            @RequestParam Long userId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(
                cartService.addToCart(userId, productId, quantity)
        );
    }

    @PutMapping("/update")
    public ResponseEntity<Cart> updateQuantity(
            @RequestParam Long userId,
            @RequestParam Long productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(
                cartService.updateQuantity(userId, productId, quantity)
        );
    }

    @DeleteMapping("/remove")
    public ResponseEntity<Cart> removeItem(
            @RequestParam Long userId,
            @RequestParam Long productId) {
        return ResponseEntity.ok(
                cartService.removeItem(userId, productId)
        );
    }
}
