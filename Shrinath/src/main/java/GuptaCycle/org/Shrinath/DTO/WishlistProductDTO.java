package GuptaCycle.org.Shrinath.DTO;

import java.math.BigDecimal;

public class WishlistProductDTO {

    private Long wishlistId;
    private Long productId;
    private String name;
    private BigDecimal price;
    private String imageUrl;
    private String brand;
    private String category;
    private boolean available;
    private int quantity;
    private double averageRating;
    private long reviewCount;

    public WishlistProductDTO(Long wishlistId,
                              Long productId,
                              String name,
                              BigDecimal price,
                              String imageUrl,
                              String brand,
                              String category,
                              boolean available,
                              int quantity,
                              double averageRating,
                              long reviewCount) {
        this.wishlistId = wishlistId;
        this.productId = productId;
        this.name = name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.brand = brand;
        this.category = category;
        this.available = available;
        this.quantity = quantity;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
    }

    public Long getWishlistId() { return wishlistId; }
    public Long getProductId() { return productId; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    public String getImageUrl() { return imageUrl; }
    public String getBrand() { return brand; }
    public String getCategory() { return category; }
    public boolean isAvailable() { return available; }
    public int getQuantity() { return quantity; }
    public double getAverageRating() { return averageRating; }
    public long getReviewCount() { return reviewCount; }
}
