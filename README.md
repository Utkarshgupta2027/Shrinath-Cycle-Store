# 🚲 Shrinath Cycle Store — Full-Stack E-Commerce Platform

[![Java](https://img.shields.io/badge/Java-17-orange?logo=java)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen?logo=spring)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-blue?logo=mysql)](https://www.mysql.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Integrated-0A2540?logo=razorpay)](https://razorpay.com/)
[![GA4](https://img.shields.io/badge/Google%20Analytics-4-orange?logo=google-analytics)](https://analytics.google.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

> A production-deployed, full-featured bicycle e-commerce web application for **Shrinath Cycle Store**. Built with React 19 + Spring Boot 3.5 + MySQL 8. Supports end-to-end order lifecycle, Razorpay payments, multi-channel notifications, GST invoicing, a **self-hosted Visitor Intelligence analytics system**, and **Google Analytics 4** dual-tracking.

---

## 📁 Project Structure

```
Shrinath-Cycle-Store/
├── Shrinath/                   # Spring Boot Backend (Java 17)
│   ├── src/main/java/GuptaCycle/org/Shrinath/
│   │   ├── Controller/         # 17 REST API controllers
│   │   ├── Service/            # Business logic services
│   │   ├── Model/              # JPA entities (24 tables)
│   │   ├── Repository/         # Spring Data JPA repositories
│   │   ├── DTO/                # Data transfer objects
│   │   ├── Security/           # JWT, rate limiting, input sanitization
│   │   ├── Scheduler/          # Background jobs (cart abandonment)
│   │   └── Config/             # Security & password config
│   └── src/main/resources/
│       └── application.properties
│
└── shreenath-frontend/         # React Frontend (Create React App)
    └── src/
        ├── components/         # 22+ page components
        ├── pages/              # Admin panel, dashboard, order tracking
        ├── Context/            # Global app state (AppProvider)
        ├── api/                # Axios instance with auto token refresh
        ├── utils/              # Theme, auth, analytics, GA4 utilities
        ├── styles/             # CSS modules per component
        └── config.js           # Centralized API base URL config
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| React Router DOM | 7.x | Client-side routing with lazy loading |
| Axios | 1.x | HTTP client with JWT interceptors & token queuing |
| react-ga4 | latest | Google Analytics 4 integration |
| React Icons | 5.x | Icon library |
| Vanilla CSS | — | Custom styling, dark/light themes & animations |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 3.5.x | Application framework |
| Spring Security | 6.x | JWT authentication & role-based authorization |
| Spring Data JPA | 3.x | ORM / database layer (Hibernate) |
| JJWT | 0.11.5 | JWT access & refresh token generation |
| iText 7 | 7.2.5 | GST-compliant PDF invoice generation |
| Spring Mail & Brevo | — | Email notifications via Brevo HTTP API & Brevo SMTP Relay |
| Twilio SDK | 9.x | SMS / WhatsApp alert fallback |
| Lombok | — | Boilerplate reduction |
| MySQL Connector | — | Database driver |

### Database & Infrastructure
| Component | Details |
|---|---|
| Database | MySQL 8.4 (Aiven Cloud) |
| ORM Strategy | Hibernate DDL auto-update |
| Storage | LONGBLOB columns for product images in DB |
| Deployment | Docker-ready; fully environment-variable driven |

---

## 🌐 Frontend — Pages & Functions

### 🏠 Home (`/`)
- Animated 4-slide hero banner with category CTAs
- Category-based product browsing: Bicycle (Mountain/City/Kids/Ladies/Sports/Electric), Parts, Accessories, New Arrivals, Tools
- Featured brand logo strip (dynamic from admin config)
- Featured & new arrival product sections with smart sorting
- Search bar + filter integration with **analytics tracking**
- **Exponential-backoff retry** on product load for Render free-tier cold starts (up to 5 retries, max 32s delay)
- Dark/light theme toggle (persisted in `localStorage`)

### 🔐 Login (`/login`)
- Login using phone number **or** email + password
- Stores `token`, `refreshToken`, `userId`, `role`, `username` in `localStorage`
- Auto-redirects admin users to `/admin`
- Forgot password flow with OTP via email

### 📝 Register (`/register`)
- **2-step OTP email verification** flow:
  1. Fill name, email, phone, password → "Send Verification OTP" (via Brevo HTTP API to bypass port-blocking on Render)
  2. Enter 6-digit code from email (valid 5 min) → "Verify & Create Account"
- 6-box OTP input with auto-focus, backspace navigation & paste support
- Resend OTP with 60-second cooldown timer
- Redirects to login after successful registration

### 🛒 Cart (`/cart`)
- Persistent server-side cart (survives page refresh and sessions)
- Add, remove, and update item quantities
- Move item to wishlist from cart
- Clear entire cart
- Real-time cart total and item count in Navbar badge
- Coupon code field for applying discounts
- Standard Shipping is **FREE** across the application (delivery charge = ₹0)

### 📦 Product Detail (`/product/:productId`)
- Full product info: name, brand, category, price, stock, description
- Primary image + multi-image gallery viewer
- Add to cart / Add to wishlist button
- Customer reviews with star ratings and optional photo
- Submit a star rating and written review
- Vote reviews as "Helpful"
- **"Notify Me"** modal for out-of-stock items (subscribe to restock email)
- Pincode serviceability checker
- Shipping charge estimator

### 🔍 Search & Filter (`SearchFilterBar`)
- Real-time keyword search with 350ms debounce (tied to `fetchProducts`)
- Filter by category, brand, price range
- Toggle "In Stock Only"
- Sort by: Price (Low→High / High→Low), Newest, Rating
- **Search analytics** — tracks query + result count after each API response; failed searches (0 results) are logged for admin review

### 💳 Checkout (`/checkout`)
- Multi-step checkout popup
- Address selection from saved addresses or new entry
- Pincode delivery check with dynamic shipping fee calculations
- Coupon code application with live discount calculation
- Order summary with itemized list, subtotal, discount, shipping, and grand total
- Payment method selection: **Razorpay (Online)** or **Cash on Delivery (COD)**
- Standard Shipping is **FREE** (₹0), and Express Shipping is calculated dynamically (default ₹199 or based on per-kg pincode rates from database)
- **COD orders fire `trackOrderPlaced()`** for self-hosted visitor analytics and default to **PENDING** payment status

### 💰 Make Payment (`/makepayment`)
- Razorpay hosted checkout integration (create → open → verify signature flow)
- UPI (QR / UPI ID), Credit/Debit Card, Net Banking, COD methods
- EMI options displayed for high-value orders (≥ ₹30,000)
- Clears cart after successful payment
- **GA4 `purchase` event** fired on confirmed online payment via `gaTrackPurchase()`

### 📋 Orders (`/orders`)
- List of all orders for the logged-in user
- Status chips: Pending, Confirmed, Shipped, Delivered, Cancelled, Returned
- Cancel order with reason
- Submit return/exchange request
- Download GST-compliant PDF invoice per order
- Real-time order status tracking link

### 📍 Track Order (`/track/:orderId`)
- Visual order tracking timeline with step indicators
- Shows current status with timestamps
- AWB number display if shipped

### ❤️ Wishlist (`/wishlist`)
- View all wishlisted products
- Remove items from wishlist
- Move item to cart

### 📒 Address Book (`/addresses`)
- List all saved delivery addresses
- Add new address / Edit existing / Delete / Set default

### 👤 User Account (`/useraccount`) & ⚙️ Settings (`/settings`)
- View & edit profile (name, phone, email)
- Change password
- Delete account (with full cascading cleanup)
- Dark/light theme toggle

### 💬 Feedback (`/feedback`)
- Contact/feedback form with star rating
- Sends email notification to admin

### 🛠️ Admin Panel (`/admin`) — *Admin Only*
| Section | Functions |
|---|---|
| **Dashboard** | Total revenue, orders, users, low-stock alerts, analytics charts |
| **Products** | Add/edit/delete products; upload primary + gallery images |
| **Orders** | View all orders; update status; update payment status (e.g. mark COD orders as **PAID**, triggering customer email confirmation & invoice); process Razorpay refunds; delete |
| **Users** | View all registered users |
| **Returns** | View and process return/exchange requests |
| **Analytics** | Revenue trend, order lifecycle metrics, traffic breakdown |
| **Coupons** | Create/edit/delete flat or percentage discount coupons |
| **Reviews** | Moderate pending reviews (Approve / Reject) |
| **Shipping PINs** | Add/edit/delete serviceable pincodes; set base & per-kg charges |
| **Store Settings** | Update GSTIN, store name, address, GST rates |
| **Inventory** | View low-stock products (qty < 5) |
| **Categories** | Manage product categories |
| **Brands** | Manage product brands |
| **📊 Visitor Intelligence** | Site visitors, guest vs registered, browsers vs buyers, conversion rate, repeat customers, repeat products, failed searches, top search terms, 7-day trend chart |

---

## 🔧 Backend — REST API Reference

All endpoints are prefixed with `/api`. Authentication uses **Bearer JWT tokens**.

---

### 🔐 Auth (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user (requires OTP in body) |
| `POST` | `/send-registration-otp` | Public | Send 6-digit OTP to email before registration |
| `POST` | `/login` or `/signin` | Public | Login; returns access + refresh tokens |
| `POST` | `/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/logout` | Authenticated | Invalidate refresh token server-side |
| `GET` | `/me` | Authenticated | Get current user's account details |
| `PUT` | `/me/profile` | Authenticated | Update profile; re-issues JWT if phone changes |
| `PUT` | `/me/password` | Authenticated | Change password |
| `DELETE` | `/me` | Authenticated | Delete account (cascading cleanup) |
| `POST` | `/forgot-password` | Public | Send OTP to email for password reset |
| `POST` | `/reset-password` | Public | Reset password using OTP |
| `GET` | `/admin/users` | Admin | List all registered users |

---

### 🛍️ Products (`/api/products`, `/api/product`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/products` | Public | Get all products |
| `GET` | `/products/search` | Public | Search/filter: `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStockOnly`, `sortBy` |
| `GET` | `/product/{id}` | Public | Get single product by ID |
| `GET` | `/product/{id}/image` | Public | Serve primary product image bytes |
| `GET` | `/product/{id}/gallery/{imageId}` | Public | Serve a specific gallery image |
| `POST` | `/product` | Admin | Add new product (multipart: JSON + image + extra images) |
| `PUT` | `/product/{id}` | Admin | Update product |
| `DELETE` | `/product/{id}` | Admin | Delete product |
| `DELETE` | `/product/{productId}/gallery/{imageId}` | Admin | Delete a gallery image |

---

### 🛒 Cart (`/api/cart`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/{userId}` | Authenticated | Get user's full cart |
| `GET` | `/summary?userId=&couponCode=` | Authenticated | Get cart summary with coupon applied |
| `POST` | `/add?userId=&productId=&quantity=` | Authenticated | Add item to cart |
| `PUT` | `/update?userId=&productId=&quantity=` | Authenticated | Update item quantity |
| `DELETE` | `/remove?userId=&productId=` | Authenticated | Remove item from cart |
| `DELETE` | `/clear?userId=` | Authenticated | Clear entire cart |

---

### 📦 Orders (`/api/orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/` | Authenticated | Place a new order |
| `GET` | `/user/{userId}` | Auth (own) or Admin | Get orders by user |
| `GET` | `/{orderId}` | Auth (own) or Admin | Get single order |
| `GET` | `/admin` | Admin | Get all orders |
| `GET` | `/admin/analytics` | Admin | Revenue, order counts, trend metrics |
| `PUT` | `/{orderId}/status` | Admin | Update order status (automatically generates AWB and tracking details when status changes to SHIPPED) |
| `PUT` | `/{orderId}/payment-status` | Admin | Update order payment status (e.g., set to PAID for manual/COD payments; triggers customer payment confirmation email) |
| `PUT` | `/{orderId}/refund` | Admin | Process Razorpay refund |
| `PUT` | `/{orderId}/cancel` | Auth (own) | Cancel order with reason |
| `GET` | `/{orderId}/invoice` | Auth (own) or Admin | Download GST PDF invoice |
| `POST` | `/{orderId}/return-exchange` | Authenticated | Submit return/exchange request |
| `GET` | `/admin/return-exchange` | Admin | View all return/exchange requests |
| `PUT` | `/admin/return-exchange/{requestId}` | Admin | Update request status |

---

### 💳 Payments (`/api/payments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/create` | Authenticated | Create Razorpay payment order |
| `POST` | `/verify` | Authenticated | Verify Razorpay payment signature |
| `POST` | `/webhook` | Public | Handle Razorpay payment webhooks |

---

### 📊 Visitor Intelligence Analytics (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/event` | **Public** | Record PAGE_VIEW or ORDER_PLACED event from browser |
| `POST` | `/search` | **Public** | Log a search query with result count (0 = failed search) |
| `GET` | `/visitor-dashboard` | Admin | Full visitor intelligence dashboard (aggregated stats) |

> **Guest tracking:** The event & search endpoints require **no authentication** — guest visitors are tracked via a persistent `visitorId` stored in `localStorage` and a per-tab `sessionId` stored in `sessionStorage`.

---

### ❤️ Wishlist, 🎟️ Coupons, ⭐ Reviews, 📒 Addresses, 🚚 Shipping, ⚙️ Store Settings

| Module | Admin Endpoints | Public/Auth Endpoints |
|---|---|---|
| **Wishlist** | — | `POST /wishlist/add`, `GET /wishlist/{userId}`, `DELETE /wishlist/remove` |
| **Coupons** | `GET/POST/PUT/DELETE /admin/coupons` | `POST /coupon/validate` |
| **Reviews** | `GET /admin/reviews/pending`, `PUT /admin/reviews/{id}/moderate` | `GET /product/{id}/reviews`, `POST /product/{id}/reviews` |
| **Addresses** | — | `GET/POST /addresses`, `PUT/DELETE /addresses/{id}` |
| **Shipping** | `GET/POST/PUT/DELETE /admin/shipping/pins` | `GET /shipping/check-pincode`, `GET /shipping/shipping-charge` |
| **Store Settings** | `GET/PUT /admin/settings` | `GET /settings` |
| **Inventory** | `GET /admin/low-stock` | `POST /products/{id}/notify-restock` |
| **Categories** | `POST/DELETE /admin/categories/{id}` | `GET /categories`, `GET /categories/featured` |
| **Brands** | `POST/DELETE /admin/brands/{id}` | `GET /brands`, `GET /brands/featured` |
| **Feedback** | — | `POST /feedback` |

---

## 🗄️ Database — Entity / Table Reference (24 Tables)

| Table | Entity | Key Columns |
|---|---|---|
| `users` | `User` | `id`, `name`, `phoneNumber`, `email`, `password` (BCrypt), `verified` |
| `products` | `Product` | `id`, `name`, `brand`, `category`, `price`, `quantity`, `available`, `imgData` |
| `product_images` | `ProductImage` | `id`, `productId`, `imgData` (gallery images) |
| `carts` | `Cart` | `id`, `userId`, `lastUpdated` |
| `cart_items` | `CartItem` | `id`, `cartId`, `productId`, `quantity` |
| `orders` | `Order` | `id`, `userId`, `status`, `paymentMethod`, `totalAmount`, `address`, `couponCode` |
| `order_items` | `OrderItem` | `id`, `orderId`, `productId`, `name`, `quantity`, `price`, `category` |
| `payments` | `Payment` | `id`, `orderId`, `razorpayOrderId`, `razorpayPaymentId`, `status` |
| `wishlists` | `Wishlist` | `id`, `userId`, `productId` |
| `user_addresses` | `UserAddress` | `id`, `userId`, `label`, `line1`, `city`, `state`, `pincode`, `isDefault` |
| `reviews` | `Review` | `id`, `productId`, `userId`, `rating`, `comment`, `status`, `helpfulCount` |
| `feedbacks` | `Feedback` | `id`, `name`, `email`, `subject`, `message`, `rating`, `createdAt` |
| `coupons` | `Coupon` | `id`, `code`, `discountType`, `discountValue`, `minOrderValue`, `maxUses`, `active` |
| `serviceable_pins` | `ServiceablePin` | `id`, `pincode`, `city`, `state`, `baseCharge`, `perKgCharge`, `active` |
| `restock_subscriptions` | `RestockSubscription` | `id`, `productId`, `userEmail`, `notified` |
| `return_exchange_requests` | `ReturnExchangeRequest` | `id`, `orderId`, `userId`, `type`, `reason`, `status` |
| `store_settings` | `StoreSettings` | `id`, `storeName`, `address`, `gstin`, `cgstRate`, `sgstRate` |
| `categories` | `Category` | `id`, `name`, `description`, `featured`, `displayOrder`, `active` |
| `brands` | `Brand` | `id`, `name`, `description`, `logoUrl`, `featured`, `displayOrder`, `active` |
| `analytics_events` | `AnalyticsEvent` | `id`, `visitorId`, `sessionId`, `eventType`, `pagePath`, `userId`, `timestamp`, `ipAddress` |
| `search_log` | `SearchLog` | `id`, `query`, `resultCount`, `userId`, `sessionId`, `timestamp` |

> 🆕 **`analytics_events`** and **`search_log`** are auto-created by Hibernate on first run for the Visitor Intelligence feature.

---

## 📊 Visitor Intelligence System

A **self-hosted, privacy-first analytics system** built directly into the application — no third-party service like Google Analytics needed for core metrics.

### How It Works

```
Browser (localStorage)          Backend (Spring Boot)       Database (MySQL)
─────────────────────────────────────────────────────────────────────────────
visitorId (persistent UUID) ──► POST /api/analytics/event ──► analytics_events
sessionId (per-tab UUID)    ──► POST /api/analytics/search ──► search_log
trackPageView() on route    ──►                             ──► (aggregated for admin)
trackSearch() on API result ──►   (tied to fetchProducts)
trackOrderPlaced() on COD   ──►

Admin Panel ◄─── GET /api/analytics/visitor-dashboard ◄─── Aggregate JPQL queries
```

### Critical Design: Search Tracking

`trackSearch()` is called **inside the `fetchProducts` `.then()` callback** in `Home.jsx`, not inside `SearchFilterBar.jsx`. This ensures the search query and actual result count are always correctly paired — even during debouncing, retries, or rapid filter changes.

### Metrics Tracked

| Metric | Source | How |
|---|---|---|
| Unique Visitors | `analytics_events` | `DISTINCT visitorId` |
| Guest Visitors | `analytics_events` | `visitorId WHERE userId IS NULL` |
| Total Sessions | `analytics_events` | `DISTINCT sessionId` |
| Browsers Only | Computed | `totalSessions - buyerSessions` |
| Buyers | `analytics_events` | Sessions with `ORDER_PLACED` event |
| Conversion Rate | Computed | `buyers / totalSessions × 100%` |
| New Users This Month | `analytics_events` | New `userId` entries since month start |
| Registered Users | `users` table | `COUNT(*)` |
| Repeat Customers | `orders` | `GROUP BY userId HAVING COUNT > 1` |
| Repeat Products | `order_items` | `GROUP BY productId ORDER BY count DESC` |
| Failed Searches | `search_log` | `WHERE resultCount = 0` |
| Top Search Terms | `search_log` | `GROUP BY query ORDER BY count DESC` |
| 7-Day Visitor Trend | `analytics_events` | Daily `DISTINCT visitorId` per day |

### Frontend Tracking Files

| File | What it tracks |
|---|---|
| `src/utils/analytics.js` | UUID generation, `trackPageView()`, `trackSearch()`, `trackOrderPlaced()` |
| `src/utils/googleAnalytics.js` | GA4 via react-ga4: `gaTrackPageView()`, `gaTrackEvent()`, `gaTrackProductView()`, `gaTrackAddToCart()`, `gaTrackCheckoutStart()`, `gaTrackPurchase()`, `gaTrackSearch()` |
| `src/index.js` | `initGA()` — initializes GA4 before React renders |
| `src/App.js` | Every route change → `trackPageView(path)` + `gaTrackPageView(path)` |
| `src/components/Home.jsx` | `fetchProducts` result → `trackSearch(keyword, count)` |
| `src/components/CheckoutPopup.jsx` | Successful COD order → `trackOrderPlaced()` |
| `src/components/MakePayment.jsx` | Confirmed online payment → `gaTrackPurchase()` |

---

## 📈 Google Analytics 4 (GA4) Integration

Dual-layer analytics using **GA4 via `react-ga4`** alongside the self-hosted system.

### Setup

Set the environment variable before building the frontend:

```bash
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

In development mode, GA4 runs in `testMode` (events are not sent to Google's servers) and warns if the Measurement ID is missing.

### Events Tracked

| GA4 Event | Trigger | Function |
|---|---|---|
| `pageview` | Every route change | `gaTrackPageView(path)` |
| `view_item` | Product detail page mount | `gaTrackProductView(product)` |
| `add_to_cart` | Add to cart button click | `gaTrackAddToCart(product, qty)` |
| `begin_checkout` | Checkout page mount | `gaTrackCheckoutStart(items, total)` |
| `purchase` | Razorpay payment confirmed | `gaTrackPurchase({orderId, total, items, coupon})` |
| `search` | Search filter query fired | `gaTrackSearch(query, resultCount)` |
| Custom `failed_search` | Search returns 0 results | Within `gaTrackSearch()` |

---

## 🔒 Security Architecture

| Feature | Implementation |
|---|---|
| **Authentication** | JWT access tokens (24h) + refresh tokens (7 days) |
| **Token Refresh** | Silent refresh via Axios interceptor on 401; concurrent request queuing |
| **Token Revocation** | Server-side refresh token store; invalidated on logout |
| **Password Hashing** | BCrypt (`PasswordConfig`) |
| **Role-based Access** | `ROLE_USER` and `ROLE_ADMIN` via Spring Security |
| **Rate Limiting** | `RateLimitingFilter` — configurable max attempts & window |
| **Input Sanitization** | `InputSanitizationFilter` strips dangerous HTML/script content |
| **CORS** | Locked to `FRONTEND_ORIGIN` env variable |
| **Email OTP** | Registration & password reset verified via 6-digit OTP (5 min TTL) |

---

## 🔔 Notification Services

| Channel | Provider | Usage |
|---|---|---|
| **Email** | Gmail SMTP (JavaMail) | OTP, password reset, order confirmation, restock alerts, cart abandonment |
| **SMS** | Fast2SMS (primary) | OTP, order alerts |
| **SMS fallback** | Twilio | Backup SMS delivery |
| **WhatsApp** | Green API | Admin new-order alerts |
| **WhatsApp alt** | CallMeBot | Admin alert fallback |
| **Telegram** | Telegram Bot API | Admin new-order notifications |

---

## ⏱️ Background Jobs

| Job | Class | Description |
|---|---|---|
| **Cart Abandonment** | `CartAbandonmentScheduler` | Runs at configurable interval; detects idle carts and sends recovery emails |

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+ & npm
- MySQL 8.x (or Aiven MySQL instance)
- Maven 3.x

### 1. Backend Setup

```bash
cd Shrinath

# Configure environment variables (see table below)
./mvnw spring-boot:run
# Runs on http://localhost:8080
# Hibernate auto-creates all tables including analytics_events and search_log
```

### 2. Frontend Setup

```bash
cd shreenath-frontend
npm install
npm start
# Runs on http://localhost:3000
# Analytics tracking starts automatically on first page load
```

### 3. Environment Variables (Backend)

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` / `DB_URL` | JDBC connection string for TiDB Cloud / MySQL |
| `SPRING_DATASOURCE_USERNAME` / `DB_USERNAME` | Database username |
| `SPRING_DATASOURCE_PASSWORD` / `DB_PASSWORD` | Database password |
| `JWT_SECRET` | 64+ character random secret for JWT signing |
| `JWT_EXPIRATION_MS` | Access token expiry in ms (default: 86400000 = 24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token expiry in ms (default: 604800000 = 7d) |
| `ADMIN_PHONE_NUMBER` | Phone number granted admin role |
| `ADMIN_PASSWORD` | Admin account password |
| `ADMIN_EMAIL` | Admin email for notifications |
| `MAIL_USERNAME` | Gmail address for sending emails |
| `MAIL_PASSWORD` | Gmail App Password (not regular Gmail password) |
| `PAYMENT_GATEWAY_KEY_ID` | Razorpay API Key ID |
| `PAYMENT_GATEWAY_SECRET` | Razorpay API Secret |
| `FRONTEND_ORIGIN` | Frontend URL for CORS (default: http://localhost:3000) |
| `FAST2SMS_API_KEY` | Fast2SMS API key for SMS |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `GREENAPI_INSTANCE_ID` | Green API instance ID for WhatsApp |
| `GREENAPI_API_TOKEN` | Green API token |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_ADMIN_CHAT_ID` | Telegram chat ID for admin alerts |
| `CART_ABANDON_THRESHOLD` | Minutes before cart is considered abandoned (default: 30) |
| `BREVO_API_KEY` | API key for Brevo transactional HTTP API (for OTPs/notifications) |
| `BREVO_SENDER_EMAIL` | Verified sender email in Brevo dashboard |

### 4. Environment Variables (Frontend)

| Variable | Description |
|---|---|
| `REACT_APP_API_BASE_URL` | Backend base URL (default: http://localhost:8080) |
| `REACT_APP_GA_MEASUREMENT_ID` | Google Analytics 4 Measurement ID (e.g., `G-XXXXXXXXXX`) |

### 5. Docker (Backend)

```bash
cd Shrinath
docker build -t shrinath-backend .
docker run -p 8080:8080 \
  -e DB_URL=... -e DB_PASSWORD=... -e JWT_SECRET=... \
  shrinath-backend
```

---

## 📜 License

This project is proprietary. All rights reserved — Shrinath Cycle Store © 2025–2026.
