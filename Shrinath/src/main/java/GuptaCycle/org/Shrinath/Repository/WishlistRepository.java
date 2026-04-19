package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Wishlist;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    // This allows the service to find items by passing the User entity
    List<Wishlist> findByUser(User user);

    Optional<Wishlist> findByUserAndProduct(User user, Product product);

    @Modifying
    @Transactional
    void deleteByUserAndProduct(User user, Product product);
}