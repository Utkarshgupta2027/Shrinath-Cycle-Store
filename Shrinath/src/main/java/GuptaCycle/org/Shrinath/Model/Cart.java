package GuptaCycle.org.Shrinath.Model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cart")
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)

    private List<CartItem> items = new ArrayList<>();

    /* ================= GETTERS & SETTERS ================= */

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    // ✅ THIS WAS MISSING
    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<CartItem> getItems() {
        return items;
    }

    public void setItems(List<CartItem> items) {
        this.items = items;
    }
}
