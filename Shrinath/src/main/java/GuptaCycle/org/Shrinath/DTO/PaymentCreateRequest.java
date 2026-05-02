package GuptaCycle.org.Shrinath.DTO;

import GuptaCycle.org.Shrinath.Model.OrderRequest;
import lombok.Data;

@Data
public class PaymentCreateRequest {
    private OrderRequest order;
}
