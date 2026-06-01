package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // ── Public (APPROVED only) ─────────────────────────────────────────────────

    List<Review> findByProductIdAndStatusOrderByUpdatedAtDesc(Integer productId, String status);

    List<Review> findByProductIdAndStatusOrderByHelpfulVotesDesc(Integer productId, String status);

    /** Average rating across APPROVED reviews only */
    @Query("select coalesce(avg(r.rating), 0) from Review r where r.product.id = :productId and r.status = 'APPROVED'")
    Double findAverageRatingByProductId(@Param("productId") Integer productId);

    /** Count APPROVED reviews only */
    long countByProductIdAndStatus(Integer productId, String status);

    // Convenience for existing code
    default long countByProductId(Integer productId) {
        return countByProductIdAndStatus(productId, "APPROVED");
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    List<Review> findByStatusOrderByCreatedAtAsc(String status);

    Optional<Review> findByProductIdAndUserId(Integer productId, Long userId);

    // ── Cleanup ───────────────────────────────────────────────────────────────

    @Modifying
    void deleteByProductId(Integer productId);

    // ── Bulk stats for N+1 elimination ────────────────────────────────────────

    /**
     * Fetches average rating and review count for all given product IDs in a
     * single aggregated query. Each element in the returned list is an
     * Object[] { productId (Integer), avgRating (Double), reviewCount (Long) }.
     */
    @Query("select r.product.id, coalesce(avg(r.rating), 0.0), count(r) " +
           "from Review r " +
           "where r.product.id in :productIds and r.status = 'APPROVED' " +
           "group by r.product.id")
    List<Object[]> findRatingStatsByProductIds(@Param("productIds") List<Integer> productIds);
}
