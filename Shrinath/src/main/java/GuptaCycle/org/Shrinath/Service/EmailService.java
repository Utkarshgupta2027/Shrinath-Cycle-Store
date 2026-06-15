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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class EmailService {

    @Autowired
    private InvoiceService invoiceService;

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
            String subject = "Welcome to Shrinath Cycle Store!";
            String text = "Hi " + name + ",\n\nWelcome to Shrinath Cycle Store! We're excited to have you on board.\n\nBest regards,\nThe Shrinath Cycle Store Team";
            sendViaBrevoApi(toEmail, subject, text, null, null, null);
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
        sendViaBrevoApi(toEmail, subject, textContent, null, null, null);
    }

    private void sendViaBrevoApi(String toEmail, String subject, String textContent, String htmlContent, String replyToEmail, List<Map<String, Object>> attachments) {
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
        if (textContent != null) {
            body.put("textContent", textContent);
        }
        if (htmlContent != null) {
            body.put("htmlContent", htmlContent);
        }
        if (replyToEmail != null && !replyToEmail.isBlank()) {
            Map<String, String> replyTo = new HashMap<>();
            replyTo.put("email", replyToEmail);
            body.put("replyTo", replyTo);
        }
        if (attachments != null && !attachments.isEmpty()) {
            body.put("attachment", attachments);
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            restTemplate.postForObject(BREVO_API_URL, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send Brevo HTTP email to " + toEmail + ": " + e.getMessage());
            throw new RuntimeException("Brevo API send failed: " + e.getMessage(), e);
        }
    }

    @Async
    public void sendOrderConfirmationEmail(String toEmail, Order order) {
        try {
            String subject = "Order Confirmation - Shrinath Cycle Store";
            
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
            
            text.append("\nWe have attached your GST Tax Invoice to this email.\n");
            text.append("We will notify you once your order is shipped.\n\nBest regards,\nThe Shrinath Cycle Store Team");
            
            List<Map<String, Object>> attachments = null;
            try {
                byte[] pdfBytes = invoiceService.generateInvoice(order);
                if (pdfBytes != null && pdfBytes.length > 0) {
                    String base64Content = java.util.Base64.getEncoder().encodeToString(pdfBytes);
                    Map<String, Object> attachment = new HashMap<>();
                    attachment.put("name", "invoice-" + order.getId() + ".pdf");
                    attachment.put("content", base64Content);
                    attachments = List.of(attachment);
                }
            } catch (Exception ex) {
                System.err.println("Could not generate invoice attachment for order " + order.getId() + ": " + ex.getMessage());
            }

            sendViaBrevoApi(toEmail, subject, text.toString(), null, null, attachments);
        } catch (Exception e) {
            System.err.println("Failed to send order confirmation email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendShippingUpdateEmail(String toEmail, Order order, String status) {
        try {
            String subject = "Order Update - Shrinath Cycle Store";
            
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
            
            sendViaBrevoApi(toEmail, subject, text.toString(), null, null, null);
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
                
            String subject = "Cancellation Update - Shrinath Cycle Store";
            String text = "Hello,\n\nYour cancellation request for " + productNames
                    + " has been received. Refund status: " + safe(order.getRefundStatus())
                    + ".\n\nBest regards,\nThe Shrinath Cycle Store Team";
            sendViaBrevoApi(toEmail, subject, text, null, null, null);
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
                
            String subject = "Refund Processed - Shrinath Cycle Store";
            String text = "Hello,\n\nYour refund for " + productNames
                    + " has been processed. Refund ID: " + safe(order.getRefundId())
                    + "\nRefund Amount: Rs. " + order.getRefundAmount()
                    + "\n\nBest regards,\nThe Shrinath Cycle Store Team";
            sendViaBrevoApi(toEmail, subject, text, null, null, null);
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
                
            String subject = "Return/Exchange Update - Shrinath Cycle Store";
            String text = "Hello,\n\nYour " + requestType + " request for " + productNames
                    + " is now: " + status + ".\n\nBest regards,\nThe Shrinath Cycle Store Team";
            sendViaBrevoApi(toEmail, subject, text, null, null, null);
        } catch (Exception e) {
            System.err.println("Failed to send return/exchange email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendNewOrderAdminNotification(String adminEmail, Order order) {
        try {
            String subject = "New Order Received - Order #" + order.getId();
            
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
            
            sendViaBrevoApi(adminEmail, subject, text.toString(), null, null, null);
        } catch (Exception e) {
            System.err.println("Failed to send new order admin notification to " + adminEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendLowStockAdminAlert(String adminEmail, Product product) {
        try {
            String subject = "⚠️ Low Stock Alert — " + product.getName();
            String text =
                    "Hello Admin,\n\n" +
                    "Stock is running low for the following product:\n\n" +
                    "Product: " + product.getName() + "\n" +
                    "Brand: " + (product.getBrand() != null ? product.getBrand() : "N/A") + "\n" +
                    "Category: " + (product.getCategory() != null ? product.getCategory() : "N/A") + "\n" +
                    "Remaining stock: " + product.getQuantity() + " units\n\n" +
                    "Please restock soon to avoid disruption.\n\n" +
                    "Best regards,\nShrinath Cycle Store System";
            sendViaBrevoApi(adminEmail, subject, text, null, null, null);
        } catch (Exception e) {
            System.err.println("Failed to send low-stock alert for product " + product.getId() + ": " + e.getMessage());
        }
    }

    @Async
    public void sendRestockNotification(String toEmail, Product product) {
        try {
            String subject = "✅ Back in Stock — " + product.getName();
            String text =
                    "Good news! The product you wanted is back in stock.\n\n" +
                    "Product: " + product.getName() + "\n" +
                    (product.getBrand() != null ? "Brand: " + product.getBrand() + "\n" : "") +
                    "Price: ₹" + (product.getPrice() != null ? product.getPrice().toPlainString() : "N/A") + "\n" +
                    "Available units: " + product.getQuantity() + "\n\n" +
                    "Hurry — limited stock! Visit us at shrinathcyclestore.com\n\n" +
                    "Best regards,\nThe Shrinath Cycle Store Team";
            sendViaBrevoApi(toEmail, subject, text, null, null, null);
        } catch (Exception e) {
            System.err.println("Failed to send restock notification to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendAbandonedCartEmail(String toEmail, String name, List<CartItem> items) {
        try {
            String subject = "🛒 You left items in your cart! - Shrinath Cycle Store";
            
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
            
            sendViaBrevoApi(toEmail, subject, text.toString(), null, null, null);
        } catch (Exception e) {
            System.err.println("Failed to send abandoned cart email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendFeedbackAdminNotification(String adminEmail, String replyToEmail, String subject, String body) {
        try {
            sendViaBrevoApi(adminEmail, subject, body, null, replyToEmail, null);
        } catch (Exception e) {
            System.err.println("Failed to send feedback admin notification: " + e.getMessage());
        }
    }

    @Async
    public void sendFeedbackUserConfirmation(String toEmail, String adminEmail, String subject, String body) {
        try {
            sendViaBrevoApi(toEmail, subject, body, null, adminEmail, null);
        } catch (Exception e) {
            System.err.println("Failed to send feedback user confirmation: " + e.getMessage());
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "N/A" : value;
    }
}
