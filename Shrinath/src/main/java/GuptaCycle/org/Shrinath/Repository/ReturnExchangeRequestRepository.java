package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.ReturnExchangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnExchangeRequestRepository extends JpaRepository<ReturnExchangeRequest, Long> {
    List<ReturnExchangeRequest> findByUserIdOrderByRequestedAtDesc(Long userId);

    List<ReturnExchangeRequest> findAllByOrderByRequestedAtDesc();
}
