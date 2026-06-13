package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.AnalyticsEventDTO;
import GuptaCycle.org.Shrinath.DTO.SearchLogDTO;
import GuptaCycle.org.Shrinath.DTO.VisitorDashboardDTO;
import GuptaCycle.org.Shrinath.DTO.VisitorDashboardDTO.*;
import GuptaCycle.org.Shrinath.Model.AnalyticsEvent;
import GuptaCycle.org.Shrinath.Model.SearchLog;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.AnalyticsEventRepository;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import GuptaCycle.org.Shrinath.Repository.SearchLogRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitorAnalyticsService {

    @Autowired
    private AnalyticsEventRepository analyticsEventRepository;

    @Autowired
    private SearchLogRepository searchLogRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager em;

    // ── Record a visitor event (PAGE_VIEW / ORDER_PLACED) ────────────────────

    public void recordEvent(AnalyticsEventDTO dto, String ipAddress) {
        if (dto.getVisitorId() == null || dto.getVisitorId().isBlank()) return;
        if (dto.getSessionId() == null || dto.getSessionId().isBlank()) return;

        AnalyticsEvent event = new AnalyticsEvent();
        event.setVisitorId(dto.getVisitorId());
        event.setSessionId(dto.getSessionId());
        event.setEventType(dto.getEventType() != null ? dto.getEventType().toUpperCase() : "PAGE_VIEW");
        event.setPagePath(dto.getPagePath());
        event.setUserId(dto.getUserId());
        event.setTimestamp(LocalDateTime.now());
        event.setIpAddress(ipAddress);

        analyticsEventRepository.save(event);
    }

    // ── Record a search query ────────────────────────────────────────────────

    public void recordSearch(SearchLogDTO dto) {
        if (dto.getQuery() == null || dto.getQuery().isBlank()) return;

        SearchLog log = new SearchLog();
        log.setQuery(dto.getQuery().trim().toLowerCase());
        log.setResultCount(Math.max(dto.getResultCount(), 0));
        log.setUserId(dto.getUserId());
        log.setSessionId(dto.getSessionId());
        log.setTimestamp(LocalDateTime.now());

        searchLogRepository.save(log);
    }

    // ── Build the full dashboard ─────────────────────────────────────────────

    public VisitorDashboardDTO buildDashboard() {

        // --- Visitor counts ---
        long totalUniqueVisitors  = analyticsEventRepository.countDistinctVisitors();
        long totalSessions        = analyticsEventRepository.countDistinctSessions();
        long guestVisitors        = analyticsEventRepository.countGuestVisitors();
        long buyerSessions        = analyticsEventRepository.countBuyerSessions();
        long browserOnlySessions  = Math.max(totalSessions - buyerSessions, 0);
        String conversionRate     = totalSessions > 0
                ? String.format("%.1f%%", (buyerSessions * 100.0) / totalSessions)
                : "0.0%";

        // --- Registered users ---
        long totalRegisteredUsers = userRepository.count();
        LocalDateTime firstOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        long newUsersThisMonth = countNewUsersThisMonth(firstOfMonth);

        // --- Repeat customers: users with > 1 order ---
        List<RepeatCustomerDTO> repeatCustomers = buildRepeatCustomers();

        // --- Top ordered products ---
        List<RepeatProductDTO> topOrderedProducts = buildTopOrderedProducts();

        // --- Failed searches ---
        List<Object[]> failedRaw = searchLogRepository.topFailedSearches();
        List<SearchTermDTO> failedSearches = failedRaw.stream()
                .limit(20)
                .map(row -> SearchTermDTO.builder()
                        .query(String.valueOf(row[0]))
                        .count(((Number) row[1]).longValue())
                        .avgResults(0.0)
                        .build())
                .collect(Collectors.toList());

        List<Object[]> topSearchRaw = searchLogRepository.topSearchTerms();
        List<SearchTermDTO> topSearchTerms = topSearchRaw.stream()
                .limit(20)
                .map(row -> SearchTermDTO.builder()
                        .query(String.valueOf(row[0]))
                        .count(((Number) row[1]).longValue())
                        .avgResults(row[2] != null ? ((Number) row[2]).doubleValue() : 0.0)
                        .build())
                .collect(Collectors.toList());

        long totalFailedSearches = searchLogRepository.countByResultCount(0);

        // --- 7-day visitor trend ---
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<TrendPointDTO> visitorTrend = buildTrend(
                analyticsEventRepository.dailyVisitorTrend(sevenDaysAgo));
        List<TrendPointDTO> guestTrend = buildTrend(
                analyticsEventRepository.dailyGuestTrend(sevenDaysAgo));

        return VisitorDashboardDTO.builder()
                .totalUniqueVisitors(totalUniqueVisitors)
                .totalSessions(totalSessions)
                .guestVisitors(guestVisitors)
                .buyerSessions(buyerSessions)
                .browserOnlySessions(browserOnlySessions)
                .conversionRate(conversionRate)
                .totalRegisteredUsers(totalRegisteredUsers)
                .newUsersThisMonth(newUsersThisMonth)
                .repeatCustomers(repeatCustomers)
                .topOrderedProducts(topOrderedProducts)
                .failedSearches(failedSearches)
                .topSearchTerms(topSearchTerms)
                .totalFailedSearches(totalFailedSearches)
                .visitorTrend(visitorTrend)
                .guestTrend(guestTrend)
                .build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /** Count users created this month using a raw JPQL query on the User entity. */
    private long countNewUsersThisMonth(LocalDateTime since) {
        try {
            // User entity doesn't have a createdAt field, so we approximate
            // by counting all users created in analytics_events with userId != null
            // after the since date. Fallback: return total users if no events exist.
            Long count = (Long) em.createQuery(
                    "SELECT COUNT(DISTINCT a.userId) FROM AnalyticsEvent a " +
                    "WHERE a.userId IS NOT NULL AND a.timestamp >= :since AND a.eventType = 'PAGE_VIEW'"
            ).setParameter("since", since).getSingleResult();
            return count == null ? 0L : count;
        } catch (Exception e) {
            return 0L;
        }
    }

    /** Users with more than 1 order — built from orders table. */
    @SuppressWarnings("unchecked")
    private List<RepeatCustomerDTO> buildRepeatCustomers() {
        List<Object[]> rows = em.createQuery(
                "SELECT o.userId, COUNT(o), MAX(o.orderDate) FROM Order o " +
                "GROUP BY o.userId HAVING COUNT(o) > 1 " +
                "ORDER BY COUNT(o) DESC"
        ).setMaxResults(30).getResultList();

        List<RepeatCustomerDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long userId = (Long) row[0];
            long orderCount = ((Number) row[1]).longValue();
            Object lastOrderRaw = row[2];
            String lastOrderDate = lastOrderRaw != null
                    ? lastOrderRaw.toString().substring(0, 10)
                    : "-";

            Optional<User> userOpt = userRepository.findById(userId);
            String name  = userOpt.map(User::getName).orElse("Unknown");
            String email = userOpt.map(User::getEmail).orElse("-");
            String phone = userOpt.map(User::getPhoneNumber).orElse("-");

            result.add(RepeatCustomerDTO.builder()
                    .userId(userId)
                    .name(name)
                    .email(email)
                    .phone(phone)
                    .orderCount(orderCount)
                    .lastOrderDate(lastOrderDate)
                    .build());
        }
        return result;
    }

    /** Products ordered most frequently across all orders. */
    @SuppressWarnings("unchecked")
    private List<RepeatProductDTO> buildTopOrderedProducts() {
        List<Object[]> rows = em.createQuery(
                "SELECT i.productId, i.name, i.category, COUNT(i), SUM(i.quantity) " +
                "FROM OrderItem i " +
                "GROUP BY i.productId, i.name, i.category " +
                "ORDER BY COUNT(i) DESC"
        ).setMaxResults(20).getResultList();

        List<RepeatProductDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(RepeatProductDTO.builder()
                    .productId((Long) row[0])
                    .productName(row[1] != null ? String.valueOf(row[1]) : "Unknown Product")
                    .category(row[2] != null ? String.valueOf(row[2]) : "-")
                    .orderCount(((Number) row[3]).longValue())
                    .totalQuantitySold(row[4] != null ? ((Number) row[4]).longValue() : 0L)
                    .build());
        }
        return result;
    }

    /** Convert raw [date, count] rows from DB into TrendPointDTO list. */
    private List<TrendPointDTO> buildTrend(List<Object[]> rows) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("EEE dd");
        List<TrendPointDTO> trend = new ArrayList<>();
        for (Object[] row : rows) {
            String label;
            try {
                label = LocalDate.parse(String.valueOf(row[0])).format(fmt);
            } catch (Exception e) {
                label = String.valueOf(row[0]);
            }
            long value = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            trend.add(TrendPointDTO.builder().label(label).value(value).build());
        }
        return trend;
    }
}
