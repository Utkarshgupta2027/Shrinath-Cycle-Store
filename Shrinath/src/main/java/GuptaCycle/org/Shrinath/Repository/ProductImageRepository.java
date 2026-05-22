package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    /** Returns all extra images for a product, ordered by displayOrder */
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Integer productId);

    /** Delete all extra images for a product (used when deleting product) */
    void deleteByProductId(Integer productId);
}
