package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.WishlistProductDTO;
import GuptaCycle.org.Shrinath.Service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    @PostMapping("/add")
    public ResponseEntity<?> addToWishlist(@RequestParam Long userId,
                                           @RequestParam Long productId) {
        wishlistService.addToWishlist(userId, productId);
        return ResponseEntity.ok("Added to wishlist");
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<WishlistProductDTO>> getWishlist(@PathVariable Long userId) {
        List<WishlistProductDTO> wishlist = (List<WishlistProductDTO>) wishlistService.getUserWishlist(userId);
        return ResponseEntity.ok(wishlist);
    }

    @DeleteMapping("/remove")
    public ResponseEntity<?> remove(@RequestParam Long userId, @RequestParam Long productId) {
        try {
            wishlistService.removeFromWishlist(userId, productId);
            return ResponseEntity.ok("Removed from wishlist");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}