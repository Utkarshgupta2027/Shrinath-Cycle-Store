package GuptaCycle.org.Shrinath.Controller;

import GuptaCycle.org.Shrinath.DTO.AnalyticsEventDTO;
import GuptaCycle.org.Shrinath.DTO.SearchLogDTO;
import GuptaCycle.org.Shrinath.DTO.VisitorDashboardDTO;
import GuptaCycle.org.Shrinath.Security.JwtUtils;
import GuptaCycle.org.Shrinath.Service.AuthService;
import GuptaCycle.org.Shrinath.Service.VisitorAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Visitor Intelligence API
 *
 * POST /api/analytics/event    — record a PAGE_VIEW or ORDER_PLACED event (no auth required)
 * POST /api/analytics/search   — record a search query (no auth required)
 * GET  /api/analytics/visitor-dashboard — admin-only full dashboard
 */
@RestController
@RequestMapping("/api/analytics")
public class VisitorAnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(VisitorAnalyticsController.class);

    @Autowired
    private VisitorAnalyticsService visitorAnalyticsService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    /**
     * Frontend calls this on every page load and order placement.
     * No authentication needed — guests are tracked too.
     */
    @PostMapping("/event")
    public ResponseEntity<?> recordEvent(@RequestBody AnalyticsEventDTO dto,
                                         HttpServletRequest request) {
        try {
            String ip = extractIp(request);
            visitorAnalyticsService.recordEvent(dto, ip);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Never block the user flow due to analytics failure
            return ResponseEntity.ok().build();
        }
    }

    /**
     * Frontend calls this whenever a search is submitted.
     * resultCount = 0 means failed search.
     */
    @PostMapping("/search")
    public ResponseEntity<?> recordSearch(@RequestBody SearchLogDTO dto) {
        try {
            visitorAnalyticsService.recordSearch(dto);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("[Analytics] Failed to save search log. query='{}' resultCount={} error={}",
                    dto != null ? dto.getQuery() : "null",
                    dto != null ? dto.getResultCount() : -1,
                    e.getMessage(), e);
            return ResponseEntity.ok().build();
        }
    }

    /**
     * Admin-only: returns the full visitor intelligence dashboard.
     */
    @GetMapping("/visitor-dashboard")
    public ResponseEntity<?> getVisitorDashboard(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        ResponseEntity<?> authResult = authorizeAdmin(auth);
        if (authResult != null) return authResult;

        try {
            VisitorDashboardDTO dashboard = visitorAnalyticsService.buildDashboard();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to build analytics dashboard: " + e.getMessage());
        }
    }

    // ─── Auth helper (same pattern as OrderController) ──────────────────────

    private ResponseEntity<?> authorizeAdmin(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Admin authorization required.");
        }
        String token = auth.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid or expired token.");
        }
        String phone = jwtUtils.getUserNameFromJwtToken(token);
        if (!authService.isAdminPhoneNumber(phone)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Admin access only.");
        }
        return null;
    }

    /** Extract real client IP even behind reverse proxies */
    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
