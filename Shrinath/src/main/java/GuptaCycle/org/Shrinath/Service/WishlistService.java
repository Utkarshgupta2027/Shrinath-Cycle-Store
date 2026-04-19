package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.WishlistProductDTO;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Model.Wishlist;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import GuptaCycle.org.Shrinath.Repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WishlistService {

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepo productRepository;

    public void addToWishlist(Long userId, Long productId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Product product = productRepository.findById(Math.toIntExact(productId))
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Check if already in wishlist to avoid duplicates
        if (wishlistRepository.findByUserAndProduct(user, product).isEmpty()) {
            Wishlist wishlist = new Wishlist();
            wishlist.setUser(user);
            wishlist.setProduct(product);
            wishlistRepository.save(wishlist);
        }
    }

    public List<WishlistProductDTO> getUserWishlist(Long userId) {
        // 1. Fetch the user object from the database
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Find all wishlist entries linked to this user
        List<Wishlist> items = wishlistRepository.findByUser(user);

        // 3. Map the entities to WishlistProductDTO
        return items.stream().map(item -> new WishlistProductDTO(
                item.getId(),                          // wishlistId
                Long.valueOf(item.getProduct().getId()), // productId
                item.getProduct().getName(),           // name
                item.getProduct().getPrice(),          // price
                "http://localhost:8080/api/product/" + item.getProduct().getId() + "/image" // imageUrl
        )).collect(Collectors.toList());
    }

    @Transactional
    public void removeFromWishlist(Long userId, Long productId) {
        User user = userRepository.findById(userId).orElseThrow();
        Product product = productRepository.findById(Math.toIntExact(productId)).orElseThrow();
        wishlistRepository.deleteByUserAndProduct(user, product);
    }
}