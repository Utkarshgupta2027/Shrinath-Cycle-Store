package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long userId;
    private Integer rating;
    private String comment;
    // Photo is handled as MultipartFile in the controller, not in this DTO
}
