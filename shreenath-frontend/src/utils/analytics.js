/**
 * analytics.js — Lightweight visitor tracking utility
 *
 * Uses:
 *  - localStorage  → persistent visitorId (survives tab close, browser restart)
 *  - sessionStorage → sessionId per tab (resets on tab/browser close)
 *
 * All calls are fire-and-forget — failures NEVER break the user experience.
 */

import { API_BASE_URL } from "../config";
import { getStoredUser } from "./auth";

const ANALYTICS_URL = `${API_BASE_URL}/api/analytics`;

// ─── ID Management ──────────────────────────────────────────────────────────

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persistent visitor fingerprint stored in localStorage.
 * Same visitor = same ID across multiple sessions.
 */
export function getVisitorId() {
  try {
    let id = localStorage.getItem("_vuid");
    if (!id) {
      id = generateUUID();
      localStorage.setItem("_vuid", id);
    }
    return id;
  } catch {
    return "unknown-visitor";
  }
}

/**
 * Per-tab session ID stored in sessionStorage.
 * Resets when tab/browser is closed.
 */
export function getSessionId() {
  try {
    let id = sessionStorage.getItem("_vsid");
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem("_vsid", id);
    }
    return id;
  } catch {
    return "unknown-session";
  }
}

// ─── Tracking Functions ──────────────────────────────────────────────────────

/**
 * Track a page view. Call this on every route change in App.js.
 *
 * @param {string} path    - current URL path e.g. "/product/5"
 * @param {number|null} [explicitUserId] - pass user.id from React context
 *   for accuracy. If omitted, falls back to reading localStorage via
 *   getStoredUser() (used for search / order tracking where context
 *   is not directly available).
 */
export async function trackPageView(path, explicitUserId) {
  // Prefer the explicitly passed userId (from React context — always up-to-date).
  // Fall back to localStorage only when not provided.
  const userId = (explicitUserId !== undefined)
    ? explicitUserId
    : (getStoredUser()?.id ?? null);
  try {
    await fetch(`${ANALYTICS_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        eventType: "PAGE_VIEW",
        pagePath: path,
        userId,
      }),
    });
  } catch {
    // Silently ignore — analytics must never break the UI
  }
}


/**
 * Track when an order is successfully placed.
 * Call this right after a successful order API response.
 */
export async function trackOrderPlaced() {
  const user = getStoredUser();
  try {
    await fetch(`${ANALYTICS_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        eventType: "ORDER_PLACED",
        pagePath: "/checkout",
        userId: user?.id || null,
      }),
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Track a search query and how many results it returned.
 * resultCount = 0  →  failed search (what they couldn't find)
 *
 * @param {string} query        - what the user typed
 * @param {number} resultCount  - number of products returned
 */
export async function trackSearch(query, resultCount) {
  if (!query || query.trim().length < 2) return; // ignore single chars
  const user = getStoredUser();
  try {
    await fetch(`${ANALYTICS_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim().toLowerCase(),
        resultCount: resultCount ?? 0,
        userId: user?.id || null,
        sessionId: getSessionId(),
      }),
    });
  } catch {
    // Silently ignore
  }
}
