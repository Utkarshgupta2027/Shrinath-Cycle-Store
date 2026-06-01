package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    /** Returns all extra images for a product, ordered by displayOrder */
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Integer productId);

    /** Delete all extra images for a product (used when deleting product) */
    void deleteByProductId(Integer productId);

    // ── Bulk fetch for N+1 elimination ────────────────────────────────────────

    /**
     * Fetches extra gallery image IDs for all given product IDs in a single query.
     * Each element is Object[] { productId (Integer), imageId (Long) }.
     * Results are ordered by productId then displayOrder so they can be grouped.
     */
    @Query("select pi.productId, pi.id from ProductImage pi " +
           "where pi.productId in :productIds " +
           "order by pi.productId asc, pi.displayOrder asc")
    List<Object[]> findImageIdsByProductIds(@Param("productIds") List<Integer> productIds);
}

