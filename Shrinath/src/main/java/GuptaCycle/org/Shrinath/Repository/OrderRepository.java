package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = "items")
    List<Order> findByUserIdOrderByOrderDateDesc(Long userId);

    @EntityGraph(attributePaths = "items")
    List<Order> findAllByOrderByOrderDateDesc();

    long countByStatusIgnoreCase(String status);

    long countByUserId(Long userId);

    List<Order> findByOrderDateAfterOrderByOrderDateAsc(LocalDateTime dateTime);

    /** Check if a user has a DELIVERED order containing the given productId — used for Verified Purchase badge */
    @Query("SELECT COUNT(o) > 0 FROM Order o JOIN o.items i " +
           "WHERE o.userId = :userId AND i.productId = :productId AND o.status = 'DELIVERED'")
    boolean existsByUserIdAndDeliveredProductId(@Param("userId") Long userId,
                                                @Param("productId") Long productId);
}
