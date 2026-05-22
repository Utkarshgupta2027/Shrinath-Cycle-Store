package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /** Top-level categories (no parent) */
    List<Category> findByParentCategoryIsNullOrderByDisplayOrderAsc();

    /** Featured categories for homepage */
    List<Category> findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc();

    /** All active categories */
    List<Category> findByActiveTrueOrderByDisplayOrderAsc();
}
