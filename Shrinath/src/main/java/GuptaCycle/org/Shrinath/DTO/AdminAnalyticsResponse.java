package GuptaCycle.org.Shrinath.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsResponse {
    private long totalOrders;
    private long fulfilledOrders;
    private long cancelledOrders;
    private long returnedOrders;
    private long customerTraffic;
    private long unitsSold;
    private BigDecimal revenue;
    private BigDecimal averageOrderValue;
    private List<MetricPoint> revenueTrend;
    private List<MetricPoint> trafficTrend;
    private List<MetricPoint> behaviorBreakdown;
}
