package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private Long userId;
    private String gateway;
    private String gatewayOrderId;
    private String paymentId;
    private double amount;
    private String currency = "INR";
    private String status = "CREATED";
    private boolean signatureVerified;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime verifiedAt;
}
