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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
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
        String gatewayOrderId = "order_" + UUID.randomUUID().toString().replace("-", "");
        orderService.markPaymentInitiated(order.getId(), gatewayOrderId);

        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setUserId(order.getUserId());
        payment.setGateway(gateway);
        payment.setGatewayOrderId(gatewayOrderId);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus("CREATED");
        Payment savedPayment = paymentRepository.save(payment);

        String demoPaymentId = "pay_demo_" + UUID.randomUUID().toString().replace("-", "");
        String demoSignature = sign(gatewayOrderId + "|" + demoPaymentId);

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
