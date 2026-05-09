package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendWelcomeEmail(String toEmail, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome to Shrinath Cycle Store!");
            message.setText("Hi " + name + ",\n\nWelcome to Shrinath Cycle Store! We're excited to have you on board.\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send welcome email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset OTP - Shrinath Cycle Store");
            message.setText("Hello,\n\nYou have requested to reset your password. Please use the following OTP to reset it:\n\n" + otp + "\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request a password reset, please ignore this email.");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send password reset email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendOrderConfirmationEmail(String toEmail, Order order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Order Confirmation - Shrinath Cycle Store (Order #" + order.getId() + ")");
            
            StringBuilder text = new StringBuilder();
            text.append("Hello,\n\nThank you for your order! Your order has been placed successfully.\n\n");
            text.append("Order ID: ").append(order.getId()).append("\n");
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
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Order Update - Shrinath Cycle Store (Order #" + order.getId() + ")");
            
            message.setText("Hello,\n\nYour order #" + order.getId() + " status has been updated to: " + status + ".\n\nThank you for shopping with us!\n\nBest regards,\nThe Shrinath Cycle Store Team");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send shipping update email to " + toEmail + ": " + e.getMessage());
        }
    }
}
