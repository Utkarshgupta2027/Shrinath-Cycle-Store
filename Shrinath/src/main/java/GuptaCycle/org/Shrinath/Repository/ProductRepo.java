package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepo extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    @Query("SELECT p FROM Product p WHERE " +
            "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.desc) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> searchProduct(String keyword);

    List<Product> findByIdIn(List<Long> productIds);

    @Query("SELECT p FROM Product p WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            "  LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(p.category) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "  LOWER(p.desc) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "(:category IS NULL OR :category = '' OR LOWER(p.category) = LOWER(:category)) AND " +
            "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
            "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
            "(:inStockOnly = false OR (p.available = true AND p.quantity > 0))")
    List<Product> findFiltered(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("inStockOnly") boolean inStockOnly
    );

    @Query("SELECT p FROM Product p WHERE p.available = true AND p.quantity > 0 AND p.quantity < :threshold")
    List<Product> findLowStockProducts(@Param("threshold") int threshold);
}
