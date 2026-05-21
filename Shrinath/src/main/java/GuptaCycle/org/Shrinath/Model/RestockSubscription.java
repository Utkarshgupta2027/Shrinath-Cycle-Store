package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "restock_subscriptions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "user_email"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestockSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    /** Linked user ID — null for guest subscriptions */
    private Long userId;

    private LocalDateTime subscribedAt = LocalDateTime.now();

    private boolean notified = false;
}
