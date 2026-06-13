package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

/**
 * Payload sent from browser → backend when a search is performed.
 */
@Data
public class SearchLogDTO {
    private String query;
    /** 0 means user found nothing */
    private int resultCount;
    /** null for guests */
    private Long userId;
    private String sessionId;
}
