// ─── Cache Names ──────────────────────────────────────────────────────────────
const STATIC_CACHE  = 'shrinath-static-v2';   // HTML, JS, CSS, images
const API_CACHE     = 'shrinath-api-v2';       // Backend API responses
const OFFLINE_URL   = '/index.html';

// How long (ms) an API cache entry is considered "fresh" → 10 minutes
const API_CACHE_TTL = 10 * 60 * 1000;

// Static assets that are pre-cached on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/logo123.png',
];

// ─── Public API endpoints that should be cached (Stale-While-Revalidate) ──────
// These are the "basic data" endpoints that are publicly accessible.
const CACHEABLE_API_PATTERNS = [
  /\/api\/products(\?.*)?$/,       // product listings
  /\/api\/product\/[^/]+$/,        // individual product
  /\/api\/categories(\?.*)?$/,     // all categories
  /\/api\/categories\/featured/,   // featured categories
  /\/api\/brands(\?.*)?$/,         // all brands
  /\/api\/brands\/featured/,       // featured brands (homepage)
  /\/api\/settings/,               // store settings / info
  /\/api\/Home/,                   // homepage data
];

function isApiCacheable(url) {
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url));
}

// ─── Install: pre-cache static shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: remove outdated caches ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([STATIC_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!allowedCaches.has(key)) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Helper: store response with a timestamp header ──────────────────────────
async function cacheApiResponse(request, response) {
  const cache = await caches.open(API_CACHE);
  // Clone the response and inject a custom timestamp header
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', Date.now().toString());
  const timestampedResponse = new Response(await response.clone().blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, timestampedResponse);
}

// ─── Helper: check if a cached API response is still within TTL ──────────────
function isFresh(cachedResponse) {
  const cachedAt = parseInt(cachedResponse.headers.get('sw-cached-at') || '0', 10);
  return Date.now() - cachedAt < API_CACHE_TTL;
}

// ─── Fetch: route requests to the right strategy ─────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // ── Strategy 1: API data → Stale-While-Revalidate (with TTL) ────────────
  if (isApiCacheable(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        // If we have a fresh cached response, return it immediately
        // and silently refresh it in the background
        if (cached && isFresh(cached)) {
          // Background refresh (fire-and-forget)
          fetch(event.request)
            .then((networkRes) => {
              if (networkRes.ok) cacheApiResponse(event.request, networkRes);
            })
            .catch(() => {});
          return cached;
        }

        // Cache is stale / missing → go to network, then cache
        try {
          const networkRes = await fetch(event.request);
          if (networkRes.ok) {
            await cacheApiResponse(event.request, networkRes.clone());
          }
          return networkRes;
        } catch {
          // Network failed — return stale cache if available (better than nothing)
          if (cached) return cached;
          throw new Error('Network error and no cached data available');
        }
      })
    );
    return;
  }

  // ── Strategy 2: Static assets → Cache-First ──────────────────────────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache; update in background (Stale-While-Revalidate)
        fetch(event.request)
          .then((res) => {
            if (res.status === 200) {
              caches.open(STATIC_CACHE).then((c) => c.put(event.request, res));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not in cache → fetch, then cache the response
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => {
          // For page navigations fall back to the offline shell
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
