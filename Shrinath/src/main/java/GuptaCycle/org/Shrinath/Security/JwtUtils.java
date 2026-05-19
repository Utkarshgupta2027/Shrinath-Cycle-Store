package GuptaCycle.org.Shrinath.Security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

/**
 * JWT utility for generating and validating access tokens and refresh tokens.
 *
 * Access token  — short-lived (default 24 h), used for API calls.
 * Refresh token — long-lived  (default 7 d),  used to obtain a new access token.
 *
 * The two token types are distinguished by a "type" claim:
 *   access  → type = "ACCESS"
 *   refresh → type = "REFRESH"
 */
@Component
public class JwtUtils {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long jwtRefreshExpirationMs;

    private static final String CLAIM_TYPE  = "type";
    private static final String TYPE_ACCESS  = "ACCESS";
    private static final String TYPE_REFRESH = "REFRESH";

    // ─── Token Generation ─────────────────────────────────────────────────────

    /**
     * Generate a short-lived access token (24 h by default).
     */
    public String generateToken(String phoneOrUsername) {
        return buildToken(phoneOrUsername, jwtExpirationMs, TYPE_ACCESS);
    }

    /**
     * Generate a long-lived refresh token (7 d by default).
     */
    public String generateRefreshToken(String phoneOrUsername) {
        return buildToken(phoneOrUsername, jwtRefreshExpirationMs, TYPE_REFRESH);
    }

    // ─── Token Validation ─────────────────────────────────────────────────────

    /**
     * Validate any JWT (access or refresh). Returns false for expired/invalid tokens.
     */
    public boolean validateJwtToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Returns true only when the token is valid AND has type = REFRESH.
     */
    public boolean isRefreshToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Returns true only when the token is valid AND has type = ACCESS.
     */
    public boolean isAccessToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
        } catch (Exception e) {
            return false;
        }
    }

    // ─── Claims Extraction ────────────────────────────────────────────────────

    public String getUserNameFromJwtToken(String token) {
        return parseClaims(token).getSubject();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private String buildToken(String subject, long expirationMs, String tokenType) {
        return Jwts.builder()
                .setSubject(subject)
                .claim(CLAIM_TYPE, tokenType)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
