package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Singleton-style admin-configurable settings: GSTIN, store info, and GST rates.
 * Only one row is used (id = 1). Admin can update via API.
 */
@Entity
@Table(name = "store_settings")
@Data
public class StoreSettings {

    @Id
    private Long id = 1L;

    /** Your GST Identification Number — format: 22AAAAA0000A1Z5 */
    @Column(nullable = false)
    private String gstin = "07AABCS1429B1Z6"; // placeholder — update via admin panel

    /** Store name printed on invoice */
    @Column(nullable = false)
    private String storeName = "Shreenath Cycle Store";

    /** Store address printed on invoice */
    @Column(columnDefinition = "TEXT")
    private String storeAddress = "Dhanush Chauraha Karwi, Chitrakoot, Uttar Pradesh - 210205";

    /** Contact phone printed on invoice */
    private String storePhone = "+91 70520 50415";

    /** Contact email printed on invoice */
    private String storeEmail = "gutkarsh702@gmail.com";

    /** GST rate (as decimal) for COMPLETE CYCLES — default 12% per Indian GST rules */
    @Column(nullable = false)
    private double gstRateCycles = 0.12;

    /** GST rate (as decimal) for PARTS, ACCESSORIES, TOOLS — default 18% */
    @Column(nullable = false)
    private double gstRateParts = 0.18;
}
