package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Order;
import GuptaCycle.org.Shrinath.Model.Payment;
import GuptaCycle.org.Shrinath.Repository.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class RazorpayRefundService {

    @Value("${payment.gateway.key-id}")
    private String keyId;

    @Value("${payment.gateway.secret}")
    private String gatewaySecret;

    @Autowired
    private PaymentRepository paymentRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public RefundResult refund(Order order, Double requestedAmount, String speed) {
        if (order == null || order.getId() == null) {
            throw new IllegalArgumentException("A valid order is required for refund.");
        }

        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found for this order."));

        double amount = requestedAmount == null || requestedAmount <= 0 ? order.getTotalAmount() : requestedAmount;
        if (amount > order.getTotalAmount()) {
            throw new IllegalArgumentException("Refund amount cannot exceed the order total.");
        }

        String refundSpeed = normalizeSpeed(speed);
        if (isBlank(keyId) || isBlank(gatewaySecret) || isBlank(payment.getPaymentId())
                || payment.getPaymentId().startsWith("pay_demo_")) {
            return saveRefund(payment, "rfnd_demo_" + UUID.randomUUID().toString().replace("-", ""),
                    "DEMO_REFUNDED", amount);
        }

        try {
            String body = objectMapper.writeValueAsString(new RefundPayload(
                    rupeesToPaise(amount),
                    refundSpeed,
                    "refund_order_" + order.getId()
            ));

            String auth = Base64.getEncoder()
                    .encodeToString((keyId + ":" + gatewaySecret).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/payments/" + payment.getPaymentId() + "/refund"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalArgumentException("Razorpay refund failed: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String refundId = root.path("id").asText("");
            String refundStatus = root.path("status").asText("pending").toUpperCase(Locale.ROOT);
            return saveRefund(payment, refundId, refundStatus, amount);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Could not process Razorpay refund.", ex);
        }
    }

    private RefundResult saveRefund(Payment payment, String refundId, String refundStatus, double amount) {
        payment.setRefundId(refundId);
        payment.setRefundStatus(refundStatus);
        payment.setRefundAmount(amount);
        payment.setStatus("REFUNDED");
        payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);
        return new RefundResult(refundId, refundStatus, amount);
    }

    private int rupeesToPaise(double amount) {
        return BigDecimal.valueOf(amount).multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValueExact();
    }

    private String normalizeSpeed(String speed) {
        return "optimum".equalsIgnoreCase(speed) ? "optimum" : "normal";
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record RefundPayload(int amount, String speed, String receipt) {
    }

    public record RefundResult(String refundId, String status, double amount) {
    }
}
