package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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

    List<Order> findByOrderDateAfterOrderByOrderDateAsc(LocalDateTime dateTime);
}
