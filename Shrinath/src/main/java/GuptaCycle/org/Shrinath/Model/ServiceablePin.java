package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "serviceable_pins")
public class ServiceablePin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 6)
    private String pincode;

    private String city;
    private String state;

    // Weight-based per-km pricing (Rs per kg per 100km)
    private double baseCharge = 40.0;    // flat base charge in Rs
    private double perKgCharge = 10.0;   // Rs per kg above 1 kg

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
