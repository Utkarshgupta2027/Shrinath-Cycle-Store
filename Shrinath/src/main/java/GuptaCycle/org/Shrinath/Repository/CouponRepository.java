package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCodeIgnoreCase(String code);

    List<Coupon> findAllByActiveTrue();

    List<Coupon> findAllByOwnedByUserIdAndCouponType(Long userId, String couponType);

    boolean existsByCodeIgnoreCase(String code);

    @Modifying
    @Transactional
    void deleteByOwnedByUserId(Long userId);
}
