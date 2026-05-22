package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.StoreSettings;
import GuptaCycle.org.Shrinath.Service.StoreSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Feature 13 — Admin can view and update GSTIN, store details, and GST rates.
 * GET  /api/admin/settings        → get current settings
 * PUT  /api/admin/settings        → update settings
 * GET  /api/settings              → public read (storeName, address — for display only)
 */
@RestController
public class StoreSettingsController {

    @Autowired
    private StoreSettingsService settingsService;

    /** Public: anyone can read basic store info (needed for footer/display) */
    @GetMapping("/api/settings")
    public ResponseEntity<StoreSettings> getPublicSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    /** Admin: read full settings including GSTIN */
    @GetMapping("/api/admin/settings")
    public ResponseEntity<StoreSettings> getAdminSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    /** Admin: update settings (GSTIN, GST rates, store details) */
    @PutMapping("/api/admin/settings")
    public ResponseEntity<StoreSettings> updateSettings(@RequestBody StoreSettings settings) {
        return ResponseEntity.ok(settingsService.updateSettings(settings));
    }
}
