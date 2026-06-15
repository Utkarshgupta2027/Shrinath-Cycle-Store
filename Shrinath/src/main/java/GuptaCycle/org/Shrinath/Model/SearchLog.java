package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Logs every search query submitted from the frontend.
 * resultCount = 0  →  "failed search" (user couldn't find what they wanted)
 * resultCount > 0  →  successful search
 */
@Entity
@Data
@Table(name = "search_log", indexes = {
        @Index(name = "idx_sl_query",        columnList = "query"),
        @Index(name = "idx_sl_result_count",  columnList = "result_count"),
        @Index(name = "idx_sl_timestamp",     columnList = "timestamp")
})
public class SearchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** What the user typed in the search box */
    @Column(nullable = false, length = 512)
    private String query;

    /** How many products matched — 0 means user found nothing */
    @Column(nullable = false)
    private int resultCount;

    /** Null for guests */
    private Long userId;

    @Column(length = 64)
    private String sessionId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
}
