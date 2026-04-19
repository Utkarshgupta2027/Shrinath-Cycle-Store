package GuptaCycle.org.Shrinath.DTO;

import java.math.BigDecimal;

public class WishlistProductDTO {

    private Long wishlistId;
    private Long productId;
    private String name;
    private BigDecimal price;
    private String imageUrl;

    public WishlistProductDTO(Long wishlistId,
                              Long productId,
                              String name,
                              BigDecimal price,
                              String imageUrl) {
        this.wishlistId = wishlistId;
        this.productId = productId;
        this.name = name;
        this.price = price;
        this.imageUrl = imageUrl;
    }

    public Long getWishlistId() { return wishlistId; }
    public Long getProductId() { return productId; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    public String getImageUrl() { return imageUrl; }
}
