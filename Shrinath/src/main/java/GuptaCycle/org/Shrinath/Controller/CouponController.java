package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.CouponDTO;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    // ─── Admin endpoints ──────────────────────────────────────────────────────

    @GetMapping("/admin/coupons")
    public ResponseEntity<?> getAllCoupons(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        ResponseEntity<?> auth = authorizeAdmin(authHeader);
        if (auth != null) return auth;
        return ResponseEntity.ok(couponService.getAllCoupons());
    }

    @PostMapping("/admin/coupons")
    public ResponseEntity<?> createCoupon(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @RequestBody CouponDTO dto) {
        ResponseEntity<?> auth = authorizeAdmin(authHeader);
        if (auth != null) return auth;
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(couponService.createCoupon(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/admin/coupons/{id}")
    public ResponseEntity<?> updateCoupon(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody CouponDTO dto) {
        ResponseEntity<?> auth = authorizeAdmin(authHeader);
        if (auth != null) return auth;
        try {
            return ResponseEntity.ok(couponService.updateCoupon(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/coupons/{id}")
    public ResponseEntity<?> deleteCoupon(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @PathVariable Long id) {
        ResponseEntity<?> auth = authorizeAdmin(authHeader);
        if (auth != null) return auth;
        try {
            couponService.deleteCoupon(id);
            return ResponseEntity.ok(Map.of("message", "Coupon deleted successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── User endpoint — validate coupon ─────────────────────────────────────

    /**
     * POST /api/coupon/validate
     * Body: { "code": "RIDE10", "userId": 5, "subtotal": 1500.00 }
     */
    @PostMapping("/coupon/validate")
    public ResponseEntity<?> validateCoupon(@RequestBody Map<String, Object> body) {
        try {
            String code = (String) body.get("code");
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            BigDecimal subtotal = body.get("subtotal") != null
                    ? new BigDecimal(body.get("subtotal").toString()) : BigDecimal.ZERO;

            CouponService.CouponValidationResult result = couponService.validateCoupon(code, userId, subtotal);

            return ResponseEntity.ok(Map.of(
                    "valid", result.valid(),
                    "discountAmount", result.discountAmount(),
                    "appliedCode", result.appliedCode(),
                    "message", result.message()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "discountAmount", 0,
                    "appliedCode", "",
                    "message", e.getMessage()
            ));
        }
    }

    // ─── Auth helper ──────────────────────────────────────────────────────────

    private ResponseEntity<?> authorizeAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin authorization is required.");
        }
        String token = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired token.");
        }
        String phoneNumber = jwtUtils.getUserNameFromJwtToken(token);
        if (!authService.isAdminPhoneNumber(phoneNumber)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the admin can manage coupons.");
        }
        return null;
    }
}
