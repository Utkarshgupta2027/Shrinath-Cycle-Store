package GuptaCycle.org.Shrinath.Config;

import GuptaCycle.org.Shrinath.Security.InputSanitizationFilter;
import GuptaCycle.org.Shrinath.Security.JwtAuthenticationFilter;
import GuptaCycle.org.Shrinath.Security.RateLimitingFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Value("${app.frontend.origin:http://localhost:3000}")
    private String frontendOrigin;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @Autowired
    private InputSanitizationFilter inputSanitizationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ─── Public endpoints ───────────────────────────────────────
                .requestMatchers(
                        "/api/auth/login",
                        "/api/auth/signin",
                        "/api/auth/register",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/api/auth/refresh",    // Refresh token endpoint
                        "/api/auth/logout"      // Logout (invalidates token server-side)
                ).permitAll()
                .requestMatchers(HttpMethod.GET,
                        "/api/products",
                        "/api/products/search",      // Guest-accessible product search/filter
                        "/api/product/*",
                        "/api/product/*/image",
                        "/api/product/*/gallery/*",  // extra gallery images
                        "/api/product/*/reviews",
                        "/api/review/*/photo",       // Feature 12: review photos are public
                        "/api/categories",           // Feature 14: public category list
                        "/api/categories/featured",  // Feature 14: featured categories
                        "/api/brands",               // Feature 14: public brand list
                        "/api/brands/featured",      // Feature 14: featured brands (homepage)
                        "/api/settings",             // Feature 13: public store info
                        "/api/Home",
                        "/api/about"
                ).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/feedback").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/review/*/helpful").authenticated()

                // ─── Admin-only endpoints ─────────────────────────────────────────
                .requestMatchers(
                        "/api/auth/admin/**",
                        "/api/orders/admin/**",
                        "/api/shipping/admin/**",
                        "/api/admin/**"              // Feature 12/13/14: all /admin/** routes
                ).hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/product").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/product/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/product/**").hasRole("ADMIN")

                // ─── Authenticated users ─────────────────────────────────────
                .requestMatchers(
                        "/api/cart/**",
                        "/api/orders/**",
                        "/api/wishlist/**",
                        "/api/payments/**",
                        "/api/auth/me",
                        "/api/auth/me/**",
                        "/api/addresses/**"
                ).authenticated()

                .anyRequest().authenticated()
            )
            // Chain: RateLimiting → InputSanitization → JWT
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(inputSanitizationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Lock CORS to the configured frontend origin only (no wildcard in production)
        configuration.setAllowedOrigins(List.of(frontendOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // Pre-flight cache 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
