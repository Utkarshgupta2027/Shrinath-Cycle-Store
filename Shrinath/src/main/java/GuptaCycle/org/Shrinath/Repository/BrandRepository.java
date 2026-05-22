package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    List<Brand> findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc();

    List<Brand> findByActiveTrueOrderByNameAsc();
}
