package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.PaymentCreateRequest;
import GuptaCycle.org.Shrinath.DTO.PaymentCreateResponse;
import GuptaCycle.org.Shrinath.DTO.PaymentVerifyRequest;
import GuptaCycle.org.Shrinath.Model.Order;
import GuptaCycle.org.Shrinath.Model.Payment;
import GuptaCycle.org.Shrinath.Repository.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    @Value("${payment.gateway}")
    private String gateway;

    @Value("${payment.gateway.key-id}")
    private String keyId;

    @Value("${payment.gateway.secret}")
    private String gatewaySecret;

    @Autowired
    private OrderService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private PaymentRepository paymentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentCreateResponse createPayment(PaymentCreateRequest request) {
        if (request == null || request.getOrder() == null) {
            throw new IllegalArgumentException("Order details are required to create a payment.");
        }

        Order order = orderService.saveOrder(request.getOrder(), false);
        
        String gatewayOrderId;
        boolean isDemo = isBlank(keyId) || keyId.startsWith("change_this") || isBlank(gatewaySecret) || gatewaySecret.startsWith("change_this");
        
        if (isDemo) {
            gatewayOrderId = "order_demo_" + UUID.randomUUID().toString().replace("-", "");
        } else {
            gatewayOrderId = createRealRazorpayOrder("receipt_" + order.getId(), order.getTotalAmount());
        }
        
        orderService.markPaymentInitiated(order.getId(), gatewayOrderId);

        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setUserId(order.getUserId());
        payment.setGateway(gateway);
        payment.setGatewayOrderId(gatewayOrderId);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus("CREATED");
        Payment savedPayment = paymentRepository.save(payment);

        String demoPaymentId = isDemo ? "pay_demo_" + UUID.randomUUID().toString().replace("-", "") : null;
        String demoSignature = isDemo ? sign(gatewayOrderId + "|" + demoPaymentId) : null;

        return new PaymentCreateResponse(
                order.getId(),
                savedPayment.getId(),
                gateway,
                gatewayOrderId,
                keyId,
                order.getTotalAmount(),
                "INR",
                order,
                demoPaymentId,
                demoSignature
        );
    }

    private String createRealRazorpayOrder(String receipt, double amountInRupees) {
        try {
            long amountInPaise = Math.round(amountInRupees * 100);
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("amount", amountInPaise);
            bodyMap.put("currency", "INR");
            bodyMap.put("receipt", receipt);

            String requestBody = objectMapper.writeValueAsString(bodyMap);
            HttpClient client = HttpClient.newHttpClient();
            String auth = Base64.getEncoder().encodeToString((keyId + ":" + gatewaySecret).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Basic " + auth)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200 && response.statusCode() != 201) {
                throw new IllegalStateException("Razorpay order creation failed: Status " + response.statusCode() + " - " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("id").asText();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to contact Razorpay API: " + e.getMessage(), e);
        }
    }

    public Order verifyPayment(PaymentVerifyRequest request) {
        if (request == null || request.getOrderId() == null || isBlank(request.getGatewayOrderId())
                || isBlank(request.getPaymentId()) || isBlank(request.getSignature())) {
            throw new IllegalArgumentException("Payment verification details are required.");
        }

        Payment payment = paymentRepository.findByGatewayOrderId(request.getGatewayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found."));

        if (!payment.getOrderId().equals(request.getOrderId())) {
            throw new IllegalArgumentException("Payment does not belong to this order.");
        }

        String expectedSignature = sign(request.getGatewayOrderId() + "|" + request.getPaymentId());
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                request.getSignature().getBytes(StandardCharsets.UTF_8))) {
            payment.setStatus("FAILED_SIGNATURE");
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Payment signature verification failed.");
        }

        payment.setPaymentId(request.getPaymentId());
        payment.setSignatureVerified(true);
        payment.setStatus("PAID");
        payment.setVerifiedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Order order = orderService.markPaymentConfirmed(request.getOrderId(), request.getPaymentId());
        cartService.clearCart(order.getUserId());
        return order;
    }

    public void handleWebhook(String payload, String signature) {
        if (isBlank(payload) || isBlank(signature)) {
            throw new IllegalArgumentException("Webhook payload and signature are required.");
        }

        String expectedSignature = sign(payload);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Webhook signature verification failed.");
        }

        try {
            JsonNode root = objectMapper.readTree(payload);
            String event = root.path("event").asText("");
            if (!"payment.captured".equals(event) && !"payment.authorized".equals(event)) {
                return;
            }

            JsonNode paymentEntity = root.path("payload").path("payment").path("entity");
            String gatewayOrderId = paymentEntity.path("order_id").asText("");
            String paymentId = paymentEntity.path("id").asText("");
            if (isBlank(gatewayOrderId) || isBlank(paymentId)) {
                throw new IllegalArgumentException("Webhook payment details are incomplete.");
            }

            Payment payment = paymentRepository.findByGatewayOrderId(gatewayOrderId)
                    .orElseThrow(() -> new IllegalArgumentException("Payment record not found."));
            payment.setPaymentId(paymentId);
            payment.setSignatureVerified(true);
            payment.setStatus("PAID");
            payment.setVerifiedAt(LocalDateTime.now());
            paymentRepository.save(payment);
            orderService.markPaymentConfirmed(payment.getOrderId(), paymentId);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Could not process webhook payload.", ex);
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(gatewaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not sign payment payload.", ex);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
