import { API_BASE_URL } from '../config';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Pings the backend to prevent Render's free-tier server from
 * spinning down due to inactivity (Render shuts down after ~15 min).
 *
 * We hit /api/products because it is already a public GET endpoint
 * (no auth required) — no extra backend changes needed.
 * We append size=1 to minimise data transfer.
 */
function pingServer() {
  const url = `${API_BASE_URL}/api/products?size=1`;

  fetch(url, { method: 'GET', cache: 'no-store' })
    .then((res) => {
      if (res.ok) {
        console.debug('[KeepAlive] Server ping successful ✓');
      } else {
        console.warn(`[KeepAlive] Server ping returned status ${res.status}`);
      }
    })
    .catch((err) => {
      // Silently ignore network errors — server may just be waking up
      console.warn('[KeepAlive] Ping failed (server might be cold-starting):', err.message);
    });
}

/**
 * Starts the keep-alive interval.
 * Call this once at app startup (e.g., in index.js).
 *
 * - Fires an immediate ping on startup.
 * - Then pings every PING_INTERVAL_MS milliseconds.
 */
export function startKeepAlive() {
  // Immediate first ping so we know the server is awake on load
  pingServer();

  // Repeat every 10 minutes
  const intervalId = setInterval(pingServer, PING_INTERVAL_MS);

  // Allow cleanup if needed (e.g., during testing)
  return () => clearInterval(intervalId);
}
