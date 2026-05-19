package GuptaCycle.org.Shrinath.Security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for sensitive auth endpoints.
 *
 * Defaults:  5 attempts / 60 seconds per IP.
 * Override via application.properties:
 *   app.rate-limit.max-attempts=5
 *   app.rate-limit.window-seconds=60
 *
 * Returns HTTP 429 with a Retry-After header on breach.
 */
@Component
@Order(1)
public class RateLimitingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /** Endpoints that are rate-limited. */
    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/forgot-password"
    );

    @Value("${app.rate-limit.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.rate-limit.window-seconds:60}")
    private long windowSeconds;

    // IP → list of attempt timestamps (epoch seconds)
    private final Map<String, java.util.Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  httpReq  = (HttpServletRequest)  req;
        HttpServletResponse httpRes  = (HttpServletResponse) res;

        String path   = httpReq.getRequestURI();
        String method = httpReq.getMethod();

        // Only apply to POST requests on protected paths
        if ("POST".equalsIgnoreCase(method) && PROTECTED_PATHS.contains(path)) {
            String ip = resolveClientIp(httpReq);

            if (isBucketExceeded(ip)) {
                log.warn("[RateLimit] Too many requests from IP {} on {}", ip, path);
                httpRes.setStatus(429);
                httpRes.setHeader("Retry-After", String.valueOf(windowSeconds));
                httpRes.setContentType("application/json");
                httpRes.getWriter().write(
                        "{\"message\":\"Too many requests. Please try again later.\","
                        + "\"retryAfterSeconds\":" + windowSeconds + "}");
                return;
            }
        }

        chain.doFilter(req, res);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private boolean isBucketExceeded(String ip) {
        long now = Instant.now().getEpochSecond();
        long cutoff = now - windowSeconds;

        attempts.compute(ip, (k, deque) -> {
            if (deque == null) {
                deque = new java.util.ArrayDeque<>();
            }
            // Evict old timestamps outside the window
            while (!deque.isEmpty() && deque.peekFirst() <= cutoff) {
                deque.pollFirst();
            }
            deque.addLast(now);
            return deque;
        });

        java.util.Deque<Long> bucket = attempts.get(ip);
        return bucket != null && bucket.size() > maxAttempts;
    }

    private String resolveClientIp(HttpServletRequest req) {
        // Support common reverse-proxy headers
        for (String header : new String[]{"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP"}) {
            String value = req.getHeader(header);
            if (value != null && !value.isEmpty() && !"unknown".equalsIgnoreCase(value)) {
                // X-Forwarded-For can be comma-separated; take the first (original client)
                return value.split(",")[0].trim();
            }
        }
        return req.getRemoteAddr();
    }
}
