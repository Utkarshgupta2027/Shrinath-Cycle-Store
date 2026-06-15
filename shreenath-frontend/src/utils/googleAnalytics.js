/**
 * googleAnalytics.js — GA4 integration via react-ga4
 *
 * Measurement ID is read from the environment variable:
 *   REACT_APP_GA_MEASUREMENT_ID
 *
 * This file is the single source of truth for all GA4 interactions.
 * All functions are fire-and-forget: failures silently no-op.
 *
 * Usage:
 *   import { gaTrackPageView, gaTrackEvent, gaTrackProductView, ... } from './utils/googleAnalytics';
 */

import ReactGA from "react-ga4";

// ─── Configuration ────────────────────────────────────────────────────────────

const MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

let initialized = false;

/**
 * Initialize GA4.
 * Call this ONCE from index.js (entry point) before React renders.
 * If the Measurement ID is missing, GA4 is silently disabled in dev mode.
 */
export function initGA() {
  if (!MEASUREMENT_ID) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[GA4] REACT_APP_GA_MEASUREMENT_ID is not set. GA4 tracking is disabled."
      );
    }
    return;
  }

  try {
    ReactGA.initialize(MEASUREMENT_ID, {
      // In development, suppress GA hits to avoid polluting real data.
      testMode: process.env.NODE_ENV === "development",
    });
    initialized = true;
  } catch (err) {
    // Swallow init errors — analytics must never break the app.
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA4] Initialization failed:", err);
    }
  }
}

// ─── Guard helper ─────────────────────────────────────────────────────────────

/** Returns true only when GA4 has been successfully initialized. */
function isReady() {
  return initialized && Boolean(MEASUREMENT_ID);
}

// ─── Page View Tracking ───────────────────────────────────────────────────────

/**
 * Track a virtual page view.
 * Triggered automatically on every route change in App.js.
 *
 * @param {string} path  - current URL path  e.g. "/product/5"
 * @param {string} [title] - optional page title
 */
export function gaTrackPageView(path, title) {
  if (!isReady()) return;
  try {
    ReactGA.send({
      hitType: "pageview",
      page: path,
      title: title || document.title,
    });
  } catch {
    // Silently ignore
  }
}

// ─── Generic Event Tracking ───────────────────────────────────────────────────

/**
 * Send a custom GA4 event.
 *
 * @param {Object} params
 * @param {string} params.category - Event category  (e.g. "Product")
 * @param {string} params.action   - Event action    (e.g. "add_to_cart")
 * @param {string} [params.label]  - Event label     (e.g. product name)
 * @param {number} [params.value]  - Numeric value   (e.g. price in paise)
 * @param {Object} [params.extra]  - Any additional GA4 parameters
 */
export function gaTrackEvent({ category, action, label, value, extra = {} }) {
  if (!isReady()) return;
  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
      ...extra,
    });
  } catch {
    // Silently ignore
  }
}

// ─── E-Commerce Specific Events ───────────────────────────────────────────────

/**
 * Track when a user views a product detail page.
 * Call this inside Product.jsx after the product is loaded.
 *
 * @param {Object} product - product object from the API
 */
export function gaTrackProductView(product) {
  if (!isReady() || !product) return;
  try {
    // GA4 "view_item" recommended event
    ReactGA.event("view_item", {
      currency: "INR",
      value: Number(product.price) || 0,
      items: [
        {
          item_id: String(product.id),
          item_name: product.name || "",
          item_category: product.category || "",
          item_brand: product.brand || "",
          price: Number(product.price) || 0,
          quantity: 1,
        },
      ],
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Track when a user adds a product to the cart.
 * Call this in the addToCart handler.
 *
 * @param {Object} product  - product object
 * @param {number} quantity - quantity added (default 1)
 */
export function gaTrackAddToCart(product, quantity = 1) {
  if (!isReady() || !product) return;
  try {
    // GA4 "add_to_cart" recommended event
    ReactGA.event("add_to_cart", {
      currency: "INR",
      value: (Number(product.price) || 0) * quantity,
      items: [
        {
          item_id: String(product.id),
          item_name: product.name || "",
          item_category: product.category || "",
          item_brand: product.brand || "",
          price: Number(product.price) || 0,
          quantity,
        },
      ],
    });

    // Also fire a custom labeled event for easy filtering in GA4 reports
    gaTrackEvent({
      category: "Ecommerce",
      action: "add_to_cart",
      label: product.name || String(product.id),
      value: Number(product.price) || 0,
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Track when a user initiates checkout (visits /checkout).
 * Call this when the checkout page mounts.
 *
 * @param {Array}  items  - cart items array
 * @param {number} total  - cart subtotal
 */
export function gaTrackCheckoutStart(items = [], total = 0) {
  if (!isReady()) return;
  try {
    // GA4 "begin_checkout" recommended event
    ReactGA.event("begin_checkout", {
      currency: "INR",
      value: total,
      items: items.map((item) => ({
        item_id: String(item.id || item.productId),
        item_name: item.name || "",
        item_category: item.category || "",
        item_brand: item.brand || "",
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      })),
    });

    gaTrackEvent({
      category: "Ecommerce",
      action: "begin_checkout",
      label: `${items.length} items`,
      value: Math.round(total),
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Track a completed purchase.
 * Call this after a successful order API response.
 *
 * @param {Object} params
 * @param {string|number} params.orderId    - Order ID returned by backend
 * @param {number}        params.total      - Final order total
 * @param {Array}         [params.items]    - Purchased items array
 * @param {string}        [params.coupon]   - Coupon code used
 */
export function gaTrackPurchase({ orderId, total, items = [], coupon = "" }) {
  if (!isReady()) return;
  try {
    // GA4 "purchase" recommended event
    ReactGA.event("purchase", {
      transaction_id: String(orderId),
      currency: "INR",
      value: total,
      coupon: coupon || undefined,
      items: items.map((item) => ({
        item_id: String(item.id || item.productId),
        item_name: item.name || "",
        item_category: item.category || "",
        item_brand: item.brand || "",
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      })),
    });

    gaTrackEvent({
      category: "Ecommerce",
      action: "purchase",
      label: String(orderId),
      value: Math.round(total),
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Track a search query.
 * Call this when the search filter bar fires.
 *
 * @param {string} query       - the search term
 * @param {number} resultCount - number of results returned
 */
export function gaTrackSearch(query, resultCount) {
  if (!isReady() || !query) return;
  try {
    // GA4 "search" recommended event
    ReactGA.event("search", {
      search_term: query.trim().toLowerCase(),
    });

    // Fire a custom event with result count for richer reporting
    gaTrackEvent({
      category: "Search",
      action: resultCount === 0 ? "failed_search" : "successful_search",
      label: query.trim().toLowerCase(),
      value: resultCount,
    });
  } catch {
    // Silently ignore
  }
}
