package GuptaCycle.org.Shrinath.Security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.regex.Pattern;

/**
 * Strips common XSS attack characters from every incoming request parameter
 * and header values exposed through getParameter().
 *
 * For body-based JSON payloads, Spring's Jackson deserialization already
 * prevents raw HTML injection; this filter adds a defence-in-depth layer
 * for query-string and form parameters.
 *
 * Characters stripped: < > " ' ` ; ( ) { }
 */
@Component
@Order(2)
public class InputSanitizationFilter implements Filter {

    private static final Pattern XSS_PATTERN = Pattern.compile(
            "[<>\"'`;(){}]", Pattern.CASE_INSENSITIVE);

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        chain.doFilter(new SanitizingRequestWrapper((HttpServletRequest) req), res);
    }

    // ─── Request Wrapper ──────────────────────────────────────────────────────

    private static class SanitizingRequestWrapper extends HttpServletRequestWrapper {

        SanitizingRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getParameter(String name) {
            return sanitize(super.getParameter(name));
        }

        @Override
        public String[] getParameterValues(String name) {
            String[] values = super.getParameterValues(name);
            if (values == null) return null;
            String[] sanitized = new String[values.length];
            for (int i = 0; i < values.length; i++) {
                sanitized[i] = sanitize(values[i]);
            }
            return sanitized;
        }

        @Override
        public String getHeader(String name) {
            // Sanitize header values to prevent header-injection attacks
            return sanitize(super.getHeader(name));
        }

        private String sanitize(String value) {
            if (value == null) return null;
            return XSS_PATTERN.matcher(value).replaceAll("");
        }
    }
}
