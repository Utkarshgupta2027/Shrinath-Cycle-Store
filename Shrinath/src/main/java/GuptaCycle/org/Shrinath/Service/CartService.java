package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.CartSummaryResponse;
import GuptaCycle.org.Shrinath.Model.Cart;
import GuptaCycle.org.Shrinath.Model.CartItem;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.UserAddress;
import GuptaCycle.org.Shrinath.Repository.CartItemRepository;
import GuptaCycle.org.Shrinath.Repository.CartRepository;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.UserAddressRepository;
import GuptaCycle.org.Shrinath.Service.CouponService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CartService {

    private static final BigDecimal FREE_DELIVERY_THRESHOLD = BigDecimal.valueOf(2000);
    private static final BigDecimal DELIVERY_CHARGE = BigDecimal.ZERO;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductRepo productRepo;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private CouponService couponService;

    @Autowired
    private UserAddressRepository userAddressRepository;

    @Autowired
    private ShippingService shippingService;

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

        cart.setUpdatedAt(java.time.LocalDateTime.now());
        cart.setEmailSent(false);
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
                cart.setUpdatedAt(java.time.LocalDateTime.now());
                cart.setEmailSent(false);
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
        cart.setUpdatedAt(java.time.LocalDateTime.now());
        cart.setEmailSent(false);
        return cartRepository.save(cart);
    }

    public Cart clearCart(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required.");
        }

        Cart cart = getCartByUserId(userId);
        cart.getItems().forEach(item -> item.setCart(null));
        cart.getItems().clear();
        cart.setUpdatedAt(java.time.LocalDateTime.now());
        cart.setEmailSent(false);
        return cartRepository.save(cart);
    }

    public Cart moveItemToWishlist(Long userId, Long productId) {
        validateIdentifiers(userId, productId);
        wishlistService.addToWishlist(userId, productId);
        return removeItem(userId, productId);
    }

    public CartSummaryResponse getCartSummary(Long userId, String couponCode) {
        if (userId == null) {
            throw new IllegalArgumentException("User id is required.");
        }

        Cart cart = getCartByUserId(userId);
        BigDecimal subtotal = cart.getItems().stream()
                .map(this::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        CouponService.CouponValidationResult coupon = couponService.validateCoupon(couponCode, userId, subtotal);
        BigDecimal deliveryCharges = DELIVERY_CHARGE;
        
        if (subtotal.compareTo(BigDecimal.ZERO) == 0) {
            deliveryCharges = BigDecimal.ZERO;
        } else {
            String pincode = null;
            Optional<UserAddress> defaultAddressOpt = userAddressRepository.findByUserIdAndIsDefaultTrue(userId);
            if (defaultAddressOpt.isPresent()) {
                pincode = defaultAddressOpt.get().getPincode();
            } else {
                List<UserAddress> addresses = userAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
                if (!addresses.isEmpty()) {
                    pincode = addresses.get(0).getPincode();
                }
            }

            if (pincode != null) {
                double charge = shippingService.calculateShippingCharge(pincode, 1.0);
                if (charge >= 0) {
                    deliveryCharges = BigDecimal.valueOf(charge);
                }
            }
        }

        BigDecimal finalTotal = subtotal
                .subtract(coupon.discountAmount())
                .add(deliveryCharges)
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        return new CartSummaryResponse(
                subtotal,
                coupon.discountAmount().setScale(2, RoundingMode.HALF_UP),
                deliveryCharges.setScale(2, RoundingMode.HALF_UP),
                finalTotal,
                coupon.appliedCode(),
                coupon.message()
        );
    }

    private BigDecimal getLineTotal(CartItem item) {
        BigDecimal price = item.getProduct().getPrice() == null ? BigDecimal.ZERO : item.getProduct().getPrice();
        return price.multiply(BigDecimal.valueOf(item.getQuantity()));
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
