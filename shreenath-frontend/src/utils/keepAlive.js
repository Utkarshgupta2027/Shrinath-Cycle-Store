import { API_BASE_URL } from '../config';

// Backend self-ping also runs every 10 min (ServerKeepAliveScheduler.java).
// This frontend layer adds extra coverage while a browser tab is open.
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — well under Render's 15-min idle cutoff

/**
 * Pings the backend to prevent Render free-tier cold starts.
 *
 * Hits /api/products?size=1 — a public GET endpoint that requires
 * no auth and returns minimal data.
 */
function pingServer() {
  const url = `${API_BASE_URL}/api/products?size=1`;

  fetch(url, { method: 'GET', cache: 'no-store' })
    .then((res) => {
      if (res.ok) {
        console.debug('[KeepAlive] Server ping successful ✓', new Date().toLocaleTimeString());
      } else {
        console.warn(`[KeepAlive] Server ping returned status ${res.status}`);
      }
    })
    .catch((err) => {
      // Silently ignore — server may just be waking up from a cold start
      console.warn('[KeepAlive] Ping failed (cold-start?):', err.message);
    });
}

/**
 * Starts the keep-alive mechanism.
 * Call once at app startup (index.js).
 *
 * Strategy:
 *  1. Immediate ping on startup (warms server before first real request).
 *  2. Repeating ping every 5 minutes while tab is open.
 *  3. Visibility-change ping — fires when user switches back to the tab
 *     after being away, so the server is warm exactly when needed.
 */
export function startKeepAlive() {
  // 1. Immediate ping
  pingServer();

  // 2. Interval ping every 5 minutes
  const intervalId = setInterval(pingServer, PING_INTERVAL_MS);

  // 3. Ping when user returns to a hidden/backgrounded tab
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.debug('[KeepAlive] Tab became visible — pinging server');
      pingServer();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

