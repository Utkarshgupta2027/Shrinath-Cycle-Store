package GuptaCycle.org.Shrinath.Model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Date;

@Entity
@Table(name = "products")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(name = "description")
    private String desc;

    private String brand;

    private BigDecimal price;

    private String category;

    // 🔥 PUT IT HERE (above releaseDate field)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy")
    private Date releaseDate;

    private boolean available;

    private int quantity;

    private String imgName;
    private String imgType;

    @Lob
    @Column(name = "image_data", columnDefinition = "LONGBLOB")
    private byte[] imgData;
}