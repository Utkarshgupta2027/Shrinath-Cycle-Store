package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.RestockSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RestockSubscriptionRepository extends JpaRepository<RestockSubscription, Long> {

    List<RestockSubscription> findByProductIdAndNotifiedFalse(Integer productId);

    boolean existsByProductIdAndUserEmail(Integer productId, String userEmail);
}
