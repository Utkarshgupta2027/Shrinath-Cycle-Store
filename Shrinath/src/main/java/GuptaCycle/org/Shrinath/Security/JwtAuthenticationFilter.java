package GuptaCycle.org.Shrinath.Security;

import GuptaCycle.org.Shrinath.Service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT Authentication Filter.
 *
 * Validates the Bearer token on every request.
 * Security hardening:
 *   - Only ACCESS tokens are accepted for API calls.
 *   - Refresh tokens are explicitly rejected here; they may only be used
 *     on the /api/auth/refresh endpoint (handled without this filter).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthService authService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");

        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);

            if (jwtUtils.validateJwtToken(token) && jwtUtils.isAccessToken(token)) {
                // Only ACCESS tokens authenticate API requests
                String phoneNumber = jwtUtils.getUserNameFromJwtToken(token);
                String role = authService.getRoleForPhoneNumber(phoneNumber);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                phoneNumber,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            // If it's a refresh token used on a normal endpoint → authentication is NOT set
            // → Spring Security will return 401 / 403 as appropriate
        }

        filterChain.doFilter(request, response);
    }
}
