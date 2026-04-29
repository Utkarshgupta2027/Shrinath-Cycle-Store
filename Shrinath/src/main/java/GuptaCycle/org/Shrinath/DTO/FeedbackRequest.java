package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class FeedbackRequest {
    private String name;
    private String email;
    private String subject;
    private String category;
    private String message;
    private Integer rating; // optional 1–5
}
