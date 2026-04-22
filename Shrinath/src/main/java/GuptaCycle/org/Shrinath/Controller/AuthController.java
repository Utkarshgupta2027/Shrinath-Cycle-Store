package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.PasswordChangeRequest;
import GuptaCycle.org.Shrinath.DTO.UserAccountResponse;
import GuptaCycle.org.Shrinath.DTO.UserProfileUpdateRequest;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            authService.registerUser(user);
            return ResponseEntity.ok(Map.of("message", "Registration successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String phoneNumber = loginRequest.get("phoneNumber");
        String password = loginRequest.get("password");

        if (phoneNumber == null || phoneNumber.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Phone number and password are required."));
        }

        User user = authService.authenticate(phoneNumber, password);

        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid phone number or password."));
        }

        String token = jwtUtils.generateToken(user.getPhoneNumber());
        String role = authService.getRoleForPhoneNumber(user.getPhoneNumber());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.getId(),
                "username", user.getName(),
                "phoneNo", user.getPhoneNumber(),
                "email", user.getEmail(),
                "role", role
        ));
    }

    @GetMapping("/admin/users")
    public ResponseEntity<?> getRegisteredUsers(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        ResponseEntity<?> authFailure = authorizeAdmin(authorizationHeader);
        if (authFailure != null) {
            return authFailure;
        }

        return ResponseEntity.ok(authService.getRegisteredUsers());
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        String phoneNumber = authorizeAuthenticatedUser(authorizationHeader);
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
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody UserProfileUpdateRequest request) {
        String currentPhoneNumber = authorizeAuthenticatedUser(authorizationHeader);
        if (currentPhoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }

        try {
            UserAccountResponse updatedUser = authService.updateAccount(currentPhoneNumber, request);
            String token = jwtUtils.generateToken(updatedUser.getPhoneNumber());

            return ResponseEntity.ok(Map.of(
                    "message", "Profile updated successfully.",
                    "token", token,
                    "user", updatedUser
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody PasswordChangeRequest request) {
        String phoneNumber = authorizeAuthenticatedUser(authorizationHeader);
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
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        String phoneNumber = authorizeAuthenticatedUser(authorizationHeader);
        if (phoneNumber == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication is required."));
        }

        try {
            authService.deleteAccount(phoneNumber);
            return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private ResponseEntity<?> authorizeAdmin(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Admin authorization is required."));
        }

        String token = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token."));
        }

        String phoneNumber = jwtUtils.getUserNameFromJwtToken(token);
        if (!authService.isAdminPhoneNumber(phoneNumber)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the admin can view registered users."));
        }

        return null;
    }

    private String authorizeAuthenticatedUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return null;
        }

        return jwtUtils.getUserNameFromJwtToken(token);
    }
}
