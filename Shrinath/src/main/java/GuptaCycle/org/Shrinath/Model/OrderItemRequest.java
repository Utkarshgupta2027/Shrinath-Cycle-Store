package GuptaCycle.org.Shrinath.Model;

import lombok.Data;

@Data
public class OrderItemRequest {

    private Long productId;
    private String name;
    private double price;
    private int quantity;
}
