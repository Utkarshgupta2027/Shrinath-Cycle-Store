package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
}
