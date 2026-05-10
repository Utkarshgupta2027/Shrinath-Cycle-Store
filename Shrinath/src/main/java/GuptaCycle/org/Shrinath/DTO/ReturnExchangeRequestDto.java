package GuptaCycle.org.Shrinath.DTO;

import lombok.Data;

@Data
public class ReturnExchangeRequestDto {
    private String requestType;
    private String reason;
    private String preferredResolution;
}
