package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "img_name")
    private String imgName;

    @Column(name = "img_type")
    private String imgType;

    /** Sort order — primary image = 0 */
    @Column(name = "display_order")
    private int displayOrder;

    @Lob
    @Column(name = "image_data", columnDefinition = "LONGBLOB")
    private byte[] imgData;
}
