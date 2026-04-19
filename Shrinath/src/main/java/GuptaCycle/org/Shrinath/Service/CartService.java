package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Cart;

import GuptaCycle.org.Shrinath.Model.CartItem;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Repository.CartItemRepository;
import GuptaCycle.org.Shrinath.Repository.CartRepository;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Transactional
public class CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductRepo productRepo;

    public Cart getCartByUserId(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUserId(userId);
                    return cartRepository.save(cart);
                });
    }
    @Autowired
    private CartItemRepository cartItemRepository;

    public Cart addToCart(Long userId, Long productId, int quantity) {

        Cart cart = getCartByUserId(userId);

        Product product = productRepo.findById(productId.intValue())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        CartItem item = cart.getItems()
                .stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst()
                .orElse(null);

        if (item != null) {
            item.setQuantity(item.getQuantity() + quantity);
            cartItemRepository.save(item); // ✅ FORCE SAVE
        } else {
            CartItem newItem = new CartItem();
            newItem.setCart(cart);      // ✅ owning side
            newItem.setProduct(product);
            newItem.setQuantity(quantity);

            cart.getItems().add(newItem); // inverse side
            cartItemRepository.save(newItem); // ✅ FORCE INSERT
        }

        return cartRepository.save(cart);
    }


    public Cart updateQuantity(Long userId, Long productId, int quantity) {
        Cart cart = getCartByUserId(userId);

        for (CartItem item : cart.getItems()) {
            // Use .equals() for Long/Integer objects
            if (item.getProduct().getId().longValue() == productId.longValue()) {
                item.setQuantity(quantity);
                cartItemRepository.save(item); // Ensure the item itself saves
            }
        }
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart removeItem(Long userId, Long productId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        // Find the item first
        CartItem itemToRemove = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId.intValue())) // Ensure type match
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Product not found in cart"));

        // 1. Break the link from the Item to the Cart
        itemToRemove.setCart(null);

        // 2. Remove from the Cart's list
        cart.getItems().remove(itemToRemove);

        // 3. Save the cart (orphanRemoval handles the rest)
        return cartRepository.save(cart);
    }
}
