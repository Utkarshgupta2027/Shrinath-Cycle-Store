package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class PaymentVerifyRequest {
    private Long orderId;
    private String gatewayOrderId;
    private String paymentId;
    private String signature;
}
