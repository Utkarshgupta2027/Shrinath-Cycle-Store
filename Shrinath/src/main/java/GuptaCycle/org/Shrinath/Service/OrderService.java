package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.AdminAnalyticsResponse;
import GuptaCycle.org.Shrinath.DTO.MetricPoint;
import GuptaCycle.org.Shrinath.DTO.ReturnExchangeRequestDto;
import GuptaCycle.org.Shrinath.DTO.ReturnExchangeStatusUpdateRequest;
import GuptaCycle.org.Shrinath.Model.*;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.ReturnExchangeRequestRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class OrderService {

    private static final BigDecimal FREE_DELIVERY_THRESHOLD = BigDecimal.valueOf(2000);
    private static final BigDecimal STANDARD_DELIVERY_CHARGE = BigDecimal.valueOf(99);
    private static final BigDecimal EXPRESS_DELIVERY_CHARGE = BigDecimal.valueOf(199);
    private static final BigDecimal RIDE10_DISCOUNT_RATE = BigDecimal.valueOf(0.10);

    @Autowired
    private OrderRepository orderRepo;

    @Autowired
    private ProductRepo productRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private SmsService smsService;

    @Autowired
    private WhatsAppService whatsAppService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReturnExchangeRequestRepository returnExchangeRequestRepository;

    @Autowired
    private RazorpayRefundService razorpayRefundService;

    @Autowired
    private ShippingService shippingService;

    @Value("${app.admin.email:gutkarsh702@gmail.com}")
    private String adminEmail;

    @Transactional
    public Order saveOrder(OrderRequest req) {
        return saveOrder(req, "COD".equalsIgnoreCase(defaultString(req == null ? null : req.getPaymentMethod())));
    }

    @Transactional
    public Order saveOrder(OrderRequest req, boolean markPaid) {
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
                    Product product = productRepo.findById(Math.toIntExact(i.getProductId()))
                            .orElseThrow(() -> new IllegalArgumentException("Product not found: " + i.getProductId()));
                    int quantity = Math.max(i.getQuantity(), 1);
                    if (!product.isAvailable() || product.getQuantity() < quantity) {
                        throw new IllegalArgumentException("Product is out of stock or insufficient: " + product.getName());
                    }

                    int newQuantity = product.getQuantity() - quantity;
                    product.setQuantity(newQuantity);
                    if (newQuantity == 0) {
                        product.setAvailable(false);
                    }
                    productRepo.save(product);

                    OrderItem item = new OrderItem();
                    item.setProductId(product.getId().longValue());
                    item.setName(product.getName());
                    item.setPrice(product.getPrice() == null ? 0.0 : product.getPrice().doubleValue());
                    item.setQuantity(quantity);
                    return item;
                })
                .collect(Collectors.toList());

        BigDecimal subtotal = items.stream()
                .map(item -> BigDecimal.valueOf(item.getPrice()).multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        CouponResult coupon = calculateCouponDiscount(subtotal, req.getCouponCode());
        BigDecimal deliveryCharges = calculateDeliveryCharges(subtotal, req.getDeliveryOption());
        BigDecimal totalAmount = subtotal
                .subtract(coupon.discountAmount())
                .add(deliveryCharges)
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        order.setSubtotal(subtotal.doubleValue());
        order.setDiscountAmount(coupon.discountAmount().doubleValue());
        order.setDeliveryCharges(deliveryCharges.doubleValue());
        order.setCouponCode(coupon.appliedCode());
        order.setDeliveryOption(normalizeDeliveryOption(req.getDeliveryOption()));
        order.setPaymentMethod(defaultString(req.getPaymentMethod()).isBlank() ? "COD" : req.getPaymentMethod().trim().toUpperCase(Locale.ROOT));
        order.setPaymentStatus(markPaid ? "PAID" : "PENDING");
        order.setStatus(markPaid ? "PENDING" : "PENDING_PAYMENT");
        if (markPaid) {
            order.setPaidAt(LocalDateTime.now());
        }
        order.setTotalAmount(totalAmount.doubleValue());
        order.setAddress(req.getAddress());
        order.setItems(items);
        order.setUpdatedAt(LocalDateTime.now());

        Order savedOrder = orderRepo.save(order);
        if (markPaid || "COD".equalsIgnoreCase(savedOrder.getPaymentMethod())) {
            userRepository.findById(savedOrder.getUserId()).ifPresent(user -> notifyOrderConfirmation(user, savedOrder));
        }

        return savedOrder;
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
        Order order = getOrderById(orderId);
        String normalizedStatus = normalizeStatus(status);
        order.setStatus(normalizedStatus);
        order.setUpdatedAt(LocalDateTime.now());

        // Auto-generate AWB when order is shipped
        if ("SHIPPED".equals(normalizedStatus) && (order.getAwbNumber() == null || order.getAwbNumber().isBlank())) {
            java.util.Map<String, String> awbData = shippingService.generateAWB(orderId);
            order.setAwbNumber(awbData.get("awbNumber"));
            order.setCourierName(awbData.get("courierName"));
            order.setTrackingUrl(awbData.get("trackingUrl"));
        }

        Order savedOrder = orderRepo.save(order);
        userRepository.findById(savedOrder.getUserId())
                .ifPresent(user -> notifyStatusUpdate(user, savedOrder, normalizedStatus));
        return savedOrder;
    }

    public void deleteOrder(Long orderId) {
        orderRepo.delete(getOrderById(orderId));
    }

    public Order updateOrderAddress(Long orderId, String newAddress) {
        Order order = getOrderById(orderId);

        if (!"PENDING".equals(defaultStatus(order.getStatus()))) {
            throw new IllegalArgumentException("Address can only be updated for orders in PENDING status.");
        }

        order.setAddress(newAddress);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepo.save(order);
    }

    public Order cancelOrder(Long orderId, String reason) {
        Order order = getOrderById(orderId);
        String currentStatus = defaultStatus(order.getStatus());
        if (!Set.of("PENDING", "CONFIRMED", "PACKED").contains(currentStatus)) {
            throw new IllegalArgumentException("Orders can only be cancelled before they are shipped.");
        }

        boolean paidOnline = "PAID".equalsIgnoreCase(order.getPaymentStatus())
                && !"COD".equalsIgnoreCase(defaultString(order.getPaymentMethod()));
        order.setStatus(paidOnline ? "CANCELLATION_REQUESTED" : "CANCELLED");
        order.setRefundStatus(paidOnline ? "REQUESTED" : "NOT_REQUIRED");
        order.setCancellationReason(defaultString(reason).isBlank() ? "Customer requested cancellation" : reason.trim());
        order.setCancelledAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                productRepo.findById(Math.toIntExact(item.getProductId())).ifPresent(product -> {
                    product.setQuantity(product.getQuantity() + item.getQuantity());
                    if (!product.isAvailable() && product.getQuantity() > 0) {
                        product.setAvailable(true);
                    }
                    productRepo.save(product);
                });
            }
        }

        Order savedOrder = orderRepo.save(order);
        userRepository.findById(savedOrder.getUserId()).ifPresent(user -> {
            emailService.sendCancellationEmail(user.getEmail(), savedOrder);
            smsService.sendSms(user.getPhoneNumber(), "Shrinath Cycle Store: cancellation update for "
                    + getProductNames(savedOrder) + " is " + savedOrder.getStatus() + ".");
        });
        return savedOrder;
    }

    public Order cancelOrder(Long orderId) {
        return cancelOrder(orderId, null);
    }

    public Order processRefund(Long orderId, Double amount, String speed) {
        Order order = getOrderById(orderId);
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new IllegalArgumentException("Only paid orders can be refunded.");
        }

        RazorpayRefundService.RefundResult refund = razorpayRefundService.refund(order, amount, speed);
        order.setRefundId(refund.refundId());
        order.setRefundStatus(refund.status());
        order.setRefundAmount(refund.amount());
        order.setPaymentStatus("REFUNDED");
        order.setStatus("CANCELLED");
        order.setRefundedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        Order savedOrder = orderRepo.save(order);
        userRepository.findById(savedOrder.getUserId()).ifPresent(user -> {
            emailService.sendRefundEmail(user.getEmail(), savedOrder);
            smsService.sendSms(user.getPhoneNumber(), "Shrinath Cycle Store: refund processed for "
                    + getProductNames(savedOrder) + ". Refund ID: " + savedOrder.getRefundId());
        });
        return savedOrder;
    }

    public ReturnExchangeRequest createReturnExchangeRequest(Long orderId, Long userId, ReturnExchangeRequestDto request) {
        Order order = getOrderById(orderId);
        if (!userId.equals(order.getUserId())) {
            throw new IllegalArgumentException("You can only request return/exchange for your own order.");
        }
        if (!"DELIVERED".equals(defaultStatus(order.getStatus()))) {
            throw new IllegalArgumentException("Return or exchange can only be requested after delivery.");
        }
        if (request == null || defaultString(request.getReason()).isBlank()) {
            throw new IllegalArgumentException("A reason is required.");
        }

        ReturnExchangeRequest entity = new ReturnExchangeRequest();
        entity.setOrderId(orderId);
        entity.setUserId(userId);
        entity.setRequestType(normalizeRequestType(request.getRequestType()));
        entity.setReason(request.getReason().trim());
        entity.setPreferredResolution(defaultString(request.getPreferredResolution()));
        ReturnExchangeRequest savedRequest = returnExchangeRequestRepository.save(entity);

        userRepository.findById(userId).ifPresent(user -> {
            emailService.sendReturnExchangeEmail(user.getEmail(), order, savedRequest.getRequestType(), savedRequest.getStatus());
            smsService.sendSms(user.getPhoneNumber(), "Shrinath Cycle Store: " + savedRequest.getRequestType()
                    + " request received for " + getProductNames(order) + ".");
        });
        return savedRequest;
    }

    public List<ReturnExchangeRequest> getAllReturnExchangeRequests() {
        return returnExchangeRequestRepository.findAllByOrderByRequestedAtDesc();
    }

    public ReturnExchangeRequest updateReturnExchangeStatus(Long requestId, ReturnExchangeStatusUpdateRequest request) {
        ReturnExchangeRequest entity = returnExchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Return/exchange request not found."));
        String status = normalizeReturnExchangeStatus(request == null ? null : request.getStatus());
        entity.setStatus(status);
        entity.setAdminNote(request == null ? "" : defaultString(request.getAdminNote()));
        entity.setUpdatedAt(LocalDateTime.now());
        ReturnExchangeRequest savedRequest = returnExchangeRequestRepository.save(entity);

        if ("APPROVED".equals(status)) {
            Order order = getOrderById(savedRequest.getOrderId());
            order.setStatus("RETURN_REQUESTED");
            order.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(order);
        }

        userRepository.findById(savedRequest.getUserId()).ifPresent(user -> {
            Order order = getOrderById(savedRequest.getOrderId());
            emailService.sendReturnExchangeEmail(user.getEmail(), order,
                    savedRequest.getRequestType(), savedRequest.getStatus());
            smsService.sendSms(user.getPhoneNumber(), "Shrinath Cycle Store: " + savedRequest.getRequestType()
                    + " request for " + getProductNames(order) + " is " + savedRequest.getStatus() + ".");
        });
        return savedRequest;
    }

    public AdminAnalyticsResponse getAdminAnalytics() {
        List<Order> orders = orderRepo.findAll();
        long totalOrders = orders.size();
        long cancelledOrders = countByStatus(orders, "CANCELLED") + countByStatus(orders, "CANCELLATION_REQUESTED");
        long returnedOrders = countByStatus(orders, "RETURNED") + countByStatus(orders, "RETURN_REQUESTED");
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

    public Order markPaymentInitiated(Long orderId, String gatewayOrderId) {
        Order order = getOrderById(orderId);
        order.setPaymentGatewayOrderId(gatewayOrderId);
        order.setPaymentStatus("PENDING");
        order.setStatus("PENDING_PAYMENT");
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepo.save(order);
    }

    public Order markPaymentConfirmed(Long orderId, String paymentId) {
        Order order = getOrderById(orderId);
        order.setPaymentId(paymentId);
        order.setPaymentStatus("PAID");
        order.setSignatureVerified(true);
        order.setStatus("PENDING");
        order.setPaidAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        Order savedOrder = orderRepo.save(order);
        userRepository.findById(savedOrder.getUserId()).ifPresent(user -> notifyOrderConfirmation(user, savedOrder));
        return savedOrder;
    }

    private long countByStatus(List<Order> orders, String status) {
        return orders.stream()
                .filter(order -> status.equalsIgnoreCase(defaultStatus(order.getStatus())))
                .count();
    }

    private String normalizeStatus(String status) {
        String normalized = defaultStatus(status);
        Set<String> allowedStatuses = Set.of(
                "PENDING",
                "CONFIRMED",
                "PACKED",
                "SHIPPED",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLATION_REQUESTED",
                "CANCELLED",
                "RETURN_REQUESTED",
                "RETURNED",
                "EXCHANGED"
        );
        if (!allowedStatuses.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported status. Use PENDING, CONFIRMED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED or EXCHANGED.");
        }
        return normalized;
    }

    private String defaultStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if ("PLACED".equals(normalized)) {
            return "PENDING";
        }
        if ("PROCESSING".equals(normalized)) {
            return "CONFIRMED";
        }
        return normalized;
    }

    private boolean isRevenueStatus(String status) {
        String normalizedStatus = defaultStatus(status);
        return !"CANCELLED".equals(normalizedStatus)
                && !"CANCELLATION_REQUESTED".equals(normalizedStatus)
                && !"RETURN_REQUESTED".equals(normalizedStatus)
                && !"RETURNED".equals(normalizedStatus)
                && !"PENDING_PAYMENT".equals(normalizedStatus);
    }

    private String normalizeRequestType(String requestType) {
        String normalized = defaultString(requestType).toUpperCase(Locale.ROOT);
        if (!Set.of("RETURN", "EXCHANGE").contains(normalized)) {
            throw new IllegalArgumentException("Request type must be RETURN or EXCHANGE.");
        }
        return normalized;
    }

    private String normalizeReturnExchangeStatus(String status) {
        String normalized = defaultString(status).toUpperCase(Locale.ROOT);
        Set<String> allowedStatuses = Set.of("REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "COMPLETED");
        if (!allowedStatuses.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported return/exchange status.");
        }
        return normalized;
    }

    private BigDecimal calculateDeliveryCharges(BigDecimal subtotal, String deliveryOption) {
        if ("express".equalsIgnoreCase(defaultString(deliveryOption))) {
            return EXPRESS_DELIVERY_CHARGE;
        }
        if (subtotal.compareTo(BigDecimal.ZERO) == 0 || subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0) {
            return BigDecimal.ZERO;
        }
        return STANDARD_DELIVERY_CHARGE;
    }

    private String normalizeDeliveryOption(String deliveryOption) {
        return "express".equalsIgnoreCase(defaultString(deliveryOption)) ? "express" : "standard";
    }

    private CouponResult calculateCouponDiscount(BigDecimal subtotal, String couponCode) {
        String normalizedCode = defaultString(couponCode).toUpperCase(Locale.ROOT);
        if (!"RIDE10".equals(normalizedCode) || subtotal.compareTo(BigDecimal.valueOf(1000)) < 0) {
            return new CouponResult(BigDecimal.ZERO, "");
        }
        return new CouponResult(subtotal.multiply(RIDE10_DISCOUNT_RATE).setScale(2, RoundingMode.HALF_UP), normalizedCode);
    }

    private String defaultString(String value) {
        return value == null ? "" : value.trim();
    }

    private void notifyOrderConfirmation(User user, Order order) {
        String productNames = getProductNames(order);
        String orderIdStr   = String.valueOf(order.getId());

        // Email
        emailService.sendOrderConfirmationEmail(user.getEmail(), order);
        emailService.sendNewOrderAdminNotification(adminEmail, order);

        // SMS to customer (Fast2SMS primary → Twilio fallback)
        smsService.sendOrderConfirmationSms(user.getPhoneNumber(), productNames, orderIdStr);

        // WhatsApp to admin (CallMeBot free → Twilio sandbox fallback)
        String waMsg = "🛒 *New Order #" + orderIdStr + "*\n"
                + "Customer: " + user.getName() + "\n"
                + "Items: " + productNames + "\n"
                + "Amount: \u20B9" + order.getTotalAmount() + "\n"
                + "Payment: " + order.getPaymentMethod() + " (" + order.getPaymentStatus() + ")";
        whatsAppService.sendAdminWhatsApp(waMsg);
    }

    private void notifyStatusUpdate(User user, Order order, String normalizedStatus) {
        emailService.sendShippingUpdateEmail(user.getEmail(), order, normalizedStatus);

        // Use dedicated dispatch SMS for SHIPPED with AWB details
        if ("SHIPPED".equals(normalizedStatus)) {
            smsService.sendDispatchSms(
                    user.getPhoneNumber(),
                    getProductNames(order),
                    order.getAwbNumber(),
                    order.getCourierName(),
                    order.getTrackingUrl()
            );
        } else {
            String awbInfo = (order.getAwbNumber() != null && !order.getAwbNumber().isBlank())
                    ? " AWB: " + order.getAwbNumber() + "." : ".";
            smsService.sendSms(user.getPhoneNumber(),
                    "Shrinath Cycle Store: order for " + getProductNames(order)
                    + " is now " + normalizedStatus + awbInfo);
        }
    }

    private String getProductNames(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return "items";
        }
        return order.getItems().stream()
                .map(OrderItem::getName)
                .collect(Collectors.joining(", "));
    }

    private record CouponResult(BigDecimal discountAmount, String appliedCode) {
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
                new MetricPoint("Pending", counts.getOrDefault("PENDING", 0L)),
                new MetricPoint("Confirmed", counts.getOrDefault("CONFIRMED", 0L)),
                new MetricPoint("Packed", counts.getOrDefault("PACKED", 0L)),
                new MetricPoint("Shipped", counts.getOrDefault("SHIPPED", 0L)),
                new MetricPoint("Out for Delivery", counts.getOrDefault("OUT_FOR_DELIVERY", 0L)),
                new MetricPoint("Delivered", counts.getOrDefault("DELIVERED", 0L)),
                new MetricPoint("Cancelled", counts.getOrDefault("CANCELLED", 0L) + counts.getOrDefault("CANCELLATION_REQUESTED", 0L)),
                new MetricPoint("Returned", counts.getOrDefault("RETURNED", 0L) + counts.getOrDefault("RETURN_REQUESTED", 0L))
        );
    }
}
