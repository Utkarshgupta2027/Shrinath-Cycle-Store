package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

/**
 * Payload sent from browser → backend when a user event occurs.
 */
@Data
public class AnalyticsEventDTO {
    /** UUID stored in browser localStorage (persistent per device) */
    private String visitorId;
    /** UUID stored in browser sessionStorage (per-tab) */
    private String sessionId;
    /** PAGE_VIEW | ORDER_PLACED */
    private String eventType;
    /** Current URL path e.g. /product/5 */
    private String pagePath;
    /** null for guests */
    private Long userId;
}
