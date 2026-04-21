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

    @Autowired
    private CartItemRepository cartItemRepository;

    public Cart getCartByUserId(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUserId(userId);
                    return cartRepository.save(cart);
                });
    }

    public Cart addToCart(Long userId, Long productId, int quantity) {
        validateIdentifiers(userId, productId);
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1.");
        }

        Cart cart = getCartByUserId(userId);
        Product product = productRepo.findById(productId.intValue())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.isAvailable() || product.getQuantity() <= 0) {
            throw new IllegalStateException("This product is currently out of stock.");
        }

        CartItem item = cart.getItems().stream()
                .filter(existingItem -> existingItem.getProduct().getId().equals(productId.intValue()))
                .findFirst()
                .orElse(null);

        if (item != null) {
            int updatedQuantity = item.getQuantity() + quantity;
            if (updatedQuantity > product.getQuantity()) {
                throw new IllegalArgumentException("Requested quantity exceeds available stock.");
            }

            item.setQuantity(updatedQuantity);
            cartItemRepository.save(item);
        } else {
            if (quantity > product.getQuantity()) {
                throw new IllegalArgumentException("Requested quantity exceeds available stock.");
            }

            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProduct(product);
            newItem.setQuantity(quantity);

            cart.getItems().add(newItem);
            cartItemRepository.save(newItem);
        }

        return cartRepository.save(cart);
    }

    public Cart updateQuantity(Long userId, Long productId, int quantity) {
        validateIdentifiers(userId, productId);

        if (quantity <= 0) {
            return removeItem(userId, productId);
        }

        Cart cart = getCartByUserId(userId);
        Product product = productRepo.findById(productId.intValue())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (quantity > product.getQuantity()) {
            throw new IllegalArgumentException("Requested quantity exceeds available stock.");
        }

        for (CartItem item : cart.getItems()) {
            if (item.getProduct().getId().equals(productId.intValue())) {
                item.setQuantity(quantity);
                cartItemRepository.save(item);
                return cartRepository.save(cart);
            }
        }

        throw new RuntimeException("Product not found in cart");
    }

    public Cart removeItem(Long userId, Long productId) {
        validateIdentifiers(userId, productId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        CartItem itemToRemove = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId.intValue()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Product not found in cart"));

        itemToRemove.setCart(null);
        cart.getItems().remove(itemToRemove);
        return cartRepository.save(cart);
    }

    public Cart clearCart(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required.");
        }

        Cart cart = getCartByUserId(userId);
        cart.getItems().forEach(item -> item.setCart(null));
        cart.getItems().clear();
        return cartRepository.save(cart);
    }

    private void validateIdentifiers(Long userId, Long productId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required.");
        }
        if (productId == null) {
            throw new IllegalArgumentException("Product id is required.");
        }
    }
}
