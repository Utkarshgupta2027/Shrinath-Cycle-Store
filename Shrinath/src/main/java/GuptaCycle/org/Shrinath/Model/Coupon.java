package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    /** PERCENTAGE or FLAT */
    @Column(nullable = false)
    private String discountType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    /** Minimum cart subtotal required to use the coupon */
    @Column(precision = 10, scale = 2)
    private BigDecimal minOrderValue = BigDecimal.ZERO;

    /** null = unlimited */
    private Integer maxUsageLimit;

    private int currentUsageCount = 0;

    private LocalDate expiryDate;

    /** GENERAL, FIRST_ORDER, REFERRAL, FESTIVAL */
    @Column(nullable = false)
    private String couponType = "GENERAL";

    @Column(columnDefinition = "TEXT")
    private String description;

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

    /** userId of the user this coupon belongs to (used for REFERRAL / FIRST_ORDER) */
    private Long ownedByUserId;
}
