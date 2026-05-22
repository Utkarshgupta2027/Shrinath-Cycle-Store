package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

/**
 * Feature 14 — Hierarchical category (e.g. Cycles > Mountain Bikes > 21-Speed).
 * A null parentCategory means it is a top-level category.
 */
@Entity
@Table(name = "categories")
@Data
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Self-referencing FK for hierarchy */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parentCategory;

    /** Children — loaded lazily on demand */
    @OneToMany(mappedBy = "parentCategory", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Category> children;

    /** Show in "Featured Categories" section */
    @Column(nullable = false)
    private boolean featured = false;

    /** For controlling display order in listings */
    @Column(nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false)
    private boolean active = true;
}
