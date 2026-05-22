package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Feature 14 — Brand entity for brand management and featured brands section.
 */
@Entity
@Table(name = "brands")
@Data
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** URL of the brand logo (external URL or stored separately) */
    private String logoUrl;

    /** Show in the Featured Brands section on homepage */
    @Column(nullable = false)
    private boolean featured = false;

    @Column(nullable = false)
    private boolean active = true;

    /** Display order in featured section */
    @Column(nullable = false)
    private int displayOrder = 0;
}
