package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Tracks every meaningful user interaction on the site.
 * EVENT_TYPES: PAGE_VIEW, ORDER_PLACED
 * visitor_id  = persistent per-browser (localStorage UUID)
 * session_id  = per-tab session (sessionStorage UUID)
 * user_id     = null for guests, set for logged-in users
 */
@Entity
@Data
@Table(name = "analytics_events", indexes = {
        @Index(name = "idx_ae_visitor", columnList = "visitorId"),
        @Index(name = "idx_ae_session", columnList = "sessionId"),
        @Index(name = "idx_ae_event_type", columnList = "eventType"),
        @Index(name = "idx_ae_timestamp", columnList = "timestamp"),
        @Index(name = "idx_ae_user_id", columnList = "userId")
})
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Persistent browser fingerprint stored in localStorage */
    @Column(nullable = false, length = 64)
    private String visitorId;

    /** Per-tab session ID stored in sessionStorage */
    @Column(nullable = false, length = 64)
    private String sessionId;

    /** PAGE_VIEW | ORDER_PLACED */
    @Column(nullable = false, length = 32)
    private String eventType;

    /** URL path at time of event e.g. /product/12 */
    @Column(length = 512)
    private String pagePath;

    /** Null for guests */
    private Long userId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    /** Server-side remote address (IPv4 or IPv6) */
    @Column(length = 45)
    private String ipAddress;
}
