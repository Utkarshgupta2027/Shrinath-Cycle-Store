package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserId(Long userId);

    long countByStatusIgnoreCase(String status);

    List<Order> findByOrderDateAfterOrderByOrderDateAsc(LocalDateTime dateTime);
}
