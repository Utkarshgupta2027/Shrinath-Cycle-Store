package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String name;
    private double price;
    private int quantity;

    /** Category stored so GST rate can be looked up per-item on invoice */
    private String category;
}
