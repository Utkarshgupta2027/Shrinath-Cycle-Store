package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.PasswordChangeRequest;
import GuptaCycle.org.Shrinath.DTO.UserAccountResponse;
import GuptaCycle.org.Shrinath.DTO.UserProfileUpdateRequest;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Security.RefreshTokenStore;
import GuptaCycle.org.Shrinath.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenStore refreshTokenStore;

    // ─── Register ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            authService.registerUser(user);
            return ResponseEntity.ok(Map.of("message", "Registration successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    /**
     * Returns both an access token (24 h) and a refresh token (7 d).
     */
    @PostMapping({"/login", "/signin"})
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String phoneNumber = loginRequest.get("phoneNumber");
        String identifier  = isBlank(phoneNumber) ? loginRequest.get("email") : phoneNumber;
        String password    = loginRequest.get("password");

        if (isBlank(identifier) || isBlank(password)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Phone number/email and password are required."));
        }

        User user = authService.authenticate(identifier, password);
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid phone number/email or password."));
        }

        String accessToken  = jwtUtils.generateToken(user.getPhoneNumber());
        String refreshToken = jwtUtils.generateRefreshToken(user.getPhoneNumber());
        String role         = authService.getRoleForPhoneNumber(user.getPhoneNumber());

        // Store refresh token server-side (invalidated on logout)
        refreshTokenStore.save(user.getPhoneNumber(), refreshToken);

        return ResponseEntity.ok(Map.of(
                "token",        accessToken,
                "refreshToken", refreshToken,
                "userId",       user.getId(),
                "username",     user.getName(),
                "phoneNo",      user.getPhoneNumber(),
                "email",        user.getEmail(),
                "role",         role
        ));
    }

    // ─── Refresh Token ────────────────────────────────────────────────────────

    /**
     * Exchange a valid refresh token for a new access token.
     * The refresh token itself is NOT rotated here (keep it simple);
     * upgrade to rotation if needed.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");

        if (isBlank(refreshToken)) {
            return ResponseEntity.badRequest().body(Map.of("message", "refreshToken is required."));
        }

        // 1. JWT signature + expiry check
        if (!jwtUtils.validateJwtToken(refreshToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Refresh token is invalid or expired. Please log in again."));
        }

        // 2. Token type check — must be REFRESH, not ACCESS
        if (!jwtUtils.isRefreshToken(refreshToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Provided token is not a refresh token."));
        }

        String phoneNumber = jwtUtils.getUserNameFromJwtToken(refreshToken);

        // 3. Server-side store check (logout invalidates it)
        if (!refreshTokenStore.isValid(phoneNumber, refreshToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Refresh token has been revoked. Please log in again."));
        }

        // Issue a new access token
        String newAccessToken = jwtUtils.generateToken(phoneNumber);
        return ResponseEntity.ok(Map.of("token", newAccessToken));
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    /**
     * Invalidate the refresh token server-side.
     * The access token expires naturally (stateless); clients should drop it.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> body) {
        if (body != null && !isBlank(body.get("refreshToken"))) {
            String refreshToken = body.get("refreshToken");
            if (jwtUtils.validateJwtToken(refreshToken)) {
                String phoneNumber = jwtUtils.getUserNameFromJwtToken(refreshToken);
                refreshTokenStore.invalidate(phoneNumber);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    // ─── Profile / Account ────────────────────────────────────────────────────

    @GetMapping("/admin/users")
    public ResponseEntity<?> getRegisteredUsers() {
        // Spring Security's hasRole("ADMIN") already enforces access in SecurityConfig.
        // No manual token re-validation needed.
        return ResponseEntity.ok(authService.getRegisteredUsers());
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        String phoneNumber = extractPhoneFromHeader(authHeader);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }
        try {
            return ResponseEntity.ok(authService.getAccountSummary(phoneNumber));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me/profile")
    public ResponseEntity<?> updateCurrentUserProfile(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @RequestBody UserProfileUpdateRequest request) {
        String phoneNumber = extractPhoneFromHeader(authHeader);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }
        try {
            UserAccountResponse updated = authService.updateAccount(phoneNumber, request);
            // Re-issue access token if phone changed
            String newToken = jwtUtils.generateToken(updated.getPhoneNumber());
            return ResponseEntity.ok(Map.of(
                    "message", "Profile updated successfully.",
                    "token",   newToken,
                    "user",    updated
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @RequestBody PasswordChangeRequest request) {
        String phoneNumber = extractPhoneFromHeader(authHeader);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }
        try {
            authService.changePassword(phoneNumber, request);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteCurrentUser(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        String phoneNumber = extractPhoneFromHeader(authHeader);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }
        try {
            authService.deleteAccount(phoneNumber);
            refreshTokenStore.invalidate(phoneNumber); // Clean up refresh token too
            return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    // ─── Password Reset (OTP) ─────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (isBlank(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        try {
            authService.generatePasswordResetOtp(email);
            return ResponseEntity.ok(Map.of("message", "OTP sent to your email."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email       = request.get("email");
        String otp         = request.get("otp");
        String newPassword = request.get("newPassword");

        if (isBlank(email) || isBlank(otp) || isBlank(newPassword)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email, OTP, and new password are required."));
        }
        try {
            authService.resetPasswordWithOtp(email, otp, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password reset successful."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Extract and validate a phone number from a Bearer authorization header.
     * Returns null if the header is missing, malformed, or token is invalid.
     */
    private String extractPhoneFromHeader(String authHeader) {
        if (isBlank(authHeader) || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) return null;
        return jwtUtils.getUserNameFromJwtToken(token);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
