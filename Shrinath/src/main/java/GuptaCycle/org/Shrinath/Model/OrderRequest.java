package GuptaCycle.org.Shrinath.Model;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {

    private Long userId;
    private double totalAmount;
    private String address;
    private String couponCode;
    private String deliveryOption;
    private String paymentMethod;
    private List<OrderItemRequest> items;
}
