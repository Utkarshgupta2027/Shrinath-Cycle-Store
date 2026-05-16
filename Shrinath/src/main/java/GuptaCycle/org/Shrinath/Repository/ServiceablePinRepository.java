package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.ServiceablePin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceablePinRepository extends JpaRepository<ServiceablePin, Long> {
    Optional<ServiceablePin> findByPincodeAndActiveTrue(String pincode);
    List<ServiceablePin> findAllByOrderByPincodeAsc();
    boolean existsByPincode(String pincode);
}
