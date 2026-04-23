package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.ReviewRequest;
import GuptaCycle.org.Shrinath.DTO.ReviewResponse;
import GuptaCycle.org.Shrinath.Service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @GetMapping("/product/{productId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getProductReviews(@PathVariable Integer productId) {
        return ResponseEntity.ok(reviewService.getReviewsForProduct(productId));
    }

    @PostMapping("/product/{productId}/reviews")
    public ResponseEntity<?> submitReview(@PathVariable Integer productId, @RequestBody ReviewRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(reviewService.upsertReview(productId, request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
