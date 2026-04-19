package GuptaCycle.org.Shrinath.Model;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {

    private Long userId;
    private double totalAmount;
    private String address;
    private List<OrderItemRequest> items;
}
