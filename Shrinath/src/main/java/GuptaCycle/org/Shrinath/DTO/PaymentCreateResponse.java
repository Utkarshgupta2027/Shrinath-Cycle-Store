package GuptaCycle.org.Shrinath.DTO;

import GuptaCycle.org.Shrinath.Model.Order;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentCreateResponse {
    private Long orderId;
    private Long paymentRecordId;
    private String gateway;
    private String gatewayOrderId;
    private String keyId;
    private double amount;
    private String currency;
    private Order order;
    private String demoPaymentId;
    private String demoSignature;
}
