package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.PaymentCreateRequest;
import GuptaCycle.org.Shrinath.DTO.PaymentVerifyRequest;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private AuthService authService;

    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestBody PaymentCreateRequest request) {
        try {
            if (request != null && request.getOrder() != null) {
                request.getOrder().setUserId(currentUserId());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody PaymentVerifyRequest request) {
        try {
            return ResponseEntity.ok(paymentService.verifyPayment(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        try {
            paymentService.handleWebhook(payload, signature);
            return ResponseEntity.ok("Webhook processed.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    private Long currentUserId() {
        String phoneNumber = SecurityContextHolder.getContext().getAuthentication().getName();
        return authService.getUserIdForPhoneNumber(phoneNumber);
    }
}
