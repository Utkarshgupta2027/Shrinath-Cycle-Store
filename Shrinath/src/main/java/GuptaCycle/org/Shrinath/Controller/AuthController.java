package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
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
        String identifier = loginRequest.get("phoneNumber");
        String password = loginRequest.get("password");

        if (identifier == null || identifier.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Phone number and password are required."));
        }

        User user = authService.authenticate(identifier, password);

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
}
