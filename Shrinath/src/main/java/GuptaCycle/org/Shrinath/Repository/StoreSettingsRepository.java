package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.StoreSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StoreSettingsRepository extends JpaRepository<StoreSettings, Long> {
}
