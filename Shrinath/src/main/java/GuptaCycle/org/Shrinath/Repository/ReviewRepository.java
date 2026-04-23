package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductIdOrderByUpdatedAtDesc(Integer productId);

    Optional<Review> findByProductIdAndUserId(Integer productId, Long userId);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.product.id = :productId")
    Double findAverageRatingByProductId(@Param("productId") Integer productId);

    long countByProductId(Integer productId);

    @Modifying
    void deleteByProductId(Integer productId);
}
