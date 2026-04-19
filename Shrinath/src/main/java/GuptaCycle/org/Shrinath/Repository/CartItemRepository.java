package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

}
