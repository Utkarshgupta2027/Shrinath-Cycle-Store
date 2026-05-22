package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.ReviewRequest;
import GuptaCycle.org.Shrinath.DTO.ReviewResponse;
import GuptaCycle.org.Shrinath.Model.Review;
import GuptaCycle.org.Shrinath.Service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ObjectMapper objectMapper;

    // ── Public endpoints ──────────────────────────────────────────────────────

    /** GET /api/product/{productId}/reviews?sortBy=NEWEST|MOST_HELPFUL */
    @GetMapping("/product/{productId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getProductReviews(
            @PathVariable Integer productId,
            @RequestParam(value = "sortBy", defaultValue = "NEWEST") String sortBy) {
        return ResponseEntity.ok(reviewService.getApprovedReviewsForProduct(productId, sortBy));
    }

    /** GET /api/review/{id}/photo — serve review photo bytes */
    @GetMapping("/review/{id}/photo")
    public ResponseEntity<byte[]> getReviewPhoto(@PathVariable Long id) {
        Review review = reviewService.getReviewEntity(id);
        if (review.getPhotoData() == null || review.getPhotoData().length == 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header("Content-Type", review.getPhotoType() != null ? review.getPhotoType() : "image/jpeg")
                .body(review.getPhotoData());
    }

    // ── Authenticated user endpoints ──────────────────────────────────────────

    /**
     * POST /api/product/{productId}/reviews
     * Accepts multipart/form-data:
     *   - "review"  : JSON ReviewRequest (userId, rating, comment)
     *   - "photo"   : optional image file
     */
    @PostMapping(value = "/product/{productId}/reviews", consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<?> submitReview(
            @PathVariable Integer productId,
            @RequestPart(value = "review") String reviewJson,
            @RequestPart(value = "photo", required = false) MultipartFile photo) {
        try {
            ReviewRequest request = objectMapper.readValue(reviewJson, ReviewRequest.class);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(reviewService.upsertReview(productId, request, photo));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
        }
    }

    /** POST /api/review/{id}/helpful — vote a review helpful */
    @PostMapping("/review/{id}/helpful")
    public ResponseEntity<ReviewResponse> voteHelpful(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reviewService.voteHelpful(id));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    /** GET /api/admin/reviews/pending — list all pending reviews for moderation */
    @GetMapping("/admin/reviews/pending")
    public ResponseEntity<List<ReviewResponse>> getPendingReviews() {
        return ResponseEntity.ok(reviewService.getPendingReviews());
    }

    /**
     * PUT /api/admin/reviews/{id}/moderate
     * Body: { "action": "APPROVE" | "REJECT" }
     */
    @PutMapping("/admin/reviews/{id}/moderate")
    public ResponseEntity<?> moderateReview(@PathVariable Long id,
                                            @RequestBody Map<String, String> body) {
        try {
            String action = body.getOrDefault("action", "");
            return ResponseEntity.ok(reviewService.moderateReview(id, action));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
