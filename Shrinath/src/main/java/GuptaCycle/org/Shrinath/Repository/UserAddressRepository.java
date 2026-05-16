package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {
    List<UserAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    Optional<UserAddress> findByUserIdAndIsDefaultTrue(Long userId);
    long countByUserId(Long userId);
}
