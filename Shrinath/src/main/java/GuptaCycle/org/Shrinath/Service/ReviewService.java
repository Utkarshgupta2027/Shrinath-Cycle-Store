package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.ReviewRequest;
import GuptaCycle.org.Shrinath.DTO.ReviewResponse;
import GuptaCycle.org.Shrinath.Model.Product;
import GuptaCycle.org.Shrinath.Model.Review;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.ProductRepo;
import GuptaCycle.org.Shrinath.Repository.ReviewRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ProductRepo productRepo;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsForProduct(Integer productId) {
        return reviewRepository.findByProductIdOrderByUpdatedAtDesc(productId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ReviewResponse upsertReview(Integer productId, ReviewRequest request) {
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

        Review review = reviewRepository.findByProductIdAndUserId(productId, request.getUserId())
                .orElseGet(Review::new);

        review.setProduct(product);
        review.setUser(user);
        review.setRating(request.getRating());
        review.setComment(comment);

        return toResponse(reviewRepository.save(review));
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
