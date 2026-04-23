package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long userId;
    private Integer rating;
    private String comment;
}
