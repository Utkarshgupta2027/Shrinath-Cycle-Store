package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUserId(Long id);
}

