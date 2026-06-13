package GuptaCycle.org.Shrinath.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Full analytics dashboard response sent to Admin Panel.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitorDashboardDTO {

    // ── Visitor counts ────────────────────────────────────────────
    /** Total unique browsers that ever visited (via localStorage visitorId) */
    private long totalUniqueVisitors;
    /** Total distinct sessions (tab opens) */
    private long totalSessions;
    /** Sessions with no userId — pure guests */
    private long guestVisitors;
    /** Sessions that placed at least one order */
    private long buyerSessions;
    /** Sessions that only browsed, never ordered */
    private long browserOnlySessions;
    /** Conversion rate as percentage string e.g. "18.5%" */
    private String conversionRate;

    // ── User registrations (from users table) ────────────────────
    /** Total registered users in the system */
    private long totalRegisteredUsers;
    /** Registered users added this month */
    private long newUsersThisMonth;

    // ── Repeat customers (from orders table) ─────────────────────
    /** Users who placed more than 1 order, sorted by order count desc */
    private List<RepeatCustomerDTO> repeatCustomers;

    // ── Repeat products (from order_items table) ──────────────────
    /** Products ordered most frequently across all orders */
    private List<RepeatProductDTO> topOrderedProducts;

    // ── Failed searches (from search_log) ─────────────────────────
    /** Queries that returned 0 results, ranked by frequency */
    private List<SearchTermDTO> failedSearches;
    /** All top search terms including successful ones */
    private List<SearchTermDTO> topSearchTerms;
    /** Total number of failed searches ever */
    private long totalFailedSearches;

    // ── Visitor trend (last 7 days) ───────────────────────────────
    private List<TrendPointDTO> visitorTrend;
    private List<TrendPointDTO> guestTrend;

    // ── Nested DTOs ───────────────────────────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RepeatCustomerDTO {
        private Long userId;
        private String name;
        private String email;
        private String phone;
        private long orderCount;
        private String lastOrderDate;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RepeatProductDTO {
        private Long productId;
        private String productName;
        private String category;
        private long orderCount;
        private long totalQuantitySold;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SearchTermDTO {
        private String query;
        private long count;
        private double avgResults;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TrendPointDTO {
        private String label;   // date string e.g. "Mon 13"
        private long value;
    }
}
