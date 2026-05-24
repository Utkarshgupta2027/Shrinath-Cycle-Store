package GuptaCycle.org.Shrinath.Scheduler;

import GuptaCycle.org.Shrinath.Model.Cart;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.CartRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import GuptaCycle.org.Shrinath.Service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class CartAbandonmentScheduler {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.cart.abandonment-threshold-minutes:30}")
    private int thresholdMinutes;

    @Scheduled(fixedRateString = "${app.cart.scheduler-fixed-rate-ms:60000}")
    @Transactional
    public void checkAbandonedCarts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(thresholdMinutes);
        List<Cart> carts = cartRepository.findAll();

        for (Cart cart : carts) {
            if (cart.getItems() != null && !cart.getItems().isEmpty() && !cart.isEmailSent()) {
                if (cart.getUpdatedAt() != null && cart.getUpdatedAt().isBefore(cutoff)) {
                    sendReminder(cart);
                }
            }
        }
    }

    private void sendReminder(Cart cart) {
        try {
            User user = userRepository.findById(cart.getUserId()).orElse(null);
            if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
                emailService.sendAbandonedCartEmail(user.getEmail(), user.getName(), cart.getItems());
                cart.setEmailSent(true);
                cartRepository.save(cart);
            }
        } catch (Exception e) {
            System.err.println("Error processing abandoned cart id " + cart.getId() + ": " + e.getMessage());
        }
    }
}
