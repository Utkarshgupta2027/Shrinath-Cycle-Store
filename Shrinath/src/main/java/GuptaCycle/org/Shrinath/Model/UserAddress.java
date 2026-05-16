package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "user_addresses")
public class UserAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String label;           // e.g. "Home", "Office"
    private String name;            // Receiver name
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String line1;

    private String city;
    private String state;
    private String pincode;

    private boolean isDefault = false;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
