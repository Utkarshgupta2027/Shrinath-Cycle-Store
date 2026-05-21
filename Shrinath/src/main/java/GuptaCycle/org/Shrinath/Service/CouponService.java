package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.CouponDTO;
import GuptaCycle.org.Shrinath.Model.Coupon;
import GuptaCycle.org.Shrinath.Repository.CouponRepository;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CouponService {

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private OrderRepository orderRepository;

    // ─── Public / user-facing ─────────────────────────────────────────────────

    /**
     * Validate a coupon and compute discount — does NOT increment usage yet.
     * Usage is incremented when the order is actually saved.
     */
    public CouponValidationResult validateCoupon(String code, Long userId, BigDecimal subtotal) {
        if (code == null || code.isBlank()) {
            return CouponValidationResult.none();
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new IllegalArgumentException("Coupon code not found."));

        if (!coupon.isActive()) {
            return CouponValidationResult.error("This coupon is no longer active.");
        }

        if (coupon.getExpiryDate() != null && coupon.getExpiryDate().isBefore(LocalDate.now())) {
            return CouponValidationResult.error("This coupon has expired.");
        }

        if (coupon.getMaxUsageLimit() != null && coupon.getCurrentUsageCount() >= coupon.getMaxUsageLimit()) {
            return CouponValidationResult.error("This coupon has reached its maximum usage limit.");
        }

        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return CouponValidationResult.error(
                    "Minimum order value of ₹" + coupon.getMinOrderValue().toPlainString() + " required.");
        }

        // FIRST_ORDER check
        if ("FIRST_ORDER".equals(coupon.getCouponType()) && userId != null) {
            long previousOrders = orderRepository.countByUserId(userId);
            if (previousOrders > 0) {
                return CouponValidationResult.error("This coupon is valid only for first-time orders.");
            }
        }

        // REFERRAL check — only usable by the owner
        if ("REFERRAL".equals(coupon.getCouponType())) {
            if (coupon.getOwnedByUserId() == null || !coupon.getOwnedByUserId().equals(userId)) {
                return CouponValidationResult.error("This referral coupon does not belong to you.");
            }
        }

        BigDecimal discount = computeDiscount(coupon, subtotal);
        return new CouponValidationResult(true, true, discount, coupon.getCode(),
                buildSuccessMessage(coupon, discount));
    }

    /** Increment usage count — called after order is confirmed. */
    @Transactional
    public void incrementUsage(String code) {
        if (code == null || code.isBlank()) return;
        couponRepository.findByCodeIgnoreCase(code.trim()).ifPresent(coupon -> {
            coupon.setCurrentUsageCount(coupon.getCurrentUsageCount() + 1);
            couponRepository.save(coupon);
        });
    }

    // ─── Admin CRUD ───────────────────────────────────────────────────────────

    public List<CouponDTO> getAllCoupons() {
        return couponRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CouponDTO getCouponById(Long id) {
        return toDTO(couponRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found.")));
    }

    @Transactional
    public CouponDTO createCoupon(CouponDTO dto) {
        validateCouponDTO(dto);
        if (couponRepository.existsByCodeIgnoreCase(dto.getCode())) {
            throw new IllegalArgumentException("Coupon code '" + dto.getCode() + "' already exists.");
        }
        Coupon coupon = fromDTO(dto);
        coupon.setCreatedAt(LocalDateTime.now());
        return toDTO(couponRepository.save(coupon));
    }

    @Transactional
    public CouponDTO updateCoupon(Long id, CouponDTO dto) {
        validateCouponDTO(dto);
        Coupon existing = couponRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found."));

        // If code changed, check uniqueness
        if (!existing.getCode().equalsIgnoreCase(dto.getCode())
                && couponRepository.existsByCodeIgnoreCase(dto.getCode())) {
            throw new IllegalArgumentException("Coupon code '" + dto.getCode() + "' already exists.");
        }

        existing.setCode(dto.getCode().trim().toUpperCase());
        existing.setDiscountType(dto.getDiscountType());
        existing.setDiscountValue(dto.getDiscountValue());
        existing.setMinOrderValue(dto.getMinOrderValue() != null ? dto.getMinOrderValue() : BigDecimal.ZERO);
        existing.setMaxUsageLimit(dto.getMaxUsageLimit());
        existing.setExpiryDate(dto.getExpiryDate());
        existing.setCouponType(dto.getCouponType() != null ? dto.getCouponType() : "GENERAL");
        existing.setDescription(dto.getDescription());
        existing.setActive(dto.isActive());
        existing.setOwnedByUserId(dto.getOwnedByUserId());
        return toDTO(couponRepository.save(existing));
    }

    @Transactional
    public void deleteCoupon(Long id) {
        if (!couponRepository.existsById(id)) {
            throw new IllegalArgumentException("Coupon not found.");
        }
        couponRepository.deleteById(id);
    }

    // ─── Referral coupon generation ───────────────────────────────────────────

    /**
     * Auto-generates a unique referral coupon for a newly registered user.
     * Code format: REF-{userId}-{random4}
     */
    @Transactional
    public Coupon generateReferralCoupon(Long userId) {
        String code = "REF-" + userId + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(BigDecimal.valueOf(10));       // 10% off
        coupon.setMinOrderValue(BigDecimal.valueOf(500));      // min ₹500
        coupon.setMaxUsageLimit(1);
        coupon.setExpiryDate(LocalDate.now().plusYears(1));
        coupon.setCouponType("REFERRAL");
        coupon.setDescription("Your personal referral code — share it with friends!");
        coupon.setActive(true);
        coupon.setOwnedByUserId(userId);
        coupon.setCreatedAt(LocalDateTime.now());
        return couponRepository.save(coupon);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private BigDecimal computeDiscount(Coupon coupon, BigDecimal subtotal) {
        if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            return subtotal.multiply(coupon.getDiscountValue().divide(BigDecimal.valueOf(100)))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        // FLAT discount — cap at subtotal
        return coupon.getDiscountValue().min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }

    private String buildSuccessMessage(Coupon coupon, BigDecimal discount) {
        if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            return coupon.getCode() + " applied! " + coupon.getDiscountValue().toPlainString()
                    + "% off — you save ₹" + discount.toPlainString() + ".";
        }
        return coupon.getCode() + " applied! Flat ₹" + discount.toPlainString() + " off.";
    }

    private void validateCouponDTO(CouponDTO dto) {
        if (dto.getCode() == null || dto.getCode().isBlank())
            throw new IllegalArgumentException("Coupon code is required.");
        if (dto.getDiscountType() == null || (!dto.getDiscountType().equals("PERCENTAGE") && !dto.getDiscountType().equals("FLAT")))
            throw new IllegalArgumentException("discountType must be PERCENTAGE or FLAT.");
        if (dto.getDiscountValue() == null || dto.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("discountValue must be positive.");
        if ("PERCENTAGE".equals(dto.getDiscountType()) && dto.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0)
            throw new IllegalArgumentException("Percentage discount cannot exceed 100%.");
    }

    private CouponDTO toDTO(Coupon coupon) {
        return new CouponDTO(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinOrderValue(),
                coupon.getMaxUsageLimit(),
                coupon.getCurrentUsageCount(),
                coupon.getExpiryDate(),
                coupon.getCouponType(),
                coupon.getDescription(),
                coupon.isActive(),
                coupon.getCreatedAt(),
                coupon.getOwnedByUserId()
        );
    }

    private Coupon fromDTO(CouponDTO dto) {
        Coupon coupon = new Coupon();
        coupon.setCode(dto.getCode().trim().toUpperCase());
        coupon.setDiscountType(dto.getDiscountType());
        coupon.setDiscountValue(dto.getDiscountValue());
        coupon.setMinOrderValue(dto.getMinOrderValue() != null ? dto.getMinOrderValue() : BigDecimal.ZERO);
        coupon.setMaxUsageLimit(dto.getMaxUsageLimit());
        coupon.setExpiryDate(dto.getExpiryDate());
        coupon.setCouponType(dto.getCouponType() != null ? dto.getCouponType() : "GENERAL");
        coupon.setDescription(dto.getDescription());
        coupon.setActive(dto.isActive());
        coupon.setOwnedByUserId(dto.getOwnedByUserId());
        return coupon;
    }

    // ─── Result record ────────────────────────────────────────────────────────

    public record CouponValidationResult(
            boolean checked,
            boolean valid,
            BigDecimal discountAmount,
            String appliedCode,
            String message
    ) {
        public static CouponValidationResult none() {
            return new CouponValidationResult(false, false, BigDecimal.ZERO, "", "No coupon applied.");
        }

        public static CouponValidationResult error(String msg) {
            return new CouponValidationResult(true, false, BigDecimal.ZERO, "", msg);
        }
    }
}
