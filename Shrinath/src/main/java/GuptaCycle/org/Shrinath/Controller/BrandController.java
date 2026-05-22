package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.Brand;
import GuptaCycle.org.Shrinath.Service.BrandService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feature 14 — Brand management.
 * Public:
 *   GET /api/brands           → all active brands
 *   GET /api/brands/featured  → featured brands for homepage
 * Admin:
 *   POST   /api/admin/brands
 *   PUT    /api/admin/brands/{id}
 *   DELETE /api/admin/brands/{id}
 */
@RestController
public class BrandController {

    @Autowired
    private BrandService brandService;

    @GetMapping("/api/brands")
    public ResponseEntity<List<Brand>> getActive() {
        return ResponseEntity.ok(brandService.getAllActive());
    }

    @GetMapping("/api/brands/featured")
    public ResponseEntity<List<Brand>> getFeatured() {
        return ResponseEntity.ok(brandService.getFeatured());
    }

    @GetMapping("/api/brands/all")
    public ResponseEntity<List<Brand>> getAll() {
        return ResponseEntity.ok(brandService.getAll());
    }

    @PostMapping("/api/admin/brands")
    public ResponseEntity<?> create(@RequestBody Brand brand) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(brandService.create(brand));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/api/admin/brands/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Brand brand) {
        try {
            return ResponseEntity.ok(brandService.update(id, brand));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/api/admin/brands/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            brandService.delete(id);
            return ResponseEntity.ok("Brand deleted.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
