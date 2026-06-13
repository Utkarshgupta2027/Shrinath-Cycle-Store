package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    /** Total unique visitors (distinct browser fingerprints) */
    @Query("SELECT COUNT(DISTINCT a.visitorId) FROM AnalyticsEvent a")
    long countDistinctVisitors();

    /** Total unique sessions */
    @Query("SELECT COUNT(DISTINCT a.sessionId) FROM AnalyticsEvent a")
    long countDistinctSessions();

    /** Sessions that resulted in an ORDER_PLACED event = buyers */
    @Query("SELECT COUNT(DISTINCT a.sessionId) FROM AnalyticsEvent a WHERE a.eventType = 'ORDER_PLACED'")
    long countBuyerSessions();

    /** Total new (guest) visitor count — visitors with no userId */
    @Query("SELECT COUNT(DISTINCT a.visitorId) FROM AnalyticsEvent a WHERE a.userId IS NULL")
    long countGuestVisitors();

    /** Count events per day for trend (last N days) */
    @Query("SELECT CAST(a.timestamp AS date), COUNT(DISTINCT a.visitorId) " +
           "FROM AnalyticsEvent a " +
           "WHERE a.timestamp >= :since " +
           "GROUP BY CAST(a.timestamp AS date) " +
           "ORDER BY CAST(a.timestamp AS date) ASC")
    List<Object[]> dailyVisitorTrend(LocalDateTime since);

    /** Count new visitors per day (no userId) */
    @Query("SELECT CAST(a.timestamp AS date), COUNT(DISTINCT a.visitorId) " +
           "FROM AnalyticsEvent a " +
           "WHERE a.timestamp >= :since AND a.userId IS NULL " +
           "GROUP BY CAST(a.timestamp AS date) " +
           "ORDER BY CAST(a.timestamp AS date) ASC")
    List<Object[]> dailyGuestTrend(LocalDateTime since);

    /** Most visited pages */
    @Query("SELECT a.pagePath, COUNT(a) FROM AnalyticsEvent a " +
           "WHERE a.eventType = 'PAGE_VIEW' AND a.pagePath IS NOT NULL " +
           "GROUP BY a.pagePath ORDER BY COUNT(a) DESC")
    List<Object[]> topPages();

    boolean existsByVisitorId(String visitorId);
}
