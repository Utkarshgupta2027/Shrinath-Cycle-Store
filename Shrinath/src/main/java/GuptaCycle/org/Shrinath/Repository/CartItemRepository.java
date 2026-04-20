package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @Modifying
    @Transactional
    void deleteByProductId(Integer productId);
}
