package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class RefundRequest {
    private Double amount;
    private String speed = "normal";
}
