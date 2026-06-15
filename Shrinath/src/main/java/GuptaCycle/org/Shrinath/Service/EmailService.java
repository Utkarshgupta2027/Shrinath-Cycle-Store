package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Order;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.CartItem;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.mail.from-name:Shrinath Cycle Store}")
    private String fromName;

    // Brevo HTTP API key — used for critical OTP emails (SMTP is blocked on Render)
    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    // Verified sender email registered in Brevo Senders dashboard
    @Value("${brevo.sender.email:${spring.mail.username:noreply@shrinathcyclestore.com}}")
    private String brevoSenderEmail;

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Async
    public void sendWelcomeEmail(String toEmail, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Welcome to Shrinath Cycle Store!");
            message.setText("Hi " + name + ",\n\nWelcome to Shrinath Cycle Store! We're excited to have you on board.\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send welcome email to " + toEmail + ": " + e.getMessage());
        }
    }

    /**
     * Sends registration OTP via Brevo HTTP API.
     * SMTP (port 465/587) is blocked by Render free tier — HTTP API on port 443 is not.
     * NOT @Async so failures propagate back to the caller.
     */
    public void sendRegistrationOtpEmail(String toEmail, String otp) {
        String subject = "Verify Your Email \u2014 Shrinath Cycle Store";
        String text =
            "Hello,\n\n" +
            "Thank you for signing up at Shrinath Cycle Store!\n\n" +
            "Your email verification OTP is:\n\n" +
            "  " + otp + "\n\n" +
            "This OTP is valid for 5 minutes. Please do not share it with anyone.\n\n" +
            "If you did not request this, you can safely ignore this email.\n\n" +
            "Best regards,\n" +
            fromName;
        sendViaBrevoApi(toEmail, subject, text);
    }

    /**
     * Sends password reset OTP via Brevo HTTP API.
     * NOT @Async so failures propagate back to the API caller.
     */
    public void sendPasswordResetOtpEmail(String toEmail, String otp) {
        String subject = "Password Reset OTP - Shrinath Cycle Store";
        String text =
            "Hello,\n\nYou have requested to reset your password. " +
            "Please use the following OTP to reset it:\n\n" + otp +
            "\n\nThis OTP is valid for 5 minutes.\n\n" +
            "If you did not request a password reset, please ignore this email.";
        sendViaBrevoApi(toEmail, subject, text);
    }

    /**
     * Sends an email via Brevo's transactional HTTP API (port 443).
     * This bypasses SMTP entirely — works on Render free tier.
     *
     * @throws RuntimeException if the API key is missing or the call fails
     */
    private void sendViaBrevoApi(String toEmail, String subject, String textContent) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            throw new RuntimeException(
                "Brevo API key (BREVO_API_KEY) is not configured. " +
                "Set it in Render environment variables.");
        }

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", brevoApiKey);

        Map<String, Object> sender = new HashMap<>();
        sender.put("name", fromName);
        sender.put("email", brevoSenderEmail);

        Map<String, String> recipient = new HashMap<>();
        recipient.put("email", toEmail);

        Map<String, Object> body = new HashMap<>();
        body.put("sender", sender);
        body.put("to", List.of(recipient));
        body.put("subject", subject);
        body.put("textContent", textContent);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.postForObject(BREVO_API_URL, request, String.class);
    }


    @Async
    public void sendOrderConfirmationEmail(String toEmail, Order order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Order Confirmation - Shrinath Cycle Store");
            
            StringBuilder text = new StringBuilder();
            text.append("Hello,\n\nThank you for your order! Your order has been placed successfully.\n\n");
            text.append("Total Amount: ₹").append(order.getTotalAmount()).append("\n");
            text.append("Payment Method: ").append(order.getPaymentMethod()).append("\n");
            text.append("Payment Status: ").append(order.getPaymentStatus()).append("\n\n");
            text.append("Order Summary:\n");
            
            if (order.getItems() != null) {
                order.getItems().forEach(item -> {
                    text.append("- ").append(item.getName())
                        .append(" (Qty: ").append(item.getQuantity())
                        .append(") - ₹").append(item.getPrice()).append("\n");
                });
            }
            
            text.append("\nWe will notify you once your order is shipped.\n\nBest regards,\nThe Shrinath Cycle Store Team");
            
            message.setText(text.toString());
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send order confirmation email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendShippingUpdateEmail(String toEmail, Order order, String status) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Order Update - Shrinath Cycle Store");
            
            String productNames = order.getItems() != null && !order.getItems().isEmpty() 
                ? order.getItems().stream().map(item -> item.getName()).collect(java.util.stream.Collectors.joining(", ")) 
                : "items";
            
            StringBuilder text = new StringBuilder();
            text.append("Hello,\n\nYour order for ").append(productNames).append(" status has been updated to: ").append(status).append(".\n\n");
            text.append("Order Details:\n");
            if (order.getItems() != null) {
                order.getItems().forEach(item -> {
                    text.append("- ").append(item.getName())
                        .append(" (Qty: ").append(item.getQuantity())
                        .append(") - Rs. ").append(item.getPrice()).append("\n");
                });
            }
            text.append("\nTotal Amount: Rs. ").append(order.getTotalAmount()).append("\n");
            text.append("Delivery Address: ").append(order.getAddress() != null ? order.getAddress() : "N/A").append("\n");

            // Include AWB tracking info if available
            if (order.getAwbNumber() != null && !order.getAwbNumber().isBlank()) {
                text.append("\n--- Shipment Tracking ---\n");
                text.append("AWB Number: ").append(order.getAwbNumber()).append("\n");
                text.append("Courier: ").append(order.getCourierName() != null ? order.getCourierName() : "N/A").append("\n");
                if (order.getTrackingUrl() != null && !order.getTrackingUrl().isBlank()) {
                    text.append("Track your shipment: ").append(order.getTrackingUrl()).append("\n");
                }
            }

            text.append("\nThank you for shopping with us!\n\nBest regards,\nThe Shrinath Cycle Store Team");
            
            message.setText(text.toString());
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send shipping update email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendCancellationEmail(String toEmail, Order order) {
        try {
            String productNames = order.getItems() != null && !order.getItems().isEmpty() 
                ? order.getItems().stream().map(item -> item.getName()).collect(java.util.stream.Collectors.joining(", ")) 
                : "items";
                
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Cancellation Update - Shrinath Cycle Store");
            message.setText("Hello,\n\nYour cancellation request for " + productNames
                    + " has been received. Refund status: " + safe(order.getRefundStatus())
                    + ".\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send cancellation email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendRefundEmail(String toEmail, Order order) {
        try {
            String productNames = order.getItems() != null && !order.getItems().isEmpty() 
                ? order.getItems().stream().map(item -> item.getName()).collect(java.util.stream.Collectors.joining(", ")) 
                : "items";
                
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Refund Processed - Shrinath Cycle Store");
            message.setText("Hello,\n\nYour refund for " + productNames
                    + " has been processed. Refund ID: " + safe(order.getRefundId())
                    + "\nRefund Amount: Rs. " + order.getRefundAmount()
                    + "\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send refund email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendReturnExchangeEmail(String toEmail, Order order, String requestType, String status) {
        try {
            String productNames = order.getItems() != null && !order.getItems().isEmpty() 
                ? order.getItems().stream().map(item -> item.getName()).collect(java.util.stream.Collectors.joining(", ")) 
                : "items";
                
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("Return/Exchange Update - Shrinath Cycle Store");
            message.setText("Hello,\n\nYour " + requestType + " request for " + productNames
                    + " is now: " + status + ".\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send return/exchange email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendNewOrderAdminNotification(String adminEmail, Order order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(adminEmail);
            message.setSubject("New Order Received - Order #" + order.getId());
            
            StringBuilder text = new StringBuilder();
            text.append("Hello Admin,\n\nA new order has been placed on the store.\n\n");
            text.append("Order ID: ").append(order.getId()).append("\n");
            text.append("User ID: ").append(order.getUserId()).append("\n");
            text.append("Total Amount: ₹").append(order.getTotalAmount()).append("\n");
            text.append("Payment Method: ").append(order.getPaymentMethod()).append("\n");
            text.append("Payment Status: ").append(order.getPaymentStatus()).append("\n\n");
            text.append("Order Summary:\n");
            
            if (order.getItems() != null) {
                order.getItems().forEach(item -> {
                    text.append("- ").append(item.getName())
                        .append(" (Qty: ").append(item.getQuantity())
                        .append(") - ₹").append(item.getPrice()).append("\n");
                });
            }
            
            text.append("\nPlease review the order in the admin panel.\n\nBest regards,\nThe System");
            
            message.setText(text.toString());
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send new order admin notification to " + adminEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendLowStockAdminAlert(String adminEmail, Product product) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(adminEmail);
            message.setSubject("⚠️ Low Stock Alert — " + product.getName());
            message.setText(
                    "Hello Admin,\n\n" +
                    "Stock is running low for the following product:\n\n" +
                    "Product: " + product.getName() + "\n" +
                    "Brand: " + (product.getBrand() != null ? product.getBrand() : "N/A") + "\n" +
                    "Category: " + (product.getCategory() != null ? product.getCategory() : "N/A") + "\n" +
                    "Remaining stock: " + product.getQuantity() + " units\n\n" +
                    "Please restock soon to avoid disruption.\n\n" +
                    "Best regards,\nShrinath Cycle Store System"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send low-stock alert for product " + product.getId() + ": " + e.getMessage());
        }
    }

    @Async
    public void sendRestockNotification(String toEmail, Product product) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("✅ Back in Stock — " + product.getName());
            message.setText(
                    "Good news! The product you wanted is back in stock.\n\n" +
                    "Product: " + product.getName() + "\n" +
                    (product.getBrand() != null ? "Brand: " + product.getBrand() + "\n" : "") +
                    "Price: ₹" + (product.getPrice() != null ? product.getPrice().toPlainString() : "N/A") + "\n" +
                    "Available units: " + product.getQuantity() + "\n\n" +
                    "Hurry — limited stock! Visit us at shrinathcyclestore.com\n\n" +
                    "Best regards,\nThe Shrinath Cycle Store Team"
            );
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send restock notification to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendAbandonedCartEmail(String toEmail, String name, List<CartItem> items) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress());
            message.setTo(toEmail);
            message.setSubject("🛒 You left items in your cart! - Shrinath Cycle Store");
            
            StringBuilder text = new StringBuilder();
            text.append("Hi ").append(name).append(",\n\n");
            text.append("We noticed you left some items in your cart. They are waiting for you!\n\n");
            text.append("Here is what you left behind:\n");
            
            for (CartItem item : items) {
                text.append("- ").append(item.getProduct().getName())
                    .append(" (Qty: ").append(item.getQuantity())
                    .append(") - ₹").append(item.getProduct().getPrice()).append("\n");
            }
            
            text.append("\nReturn to your cart to complete your order before they sell out!\n");
            text.append("Visit us at: http://localhost:3000/cart\n\n");
            text.append("Best regards,\nThe Shrinath Cycle Store Team");
            
            message.setText(text.toString());
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send abandoned cart email to " + toEmail + ": " + e.getMessage());
        }
    }

    /**
     * Returns \"Shrinath Cycle Store <gutkarsh702@gmail.com>\" format.
     * Gmail will display the name instead of the raw email address.
     */
    private String fromAddress() {
        return fromName + " <" + fromEmail + ">";
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }
}
