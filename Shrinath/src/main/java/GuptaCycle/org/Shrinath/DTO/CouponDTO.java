package GuptaCycle.org.Shrinath.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CouponDTO {
    private Long id;
    private String code;
    private String discountType;    // PERCENTAGE | FLAT
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private Integer maxUsageLimit;
    private int currentUsageCount;
    private LocalDate expiryDate;
    private String couponType;      // GENERAL | FIRST_ORDER | REFERRAL | FESTIVAL
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private Long ownedByUserId;
}
