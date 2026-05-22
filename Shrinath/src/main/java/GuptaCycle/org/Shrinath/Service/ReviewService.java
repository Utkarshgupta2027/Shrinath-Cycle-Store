package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.ReviewRequest;
import GuptaCycle.org.Shrinath.DTO.ReviewResponse;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.Review;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.OrderRepository;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.ReviewRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ProductRepo productRepo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    // ── Public ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getApprovedReviewsForProduct(Integer productId, String sortBy) {
        List<Review> reviews;
        if ("MOST_HELPFUL".equalsIgnoreCase(sortBy)) {
            reviews = reviewRepository.findByProductIdAndStatusOrderByHelpfulVotesDesc(productId, "APPROVED");
        } else {
            // default: NEWEST
            reviews = reviewRepository.findByProductIdAndStatusOrderByUpdatedAtDesc(productId, "APPROVED");
        }
        return reviews.stream().map(this::toResponse).toList();
    }

    // ── Submit / Update ───────────────────────────────────────────────────────

    @Transactional
    public ReviewResponse upsertReview(Integer productId, ReviewRequest request, MultipartFile photo) throws IOException {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User is required to submit a review.");
        }
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }
        String comment = request.getComment() == null ? "" : request.getComment().trim();
        if (comment.length() < 5) {
            throw new IllegalArgumentException("Review comment must be at least 5 characters long.");
        }

        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found."));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        // Check verified purchase (DELIVERED order containing this product)
        boolean verified = orderRepository.existsByUserIdAndDeliveredProductId(
                request.getUserId(), productId.longValue());

        Review review = reviewRepository.findByProductIdAndUserId(productId, request.getUserId())
                .orElseGet(Review::new);

        review.setProduct(product);
        review.setUser(user);
        review.setRating(request.getRating());
        review.setComment(comment);
        review.setVerifiedPurchase(verified);
        // New submissions start as PENDING; updates to existing keep their current status
        if (review.getId() == null) {
            review.setStatus("PENDING");
        }

        // Attach photo if provided
        if (photo != null && !photo.isEmpty()) {
            review.setPhotoData(photo.getBytes());
            review.setPhotoType(photo.getContentType());
        }

        return toResponse(reviewRepository.save(review));
    }

    // ── Photo ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Review getReviewEntity(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found."));
    }

    // ── Helpful vote ──────────────────────────────────────────────────────────

    @Transactional
    public ReviewResponse voteHelpful(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found."));
        review.setHelpfulVotes(review.getHelpfulVotes() + 1);
        return toResponse(reviewRepository.save(review));
    }

    // ── Admin moderation ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReviewResponse> getPendingReviews() {
        return reviewRepository.findByStatusOrderByCreatedAtAsc("PENDING")
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ReviewResponse moderateReview(Long reviewId, String action) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found."));
        String newStatus = switch (action.toUpperCase()) {
            case "APPROVE" -> "APPROVED";
            case "REJECT"  -> "REJECTED";
            default -> throw new IllegalArgumentException("Action must be APPROVE or REJECT.");
        };
        review.setStatus(newStatus);
        return toResponse(reviewRepository.save(review));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getName(),
                review.getRating(),
                review.getComment(),
                review.getStatus(),
                review.isVerifiedPurchase(),
                review.getHelpfulVotes(),
                review.getPhotoData() != null && review.getPhotoData().length > 0,
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
