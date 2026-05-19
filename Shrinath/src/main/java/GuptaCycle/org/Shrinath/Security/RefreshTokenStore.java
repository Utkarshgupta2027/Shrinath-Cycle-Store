package GuptaCycle.org.Shrinath.Security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory refresh token store.
 *
 * Maps  phoneNumber → refreshToken (one active token per user).
 * Upgrade path: replace with a DB-backed table for horizontal scaling.
 */
@Component
public class RefreshTokenStore {

    // phoneNumber → refreshToken
    private final Map<String, String> store = new ConcurrentHashMap<>();

    /**
     * Save (or overwrite) the refresh token for a user.
     */
    public void save(String phoneNumber, String refreshToken) {
        store.put(normalize(phoneNumber), refreshToken);
    }

    /**
     * Returns true only when the supplied token exactly matches the stored one.
     */
    public boolean isValid(String phoneNumber, String refreshToken) {
        String stored = store.get(normalize(phoneNumber));
        return stored != null && stored.equals(refreshToken);
    }

    /**
     * Invalidate (logout) the token for a user.
     */
    public void invalidate(String phoneNumber) {
        store.remove(normalize(phoneNumber));
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim();
    }
}
