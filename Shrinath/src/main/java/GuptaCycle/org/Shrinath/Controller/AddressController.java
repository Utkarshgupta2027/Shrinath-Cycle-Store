package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.UserAddress;
import GuptaCycle.org.Shrinath.Service.AddressService;
import GuptaCycle.org.Shrinath.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    @Autowired
    private AddressService addressService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<?> getAddresses() {
        try {
            Long userId = currentUserId();
            List<UserAddress> addresses = addressService.getAddressesByUser(userId);
            return ResponseEntity.ok(addresses);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> saveAddress(@RequestBody UserAddress address) {
        try {
            Long userId = currentUserId();
            UserAddress saved = addressService.saveAddress(userId, address);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAddress(@PathVariable Long id, @RequestBody UserAddress address) {
        try {
            Long userId = currentUserId();
            UserAddress updated = addressService.updateAddress(userId, id, address);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id) {
        try {
            Long userId = currentUserId();
            addressService.deleteAddress(userId, id);
            return ResponseEntity.ok("Address deleted.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<?> setDefault(@PathVariable Long id) {
        try {
            Long userId = currentUserId();
            UserAddress updated = addressService.setDefault(userId, id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return authService.getUserIdForPhoneNumber(auth.getName());
    }
}
