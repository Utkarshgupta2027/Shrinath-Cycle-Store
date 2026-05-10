package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "return_exchange_requests")
public class ReturnExchangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private Long userId;
    private String requestType;
    private String reason;
    private String preferredResolution;
    private String status = "REQUESTED";
    private String adminNote;
    private LocalDateTime requestedAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
