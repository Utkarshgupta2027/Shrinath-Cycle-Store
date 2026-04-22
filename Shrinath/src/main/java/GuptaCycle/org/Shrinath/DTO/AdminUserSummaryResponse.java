package GuptaCycle.org.Shrinath.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminUserSummaryResponse {
    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private boolean verified;
    private String role;
}
