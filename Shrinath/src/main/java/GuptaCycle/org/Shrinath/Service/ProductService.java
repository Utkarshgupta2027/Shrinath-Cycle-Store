package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.ProductResponse;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.ProductImage;
import GuptaCycle.org.Shrinath.Model.RestockSubscription;
import GuptaCycle.org.Shrinath.Repository.CartItemRepository;
import GuptaCycle.org.Shrinath.Repository.ProductImageRepository;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.RestockSubscriptionRepository;
import GuptaCycle.org.Shrinath.Repository.ReviewRepository;
import GuptaCycle.org.Shrinath.Repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class ProductService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    @Autowired
    private ProductRepo repo;

    @Autowired
    private CartItemRepository cartItemRepo;

    @Autowired
    private WishlistRepository wishlistRepo;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private RestockSubscriptionRepository restockSubscriptionRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private EmailService emailService;

    public List<ProductResponse> getAllProducts() {
        return repo.findAll()
                .stream()
                .map(this::toProductResponse)
                .toList();
    }

    /**
     * Feature 9 — backend-filtered product search with sort.
     *
     * @param keyword     search across name, brand, category, description
     * @param category    exact category filter (case-insensitive)
     * @param minPrice    minimum price (inclusive), null = no lower bound
     * @param maxPrice    maximum price (inclusive), null = no upper bound
     * @param inStockOnly only return available products with quantity > 0
     * @param sortBy      PRICE_ASC | PRICE_DESC | NEWEST | RATING | POPULARITY
     */
    public List<ProductResponse> getFilteredProducts(
            String keyword,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            boolean inStockOnly,
            String sortBy) {

        List<Product> products = repo.findFiltered(
                blankToNull(keyword),
                blankToNull(category),
                blankToNull(brand),
                minPrice,
                maxPrice,
                inStockOnly
        );

        List<ProductResponse> responses = products.stream()
                .map(this::toProductResponse)
                .toList();

        return sort(responses, sortBy);
    }

    public List<ProductResponse> getLowStockProducts() {
        return repo.findLowStockProducts(LOW_STOCK_THRESHOLD)
                .stream()
                .map(this::toProductResponse)
                .toList();
    }

    public Product getProductById(int id) {
        return repo.findById(id).orElse(null);
    }

    public ProductResponse getProductResponseById(int id) {
        Product product = getProductById(id);
        return product == null ? null : toProductResponse(product);
    }

    public Product addProduct(Product product, MultipartFile imgFile, List<MultipartFile> extraImages) throws IOException {
        if (product.getQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative.");
        }

        product.setImgName(imgFile.getOriginalFilename());
        product.setImgType(imgFile.getContentType());
        product.setImgData(imgFile.getBytes());
        Product saved = repo.save(product);

        // Save any additional gallery images
        if (extraImages != null) {
            saveExtraImages(saved.getId(), extraImages);
        }

        return saved;
    }

    public Product updateProduct(int id, Product newProduct, MultipartFile imgFile,
                                 List<MultipartFile> extraImages, boolean replaceExtra) throws IOException {
        Optional<Product> optional = repo.findById(id);

        if (optional.isEmpty()) return null;

        Product existing = optional.get();

        if (newProduct.getQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative.");
        }

        boolean wasOutOfStock = !existing.isAvailable() || existing.getQuantity() <= 0;
        boolean willBeInStock = newProduct.isAvailable() && newProduct.getQuantity() > 0;

        // Update all fields
        existing.setName(newProduct.getName());
        existing.setDesc(newProduct.getDesc());
        existing.setBrand(newProduct.getBrand());
        existing.setPrice(newProduct.getPrice());
        existing.setCategory(newProduct.getCategory());
        existing.setReleaseDate(newProduct.getReleaseDate());
        existing.setAvailable(newProduct.isAvailable());
        existing.setQuantity(newProduct.getQuantity());

        // Update primary image if provided
        if (imgFile != null && !imgFile.isEmpty()) {
            existing.setImgName(imgFile.getOriginalFilename());
            existing.setImgType(imgFile.getContentType());
            existing.setImgData(imgFile.getBytes());
        }

        Product saved = repo.save(existing);

        // Replace or append extra gallery images
        if (replaceExtra) {
            productImageRepository.deleteByProductId(id);
        }
        if (extraImages != null && !extraImages.isEmpty()) {
            int startOrder = replaceExtra ? 0
                    : productImageRepository.findByProductIdOrderByDisplayOrderAsc(id).size();
            saveExtraImages(saved.getId(), extraImages, startOrder);
        }

        // Feature 11 — notify subscribers when product comes back in stock
        if (wasOutOfStock && willBeInStock) {
            notifyRestockSubscribers(saved);
        }

        return saved;
    }

    @Transactional
    public void deleteProduct(int id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Product not found with ID " + id);
        }

        // Remove foreign key dependencies first
        cartItemRepo.deleteByProductId(id);
        wishlistRepo.deleteByProductId(id);
        reviewRepository.deleteByProductId(id);
        productImageRepository.deleteByProductId(id);  // extra gallery images

        repo.deleteById(id);
    }

    // ─── Feature 11 helpers ───────────────────────────────────────────────────

    /**
     * Send restock notifications to all subscribed emails and mark them notified.
     */
    @Transactional
    public void notifyRestockSubscribers(Product product) {
        List<RestockSubscription> subs = restockSubscriptionRepository
                .findByProductIdAndNotifiedFalse(product.getId());

        for (RestockSubscription sub : subs) {
            try {
                emailService.sendRestockNotification(sub.getUserEmail(), product);
                sub.setNotified(true);
                restockSubscriptionRepository.save(sub);
            } catch (Exception e) {
                System.err.println("Failed to send restock notification to " + sub.getUserEmail() + ": " + e.getMessage());
            }
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private List<ProductResponse> sort(List<ProductResponse> list, String sortBy) {
        if (sortBy == null || sortBy.isBlank()) return list;
        return switch (sortBy.toUpperCase()) {
            case "PRICE_ASC"    -> list.stream().sorted(Comparator.comparing(p -> p.getPrice() == null ? BigDecimal.ZERO : p.getPrice())).toList();
            case "PRICE_DESC"   -> list.stream().sorted(Comparator.comparing((ProductResponse p) -> p.getPrice() == null ? BigDecimal.ZERO : p.getPrice()).reversed()).toList();
            case "NEWEST"       -> list.stream().sorted(Comparator.comparing((ProductResponse p) -> p.getReleaseDate() == null ? new java.util.Date(0) : p.getReleaseDate()).reversed()).toList();
            case "RATING"       -> list.stream().sorted(Comparator.comparingDouble(ProductResponse::getAverageRating).reversed()).toList();
            case "POPULARITY"   -> list.stream().sorted(Comparator.comparingLong(ProductResponse::getReviewCount).reversed()).toList();
            default             -> list;
        };
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private ProductResponse toProductResponse(Product product) {
        Double averageRating = reviewRepository.findAverageRatingByProductId(product.getId());
        long reviewCount = reviewRepository.countByProductId(product.getId());
        List<Long> extraIds = productImageRepository
                .findByProductIdOrderByDisplayOrderAsc(product.getId())
                .stream().map(pi -> pi.getId()).collect(Collectors.toList());

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDesc(),
                product.getBrand(),
                product.getPrice(),
                product.getCategory(),
                product.getReleaseDate(),
                product.isAvailable(),
                product.getQuantity(),
                product.getImgName(),
                product.getImgType(),
                averageRating == null ? 0 : Math.round(averageRating * 10.0) / 10.0,
                reviewCount,
                extraIds
        );
    }

    // ─── Helper: persist extra gallery images ─────────────────────────────────

    private void saveExtraImages(Integer productId, List<MultipartFile> files) throws IOException {
        saveExtraImages(productId, files, 0);
    }

    private void saveExtraImages(Integer productId, List<MultipartFile> files, int startOrder) throws IOException {
        for (int i = 0; i < files.size(); i++) {
            MultipartFile f = files.get(i);
            if (f == null || f.isEmpty()) continue;
            ProductImage pi = new ProductImage();
            pi.setProductId(productId);
            pi.setImgName(f.getOriginalFilename());
            pi.setImgType(f.getContentType());
            pi.setDisplayOrder(startOrder + i);
            pi.setImgData(f.getBytes());
            productImageRepository.save(pi);
        }
    }
}
