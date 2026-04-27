package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.AdminAnalyticsResponse;
import GuptaCycle.org.Shrinath.DTO.MetricPoint;
import GuptaCycle.org.Shrinath.Model.*;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepo;

    public Order saveOrder(OrderRequest req) {
        if (req == null || req.getUserId() == null) {
            throw new IllegalArgumentException("A valid user is required to place an order.");
        }

        if (CollectionUtils.isEmpty(req.getItems())) {
            throw new IllegalArgumentException("Order must contain at least one item.");
        }

        Order order = new Order();
        order.setUserId(req.getUserId());

        List<OrderItem> items = req.getItems().stream()
                .map(i -> {
                    OrderItem item = new OrderItem();
                    item.setProductId(i.getProductId());
                    item.setName(i.getName());
                    item.setPrice(i.getPrice());
                    item.setQuantity(Math.max(i.getQuantity(), 1));
                    return item;
                })
                .collect(Collectors.toList());

        double itemSubtotal = items.stream()
                .mapToDouble(item -> item.getPrice() * item.getQuantity())
                .sum();
        double totalAmount = req.getTotalAmount() > 0 ? req.getTotalAmount() : itemSubtotal;

        order.setTotalAmount(totalAmount);
        order.setAddress(req.getAddress());
        order.setItems(items);
        order.setStatus("PLACED");
        order.setUpdatedAt(LocalDateTime.now());

        return orderRepo.save(order);
    }

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepo.findByUserIdOrderByOrderDateDesc(userId);
    }

    public Order getOrderById(Long orderId) {
        return orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found."));
    }

    public List<Order> getAllOrders() {
        return orderRepo.findAllByOrderByOrderDateDesc();
    }

    public Order updateOrderStatus(Long orderId, String status) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found."));

        String normalizedStatus = normalizeStatus(status);
        order.setStatus(normalizedStatus);
        order.setUpdatedAt(LocalDateTime.now());

        return orderRepo.save(order);
    }

    public void deleteOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found."));

        orderRepo.delete(order);
    }

    public Order updateOrderAddress(Long orderId, String newAddress) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found."));

        if (!"PLACED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Address can only be updated for orders in PLACED status.");
        }

        order.setAddress(newAddress);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepo.save(order);
    }

    public Order cancelOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found."));

        String currentStatus = defaultStatus(order.getStatus());
        if (!"PLACED".equals(currentStatus) && !"PROCESSING".equals(currentStatus)) {
            throw new IllegalArgumentException("Orders can only be cancelled before they are shipped.");
        }

        order.setStatus("CANCELLED");
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepo.save(order);
    }

    public AdminAnalyticsResponse getAdminAnalytics() {
        List<Order> orders = orderRepo.findAll();
        long totalOrders = orders.size();
        long cancelledOrders = countByStatus(orders, "CANCELLED");
        long returnedOrders = countByStatus(orders, "RETURNED");
        long fulfilledOrders = countByStatus(orders, "DELIVERED");
        long customerTraffic = orders.stream()
                .map(Order::getUserId)
                .filter(userId -> userId != null)
                .distinct()
                .count();

        long unitsSold = orders.stream()
                .filter(order -> isRevenueStatus(order.getStatus()))
                .flatMap(order -> (order.getItems() == null ? List.<OrderItem>of() : order.getItems()).stream())
                .mapToLong(OrderItem::getQuantity)
                .sum();

        BigDecimal revenue = BigDecimal.valueOf(
                orders.stream()
                        .filter(order -> isRevenueStatus(order.getStatus()))
                        .mapToDouble(Order::getTotalAmount)
                        .sum()
        ).setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageOrderValue = totalOrders == 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : revenue.divide(BigDecimal.valueOf(Math.max(totalOrders - cancelledOrders, 1)), 2, RoundingMode.HALF_UP);

        return new AdminAnalyticsResponse(
                totalOrders,
                fulfilledOrders,
                cancelledOrders,
                returnedOrders,
                customerTraffic,
                unitsSold,
                revenue,
                averageOrderValue,
                buildRevenueTrend(orders),
                buildTrafficTrend(orders),
                buildBehaviorBreakdown(orders)
        );
    }

    private long countByStatus(List<Order> orders, String status) {
        return orders.stream()
                .filter(order -> status.equalsIgnoreCase(defaultStatus(order.getStatus())))
                .count();
    }

    private String normalizeStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        Set<String> allowedStatuses = Set.of("PLACED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED");
        if (!allowedStatuses.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported status. Use PLACED, PROCESSING, SHIPPED, DELIVERED, CANCELLED or RETURNED.");
        }
        return normalized;
    }

    private String defaultStatus(String status) {
        return (status == null || status.isBlank()) ? "PLACED" : status.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isRevenueStatus(String status) {
        String normalizedStatus = defaultStatus(status);
        return !"CANCELLED".equals(normalizedStatus) && !"RETURNED".equals(normalizedStatus);
    }

    private List<MetricPoint> buildRevenueTrend(List<Order> orders) {
        LocalDate today = LocalDate.now();
        Map<LocalDate, Double> revenueByDate = orders.stream()
                .filter(order -> order.getOrderDate() != null)
                .filter(order -> isRevenueStatus(order.getStatus()))
                .collect(Collectors.groupingBy(
                        order -> order.getOrderDate().toLocalDate(),
                        Collectors.summingDouble(Order::getTotalAmount)
                ));

        return IntStream.rangeClosed(6, 0)
                .mapToObj(today::minusDays)
                .map(date -> new MetricPoint(
                        date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                        revenueByDate.getOrDefault(date, 0.0)
                ))
                .collect(Collectors.toList());
    }

    private List<MetricPoint> buildTrafficTrend(List<Order> orders) {
        LocalDate today = LocalDate.now();
        Map<LocalDate, Long> trafficByDate = orders.stream()
                .filter(order -> order.getOrderDate() != null)
                .collect(Collectors.groupingBy(
                        order -> order.getOrderDate().toLocalDate(),
                        Collectors.counting()
                ));

        return IntStream.rangeClosed(6, 0)
                .mapToObj(today::minusDays)
                .map(date -> new MetricPoint(
                        date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                        trafficByDate.getOrDefault(date, 0L)
                ))
                .collect(Collectors.toList());
    }

    private List<MetricPoint> buildBehaviorBreakdown(List<Order> orders) {
        Map<String, Long> counts = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> defaultStatus(order.getStatus()),
                        Collectors.counting()
                ));

        return List.of(
                new MetricPoint("Placed", counts.getOrDefault("PLACED", 0L)),
                new MetricPoint("Processing", counts.getOrDefault("PROCESSING", 0L)),
                new MetricPoint("Shipped", counts.getOrDefault("SHIPPED", 0L)),
                new MetricPoint("Delivered", counts.getOrDefault("DELIVERED", 0L)),
                new MetricPoint("Cancelled", counts.getOrDefault("CANCELLED", 0L)),
                new MetricPoint("Returned", counts.getOrDefault("RETURNED", 0L))
        );
    }
}
