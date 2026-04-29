package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.FeedbackRequest;
import GuptaCycle.org.Shrinath.Model.Feedback;
import GuptaCycle.org.Shrinath.Service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    /**
     * POST /api/feedback
     * Accepts a feedback form submission, persists it and sends an email to the admin.
     */
    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(@RequestBody FeedbackRequest request) {
        try {
            Feedback saved = feedbackService.submitFeedback(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "success", true,
                            "message", "Thank you for your feedback! We'll get back to you soon.",
                            "feedbackId", saved.getId()
                    ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Something went wrong. Please try again."));
        }
    }
}
