# 🚲 Shrinath Cycle Store — Full-Stack E-Commerce Platform

A full-featured bicycle e-commerce web application built with **React** on the frontend and **Spring Boot** on the backend, backed by a **MySQL** database. It supports user authentication, product management, cart & wishlist, Razorpay payments, order tracking, coupon engine, inventory alerts, GST invoicing, and a full admin panel.

---

## 📁 Project Structure

```
Shrinath-Cycle-Store/
├── Shrinath/               # Spring Boot Backend (Java 17)
│   ├── src/main/java/GuptaCycle/org/Shrinath/
│   │   ├── Controller/     # REST API controllers
│   │   ├── Service/        # Business logic
│   │   ├── Model/          # JPA entities
│   │   ├── Repository/     # Spring Data JPA repositories
│   │   ├── DTO/            # Data transfer objects
│   │   ├── Security/       # JWT, rate limiting, input sanitization
│   │   ├── Scheduler/      # Background jobs
│   │   └── Config/         # Security & password config
│   └── src/main/resources/
│       └── application.properties
│
└── shreenath-frontend/     # React Frontend (CRA)
    └── src/
        ├── components/     # All page components
        ├── pages/          # Admin panel, dashboard, order tracking
        ├── Context/        # Global app state (AppProvider)
        ├── api/            # Axios instance with auto token refresh
        ├── utils/          # Theme utilities
        └── config.js       # API base URL config
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| React Router DOM | 7.x | Client-side routing |
| Axios | 1.x | HTTP client with JWT interceptors |
| Bootstrap + React-Bootstrap | 5.x | Responsive UI components |
| React Icons | 5.x | Icon library |
| Vanilla CSS | — | Custom styling & animations |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 3.5.7 | Application framework |
| Spring Security | 6.x | Authentication & authorization |
| Spring Data JPA | 3.x | ORM / database layer |
| JJWT | 0.11.5 | JWT access & refresh tokens |
| iText 7 | 7.2.5 | PDF invoice generation |
| Spring Mail | — | Email notifications (Gmail SMTP) |
| Twilio SDK | 9.x | SMS / WhatsApp alerts |
| Lombok | — | Boilerplate reduction |
| MySQL Connector | — | Database driver |

### Database & Infrastructure
| Component | Details |
|---|---|
| Database | MySQL 8.4 (Aiven Cloud) |
| ORM Strategy | Hibernate DDL auto-update |
| Storage | LONGBLOB columns for images in DB |
| Deployment | Docker-ready; env-var driven config |

---

## 🌐 Frontend — Pages & Functions

### 🏠 Home (`/`)
- Hero banner with featured products carousel
- Category-based product browsing (Mountain, Road, Kids, etc.)
- Featured & new arrival product sections
- Search bar integration
- Dark/light theme toggle (persisted in `localStorage`)

### 🔐 Login (`/login`)
- Login using phone number **or** email + password
- Stores `token`, `refreshToken`, `userId`, `role`, `username` in `localStorage`
- Auto-redirects admin users to `/admin`
- Forgot password flow with OTP via email

### 📝 Register (`/register`)
- User registration with name, phone number, email, and password
- OTP email verification flow
- Redirects to login after success

### 🛒 Cart (`/cart`)
- Persistent server-side cart (survives page refresh and sessions)
- Add, remove, and update item quantities
- Move item to wishlist from cart
- Clear entire cart
- Real-time cart total and item count in Navbar badge
- Coupon code field for applying discounts

### 📦 Product Detail (`/product/:productId`)
- Full product info: name, brand, category, price, stock, description
- Primary image + multi-image gallery viewer
- Add to cart / Add to wishlist button
- Product reviews with ratings and optional photo
- Submit a star rating and written review
- Vote reviews as "Helpful"
- "Notify Me" modal for out-of-stock items (subscribe to restock email)
- Pincode serviceability checker
- Shipping charge estimator

### 🔍 Search & Filter (`SearchFilterBar`)
- Real-time keyword search
- Filter by category, brand, price range
- Toggle "In Stock Only"
- Sort by: Price (Low→High / High→Low), Newest, Rating

### 💳 Checkout (`/checkout`)
- Multi-step checkout popup
- Address selection from saved addresses or new entry
- Pincode delivery check
- Coupon code application with live discount calculation
- Order summary with itemized list, subtotal, discount, shipping, and grand total
- Payment method selection: **Razorpay (Online)** or **Cash on Delivery (COD)**

### 💰 Make Payment (`/makepayment`)
- Razorpay hosted checkout integration
- Creates payment order on backend, opens Razorpay modal
- Verifies payment signature on success
- Clears cart after successful payment
- Transaction PIN entry for secure confirmation (mobile-keyboard compatible)

### 📋 Orders (`/orders`)
- List of all orders for the logged-in user
- Order status chips: Pending, Confirmed, Shipped, Delivered, Cancelled, Returned
- Cancel order with reason
- Submit return/exchange request
- Download GST-compliant PDF invoice per order
- Real-time order status tracking link

### 📍 Track Order (`/track/:orderId`)
- Visual order tracking timeline
- Shows current status with timestamps
- AWB number display if shipped

### ❤️ Wishlist (`/wishlist`)
- View all wishlisted products
- Remove items from wishlist
- Move item to cart

### 📒 Address Book (`/addresses`)
- List all saved delivery addresses
- Add new address
- Edit existing address
- Delete address
- Set a default address

### 👤 User Account (`/useraccount`)
- View account info (name, email, phone)
- Navigate to edit profile, orders, wishlist, addresses
- Account activity log

### ⚙️ Settings (`/settings`)
- Edit profile name, phone number, email
- Change password (requires current password)
- Delete account
- Store settings display (for admin-configured store details)
- Dark/light theme toggle

### 💬 Feedback (`/feedback`)
- Contact/feedback form (name, email, subject, message)
- Sends email notification to admin
- Star rating submission

### 🛠️ Admin Panel (`/admin`) — *Admin Only*
| Section | Functions |
|---|---|
| **Dashboard** | Total revenue, total orders, total users, low-stock alerts, analytics charts |
| **Products** | Add, edit, delete products; upload primary + multiple gallery images; manage stock |
| **Orders** | View all orders; update order status (Pending → Confirmed → Shipped → Delivered); process refunds; delete orders |
| **Users** | View registered users list |
| **Coupons** | Create, edit, delete discount coupons (flat or percentage); set usage limits and expiry |
| **Reviews** | Moderate pending reviews (Approve / Reject) |
| **Return/Exchange** | View and process return/exchange requests |
| **Shipping PINs** | Add, edit, delete, toggle serviceable pincodes; set base & per-kg charges |
| **Store Settings** | Update GSTIN, store name, address, GST rates |
| **Inventory** | View low-stock products (qty < 5) |

### ➕ Add Product (`/addproduct`) — *Admin Only*
- Add new product with name, brand, category, price, description, quantity
- Upload primary image (JPEG/PNG/WebP, max 10 MB)
- Upload multiple gallery images

### ✏️ Update Product (`/updateproduct/:id`) — *Admin Only*
- Pre-filled form with existing product data
- Update any field including replacing images
- Toggle product availability

---

## 🔧 Backend — REST API Reference

All endpoints are prefixed with `/api`. Authentication uses **Bearer JWT tokens**.

---

### 🔐 Auth (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user |
| `POST` | `/login` or `/signin` | Public | Login (phone/email + password); returns access + refresh tokens |
| `POST` | `/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/logout` | Authenticated | Invalidate refresh token server-side |
| `GET` | `/me` | Authenticated | Get current user's account details |
| `PUT` | `/me/profile` | Authenticated | Update name, phone, email; re-issues JWT if phone changes |
| `PUT` | `/me/password` | Authenticated | Change password (requires current password) |
| `DELETE` | `/me` | Authenticated | Delete account and invalidate tokens |
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
| `PUT` | `/product/{id}` | Admin | Update product (multipart: JSON + optional new images) |
| `DELETE` | `/product/{id}` | Admin | Delete product |
| `DELETE` | `/product/{productId}/gallery/{imageId}` | Admin | Delete a gallery image |

---

### 🛒 Cart (`/api/cart`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/{userId}` | Authenticated (own) | Get user's full cart |
| `GET` | `/summary?userId=&couponCode=` | Authenticated (own) | Get cart summary with coupon discount applied |
| `POST` | `/add?userId=&productId=&quantity=` | Authenticated (own) | Add item to cart |
| `PUT` | `/update?userId=&productId=&quantity=` | Authenticated (own) | Update item quantity |
| `DELETE` | `/remove?userId=&productId=` | Authenticated (own) | Remove item from cart |
| `POST` | `/move-to-wishlist?userId=&productId=` | Authenticated (own) | Move cart item to wishlist |
| `DELETE` | `/clear?userId=` | Authenticated (own) | Clear entire cart |

---

### 📦 Orders (`/api/orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/` | Authenticated | Place a new order; clears cart if COD |
| `GET` | `/user/{userId}` | Authenticated (own) or Admin | Get orders by user |
| `GET` | `/{orderId}` | Authenticated (own) or Admin | Get single order |
| `GET` | `/admin` | Admin | Get all orders |
| `GET` | `/admin/analytics` | Admin | Revenue, order counts, trend metrics |
| `PUT` | `/{orderId}/status` | Admin | Update order status |
| `PUT` | `/{orderId}/refund` | Admin | Process Razorpay refund (full or partial) |
| `PUT` | `/{orderId}/cancel` | Authenticated (own) | Cancel order with reason |
| `POST` | `/{orderId}/cancel` | Authenticated (own) | Cancel order (POST alias) |
| `PUT` | `/{orderId}/address` | Authenticated (own) | Update delivery address on order |
| `DELETE` | `/{orderId}` | Admin | Delete an order |
| `POST` | `/{orderId}/return-exchange` | Authenticated | Submit return/exchange request |
| `GET` | `/admin/return-exchange` | Admin | View all return/exchange requests |
| `PUT` | `/admin/return-exchange/{requestId}` | Admin | Update return/exchange request status |
| `GET` | `/{orderId}/invoice` | Authenticated (own) or Admin | Download GST PDF invoice |

---

### 💳 Payments (`/api/payments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/create` | Authenticated | Create Razorpay payment order |
| `POST` | `/verify` | Authenticated | Verify Razorpay payment signature |
| `POST` | `/webhook` | Public | Handle Razorpay payment webhooks |

---

### ❤️ Wishlist (`/api/wishlist`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/add?userId=&productId=` | Authenticated (own) | Add product to wishlist |
| `GET` | `/{userId}` | Authenticated (own) | Get user's wishlist |
| `DELETE` | `/remove?userId=&productId=` | Authenticated (own) | Remove product from wishlist |

---

### 🎟️ Coupons (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/coupons` | Admin | Get all coupons |
| `POST` | `/admin/coupons` | Admin | Create a new coupon |
| `PUT` | `/admin/coupons/{id}` | Admin | Update a coupon |
| `DELETE` | `/admin/coupons/{id}` | Admin | Delete a coupon |
| `POST` | `/coupon/validate` | Authenticated | Validate coupon code and get discount amount |

---

### ⭐ Reviews (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/product/{productId}/reviews?sortBy=` | Public | Get approved reviews for a product (NEWEST / MOST_HELPFUL) |
| `POST` | `/product/{productId}/reviews` | Authenticated | Submit or update a review (with optional photo upload) |
| `GET` | `/review/{id}/photo` | Public | Serve review photo bytes |
| `POST` | `/review/{id}/helpful` | Authenticated | Vote a review as helpful |
| `GET` | `/admin/reviews/pending` | Admin | Get all pending reviews |
| `PUT` | `/admin/reviews/{id}/moderate` | Admin | Approve or reject a review |

---

### 📒 Addresses (`/api/addresses`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Authenticated | Get current user's saved addresses |
| `POST` | `/` | Authenticated | Save a new address |
| `PUT` | `/{id}` | Authenticated | Update an address |
| `DELETE` | `/{id}` | Authenticated | Delete an address |
| `PUT` | `/{id}/default` | Authenticated | Set an address as default |

---

### 🚚 Shipping (`/api/shipping`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/check-pincode?pincode=` | Public | Check if a pincode is serviceable |
| `GET` | `/shipping-charge?pincode=&weight=` | Public | Calculate shipping charge by pincode and weight |
| `GET` | `/admin/pins` | Admin | List all serviceable pincodes |
| `POST` | `/admin/pins` | Admin | Add a new serviceable pincode |
| `PUT` | `/admin/pins/{id}` | Admin | Update a pincode entry |
| `DELETE` | `/admin/pins/{id}` | Admin | Delete a pincode |
| `PUT` | `/admin/pins/{id}/toggle` | Admin | Toggle pincode active/inactive |
| `POST` | `/admin/awb/{orderId}` | Admin | Generate AWB number for an order |

---

### 📊 Inventory (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/low-stock` | Admin | Get products with quantity < 5 |
| `POST` | `/products/{id}/notify-restock` | Public | Subscribe to restock email notification for an OOS product |

---

### ⚙️ Store Settings (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/settings` | Public | Get basic store info (name, address) |
| `GET` | `/admin/settings` | Admin | Get full store settings (GSTIN, GST rates) |
| `PUT` | `/admin/settings` | Admin | Update store settings |

---

### 💬 Feedback (`/api`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/feedback` | Public | Submit a feedback form; triggers admin email notification |

---

### 🏷️ Categories & Brands

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | List all product categories |
| `POST` | `/api/admin/categories` | Admin | Add a new category |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Delete a category |
| `GET` | `/api/brands` | Public | List all brands |
| `POST` | `/api/admin/brands` | Admin | Add a new brand |
| `DELETE` | `/api/admin/brands/{id}` | Admin | Delete a brand |

---

## 🗄️ Database — Entity / Table Reference

| Table | Entity | Key Columns |
|---|---|---|
| `users` | `User` | `id`, `name`, `phoneNumber` (unique), `email` (unique), `password` (BCrypt), `verified` |
| `products` | `Product` | `id`, `name`, `brand`, `category`, `price`, `quantity`, `available`, `imgData` (LONGBLOB), `imgType` |
| `product_images` | `ProductImage` | `id`, `productId`, `imgData` (LONGBLOB), `imgType` (gallery images) |
| `carts` | `Cart` | `id`, `userId`, `lastUpdated` |
| `cart_items` | `CartItem` | `id`, `cartId`, `productId`, `quantity` |
| `orders` | `Order` | `id`, `userId`, `status`, `paymentMethod`, `totalAmount`, `address`, `couponCode`, `cancelReason`, `createdAt` |
| `order_items` | `OrderItem` | `id`, `orderId`, `productId`, `quantity`, `price` |
| `payments` | `Payment` | `id`, `orderId`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `amount` |
| `wishlists` | `Wishlist` | `id`, `userId`, `productId` |
| `user_addresses` | `UserAddress` | `id`, `userId`, `label`, `line1`, `city`, `state`, `pincode`, `isDefault` |
| `reviews` | `Review` | `id`, `productId`, `userId`, `rating`, `comment`, `status` (PENDING/APPROVED/REJECTED), `helpfulCount`, `photoData` (LONGBLOB) |
| `feedbacks` | `Feedback` | `id`, `name`, `email`, `subject`, `message`, `rating`, `createdAt` |
| `coupons` | `Coupon` | `id`, `code`, `discountType` (FLAT/PERCENT), `discountValue`, `minOrderValue`, `maxUses`, `usedCount`, `expiresAt`, `active` |
| `serviceable_pins` | `ServiceablePin` | `id`, `pincode`, `city`, `state`, `baseCharge`, `perKgCharge`, `active` |
| `restock_subscriptions` | `RestockSubscription` | `id`, `productId`, `userEmail`, `userId`, `subscribedAt`, `notified` |
| `return_exchange_requests` | `ReturnExchangeRequest` | `id`, `orderId`, `userId`, `type`, `reason`, `status`, `requestedAt` |
| `store_settings` | `StoreSettings` | `id`, `storeName`, `address`, `gstin`, `cgstRate`, `sgstRate` |
| `categories` | `Category` | `id`, `name` |
| `brands` | `Brand` | `id`, `name` |

---

## 🔒 Security Architecture

| Feature | Implementation |
|---|---|
| **Authentication** | JWT access tokens (24-hour expiry) + refresh tokens (7-day expiry) |
| **Token Refresh** | Automatic silent refresh via Axios response interceptor on 401; queues concurrent requests |
| **Token Revocation** | Server-side refresh token store; invalidated on logout |
| **Password Hashing** | BCrypt (`PasswordConfig`) |
| **Role-based Access** | `ROLE_USER` and `ROLE_ADMIN` enforced via Spring Security + admin phone number check |
| **Rate Limiting** | `RateLimitingFilter` on auth endpoints (configurable max attempts & window) |
| **Input Sanitization** | `InputSanitizationFilter` strips dangerous HTML/script content |
| **CORS** | Per-controller `@CrossOrigin` + global `SecurityConfig`; origin configurable via `FRONTEND_ORIGIN` env var |

---

## 🔔 Notification Services

| Channel | Provider | Usage |
|---|---|---|
| **Email** | Gmail SMTP (JavaMail) | OTP, password reset, order confirmation, feedback notification, restock alerts |
| **SMS** | Fast2SMS (primary) | OTP, order alerts |
| **SMS fallback** | Twilio | Backup SMS delivery |
| **WhatsApp** | Green API (your own number) | Admin new-order alerts |
| **WhatsApp alt** | CallMeBot | Admin alert fallback |
| **Telegram** | Telegram Bot API | Admin new-order notifications (recommended) |

---

## ⏱️ Background Jobs

| Job | Class | Description |
|---|---|---|
| **Cart Abandonment Scheduler** | `CartAbandonmentScheduler` | Runs at a configurable interval; detects carts idle beyond threshold minutes and can send reminder emails/notifications |

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+ & npm
- MySQL 8.x (or an Aiven MySQL instance)
- Maven 3.x

### 1. Backend Setup

```bash
cd Shrinath

# Copy and configure environment variables
# (Set DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, MAIL_USERNAME, MAIL_PASSWORD,
#  PAYMENT_GATEWAY_KEY_ID, PAYMENT_GATEWAY_SECRET, ADMIN_PHONE_NUMBER, ADMIN_PASSWORD)

./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### 2. Frontend Setup

```bash
cd shreenath-frontend
npm install
npm start
# Runs on http://localhost:3000
```

### 3. Environment Variables (Backend)

| Variable | Description |
|---|---|
| `DB_URL` | JDBC connection string for MySQL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | 64+ character random secret for JWT signing |
| `JWT_EXPIRATION_MS` | Access token expiry in ms (default: 86400000 = 24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token expiry in ms (default: 604800000 = 7d) |
| `ADMIN_PHONE_NUMBER` | Phone number granted admin role |
| `ADMIN_PASSWORD` | Admin account password |
| `ADMIN_EMAIL` | Admin email for notifications |
| `MAIL_USERNAME` | Gmail address for sending emails |
| `MAIL_PASSWORD` | Gmail App Password (not regular password) |
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

### 4. Docker (Backend)

```bash
cd Shrinath
docker build -t shrinath-backend .
docker run -p 8080:8080 \
  -e DB_URL=... -e DB_PASSWORD=... -e JWT_SECRET=... \
  shrinath-backend
```

---

## 📜 License

This project is proprietary. All rights reserved — Shrinath Cycle Store © 2025.
