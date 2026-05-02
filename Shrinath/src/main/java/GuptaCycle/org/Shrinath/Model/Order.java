package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private double totalAmount;
    private double subtotal;
    private double discountAmount;
    private double deliveryCharges;
    private String couponCode;
    private String deliveryOption;
    private String paymentMethod;
    private String paymentStatus = "PENDING";
    private String paymentGatewayOrderId;
    private String paymentId;
    private boolean signatureVerified;
    private LocalDateTime paidAt;

    @Column(columnDefinition = "TEXT")
    private String address;

    private LocalDateTime orderDate = LocalDateTime.now();

    private String status = "PLACED";

    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "order_id")
    private List<OrderItem> items;
}
