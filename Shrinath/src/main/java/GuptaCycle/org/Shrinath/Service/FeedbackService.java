package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.FeedbackRequest;
import GuptaCycle.org.Shrinath.Model.Feedback;
import GuptaCycle.org.Shrinath.Repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.admin.email}")
    private String adminEmail;

    public Feedback submitFeedback(FeedbackRequest req) {

        // ── 1. Validate required fields ──────────────────────────────────
        if (req.getName()    == null || req.getName().isBlank())    throw new IllegalArgumentException("Name is required.");
        if (req.getEmail()   == null || req.getEmail().isBlank())   throw new IllegalArgumentException("Email is required.");
        if (req.getSubject() == null || req.getSubject().isBlank()) throw new IllegalArgumentException("Subject is required.");
        if (req.getMessage() == null || req.getMessage().isBlank()) throw new IllegalArgumentException("Message is required.");
        if (req.getCategory()== null || req.getCategory().isBlank()) throw new IllegalArgumentException("Category is required.");

        // ── 2. Persist in database ───────────────────────────────────────
        Feedback feedback = new Feedback();
        feedback.setName(req.getName());
        feedback.setEmail(req.getEmail());
        feedback.setSubject(req.getSubject());
        feedback.setCategory(req.getCategory());
        feedback.setMessage(req.getMessage());
        feedback.setRating(req.getRating());
        Feedback saved = feedbackRepository.save(feedback);

        // ── 3. Send email to admin ────────────────────────────────────────
        try {
            sendAdminNotification(saved);
        } catch (Exception e) {
            // Log but don't fail the request if email sending fails
            System.err.println("[FeedbackService] Failed to send admin email: " + e.getMessage());
        }

        // ── 4. Send confirmation to user ──────────────────────────────────
        try {
            sendUserConfirmation(saved);
        } catch (Exception e) {
            System.err.println("[FeedbackService] Failed to send user confirmation: " + e.getMessage());
        }

        return saved;
    }

    private void sendAdminNotification(Feedback fb) {
        if (mailSender == null || adminEmail == null || adminEmail.isBlank()) {
            return;
        }

        String ratingLine = fb.getRating() != null
                ? "Rating    : " + "★".repeat(fb.getRating()) + " (" + fb.getRating() + "/5)\n"
                : "";

        String body = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "    NEW CUSTOMER FEEDBACK — ShreeNath Cycle Store\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "From      : " + fb.getName() + " <" + fb.getEmail() + ">\n" +
                "Category  : " + fb.getCategory() + "\n" +
                "Subject   : " + fb.getSubject() + "\n" +
                ratingLine +
                "Submitted : " + fb.getSubmittedAt() + "\n\n" +
                "─────────────────────────────────────────\n" +
                "MESSAGE:\n" +
                "─────────────────────────────────────────\n" +
                fb.getMessage() + "\n\n" +
                "─────────────────────────────────────────\n" +
                "Feedback ID: #" + fb.getId() + "\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(adminEmail);
        msg.setFrom(adminEmail);
        msg.setReplyTo(fb.getEmail());
        msg.setSubject("[ShreeNath Feedback] " + fb.getCategory() + " — " + fb.getSubject());
        msg.setText(body);
        mailSender.send(msg);
    }

    private void sendUserConfirmation(Feedback fb) {
        if (mailSender == null || adminEmail == null || adminEmail.isBlank()) {
            return;
        }

        String body = "Hi " + fb.getName() + ",\n\n" +
                "Thank you for reaching out to ShreeNath Cycle Store! 🚲\n\n" +
                "We have received your feedback and our team will review it shortly.\n\n" +
                "Here's a summary of your submission:\n" +
                "  • Subject  : " + fb.getSubject() + "\n" +
                "  • Category : " + fb.getCategory() + "\n" +
                "  • Reference: #" + fb.getId() + "\n\n" +
                "We typically respond within 24–48 hours.\n\n" +
                "Warm regards,\n" +
                "ShreeNath Cycle Store Team\n" +
                "📧 gutkarsh702@gmail.com";

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(fb.getEmail());
        msg.setFrom(adminEmail);
        msg.setSubject("We received your feedback — ShreeNath Cycle Store");
        msg.setText(body);
        mailSender.send(msg);
    }
}
