package GuptaCycle.org.Shrinath.Scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * ServerKeepAliveScheduler — prevents Render free-tier cold starts.
 *
 * Render spins down a free web service after ~15 minutes of inactivity.
 * This scheduler fires every 10 minutes (server-side) and hits its own
 * public health endpoint, so the JVM never idles long enough to be evicted.
 *
 * Why server-side instead of only frontend?
 *  - Frontend keepAlive.js only works while a browser tab is open.
 *  - At night / low-traffic hours no tabs may be open, so the server sleeps.
 *  - A @Scheduled task runs inside the already-running JVM, so as long as
 *    the process is alive it keeps itself alive — no external dependency.
 */
@Component
public class ServerKeepAliveScheduler {

    private static final Logger log = LoggerFactory.getLogger(ServerKeepAliveScheduler.class);

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * The public URL of this backend service on Render.
     * Set RENDER_EXTERNAL_URL in Render's environment variables — Render
     * injects it automatically (e.g. https://shrinath-backend.onrender.com).
     * Falls back to localhost for local dev so it never breaks the build.
     */
    @Value("${RENDER_EXTERNAL_URL:http://localhost:8080}")
    private String selfBaseUrl;

    /**
     * Ping the server's own /api/products endpoint every 10 minutes.
     * fixedDelay means: wait 10 min *after* the previous call finishes,
     * so pings never overlap even if the server is slow.
     *
     * 10 minutes = 600_000 ms  (well under Render's 15-min idle threshold)
     */
    @Scheduled(fixedDelay = 600_000, initialDelay = 60_000)
    public void keepAlive() {
        String pingUrl = selfBaseUrl + "/api/products?size=1";
        HttpURLConnection conn = null;
        try {
            URL url = new URL(pingUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10_000);   // 10 s connect timeout
            conn.setReadTimeout(15_000);      // 15 s read timeout
            conn.setRequestProperty("User-Agent", "ShrinathKeepAlive/1.0");

            int status = conn.getResponseCode();
            log.info("[KeepAlive] Self-ping {} → HTTP {} at {}",
                    pingUrl, status, LocalDateTime.now().format(FMT));
        } catch (Exception e) {
            // Log but never throw — a failed ping must not crash the scheduler
            log.warn("[KeepAlive] Self-ping failed ({}): {}", pingUrl, e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
