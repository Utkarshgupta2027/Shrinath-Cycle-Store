package GuptaCycle.org.Shrinath.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 100)
    private String subject;

    // GENERAL | PRODUCT | ORDER | SUGGESTION | COMPLAINT | OTHER
    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // 1-5 optional rating
    @Column
    private Integer rating;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @PrePersist
    public void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
