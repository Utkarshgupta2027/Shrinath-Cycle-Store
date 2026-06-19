package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.ServiceablePin;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.ShippingService;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    @Autowired
    private ShippingService shippingService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    // ─── Public Endpoints ─────────────────────────────────────────────────────

    @GetMapping("/check-pincode")
    public ResponseEntity<?> checkPincode(@RequestParam String pincode) {
        boolean serviceable = shippingService.isServiceable(pincode);
        ServiceablePin details = shippingService.getPinDetails(pincode);

        if (serviceable && details != null) {
            return ResponseEntity.ok(Map.of(
                    "serviceable", true,
                    "pincode", pincode,
                    "city", details.getCity() != null ? details.getCity() : "",
                    "state", details.getState() != null ? details.getState() : "",
                    "baseCharge", details.getBaseCharge(),
                    "perKgCharge", details.getPerKgCharge()
            ));
        }
        return ResponseEntity.ok(Map.of("serviceable", false, "pincode", pincode));
    }

    @GetMapping("/shipping-charge")
    public ResponseEntity<?> getShippingCharge(
            @RequestParam String pincode,
            @RequestParam(defaultValue = "standard") String deliveryOption,
            @RequestParam(defaultValue = "1.0") double weight) {
        double charge = shippingService.calculateShippingCharge(pincode, deliveryOption);
        if (charge < 0) {
            return ResponseEntity.ok(Map.of(
                    "serviceable", false,
                    "pincode", pincode,
                    "charge", 0
            ));
        }
        return ResponseEntity.ok(Map.of(
                "serviceable", true,
                "pincode", pincode,
                "deliveryOption", deliveryOption,
                "charge", charge
        ));
    }

    // ─── Admin: Serviceable PIN Management ────────────────────────────────────

    @GetMapping("/admin/pins")
    public ResponseEntity<?> getAllPins(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        return ResponseEntity.ok(shippingService.getAllServiceablePins());
    }

    @PostMapping("/admin/pins")
    public ResponseEntity<?> addPin(
            @RequestBody ServiceablePin pin,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(shippingService.addServiceablePin(pin));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/admin/pins/{id}")
    public ResponseEntity<?> updatePin(
            @PathVariable Long id,
            @RequestBody ServiceablePin pin,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        try {
            return ResponseEntity.ok(shippingService.updateServiceablePin(id, pin));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/admin/pins/{id}")
    public ResponseEntity<?> deletePin(
            @PathVariable Long id,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        try {
            shippingService.deleteServiceablePin(id);
            return ResponseEntity.ok("PIN deleted.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/admin/pins/{id}/toggle")
    public ResponseEntity<?> togglePin(
            @PathVariable Long id,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        try {
            return ResponseEntity.ok(shippingService.togglePinActive(id));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    // ─── Admin: Generate AWB for Order ────────────────────────────────────────

    @PostMapping("/admin/awb/{orderId}")
    public ResponseEntity<?> generateAwb(
            @PathVariable Long orderId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authFailure = authorizeAdmin(auth);
        if (authFailure != null) return authFailure;
        Map<String, String> awbData = shippingService.generateAWB(orderId);
        return ResponseEntity.ok(awbData);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

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
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the admin can manage shipping settings.");
        }
        return null;
    }
}
