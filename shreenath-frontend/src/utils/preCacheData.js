import { API_BASE_URL } from '../config';

/**
 * Critical public endpoints whose responses should be pre-cached so that
 * the next visit loads them instantly from the Service Worker cache.
 *
 * Only public (no-auth) GET endpoints are listed here.
 */
const PRECACHE_URLS = [
  `${API_BASE_URL}/api/products?size=12`,       // First page of products (homepage)
  `${API_BASE_URL}/api/categories`,             // All categories
  `${API_BASE_URL}/api/categories/featured`,    // Featured categories (navbar/homepage)
  `${API_BASE_URL}/api/brands`,                 // All brands
  `${API_BASE_URL}/api/brands/featured`,        // Featured brands (homepage)
  `${API_BASE_URL}/api/settings`,              // Store name, logo, contact info
];

/**
 * Silently fetches each critical URL in the background.
 * The Service Worker intercepts these requests and stores them in its API cache.
 * Errors are swallowed — this is purely a best-effort warm-up.
 */
async function warmUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      // Allow SW to intercept and cache this response
      cache: 'default',
    });
    if (res.ok) {
      console.debug(`[PreCache] Warmed: ${url}`);
    }
  } catch {
    // Network unavailable or server cold-starting — ignore silently
  }
}

/**
 * Kicks off background pre-caching of all critical API endpoints.
 *
 * - Runs after a short delay so it doesn't compete with the initial page render.
 * - Uses Promise.allSettled so one failure never blocks others.
 *
 * Call this once at app startup (index.js).
 */
export function preCacheData() {
  // Wait 3 seconds after app load to avoid blocking the initial render
  setTimeout(() => {
    console.debug('[PreCache] Starting background warm-up of API data...');
    Promise.allSettled(PRECACHE_URLS.map(warmUrl)).then(() => {
      console.debug('[PreCache] Background warm-up complete ✓');
    });
  }, 3000);
}
