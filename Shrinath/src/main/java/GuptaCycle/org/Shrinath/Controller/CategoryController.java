package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.Model.Category;
import GuptaCycle.org.Shrinath.Service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feature 14 — Category management.
 * Public:
 *   GET /api/categories            → all active categories
 *   GET /api/categories/featured   → featured categories (homepage)
 *   GET /api/categories/all        → all (including inactive) — admin use
 * Admin:
 *   POST   /api/admin/categories
 *   PUT    /api/admin/categories/{id}
 *   DELETE /api/admin/categories/{id}
 */
@RestController
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping("/api/categories")
    public ResponseEntity<List<Category>> getActive() {
        return ResponseEntity.ok(categoryService.getAllActive());
    }

    @GetMapping("/api/categories/featured")
    public ResponseEntity<List<Category>> getFeatured() {
        return ResponseEntity.ok(categoryService.getFeatured());
    }

    @GetMapping("/api/categories/all")
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryService.getAll());
    }

    @PostMapping("/api/admin/categories")
    public ResponseEntity<?> create(@RequestBody Category category) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(category));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/api/admin/categories/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Category category) {
        try {
            return ResponseEntity.ok(categoryService.update(id, category));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/api/admin/categories/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            categoryService.delete(id);
            return ResponseEntity.ok("Category deleted.");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
