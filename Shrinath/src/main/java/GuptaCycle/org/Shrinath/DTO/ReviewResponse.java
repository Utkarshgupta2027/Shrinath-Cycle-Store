package GuptaCycle.org.Shrinath.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    /** PENDING | APPROVED | REJECTED */
    private String status;
    private boolean verifiedPurchase;
    private int helpfulVotes;
    /** True if the review has a photo attached */
    private boolean hasPhoto;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
