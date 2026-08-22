# DineFlow

Multi-restaurant ordering, payment & delivery management platform. A monorepo with a Next.js (TypeScript) frontend and a NestJS (TypeScript, TypeORM, PostgreSQL) backend, managed as npm workspaces, built module by module per the platform spec.

```
dineflow/
├── frontend/   # Next.js 16 app (App Router, TypeScript)
├── backend/    # NestJS API (TypeScript, TypeORM, PostgreSQL, dynamic RBAC)
└── package.json  # root workspace scripts
```

## Prerequisites

- Node.js **≥ 20.9** (this repo was set up on Node 24 via `nvm`)
- PostgreSQL running locally (or via Docker) — nothing was installed for you, see below

## 1. Install dependencies

From the repo root (installs both workspaces):

```bash
npm install
```

## 2. Set up PostgreSQL

Create a database for the app. Either with a local Postgres install:

```sql
CREATE DATABASE dineflow;
```

or with Docker:

```bash
docker run --name dineflow-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dineflow -p 5432:5432 -d postgres:16
```

## 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env` — DB credentials and JWT secrets. Generate real secrets for anything beyond local dev (`openssl rand -hex 64`).

## 4. Run migrations and seed the first admin

The schema is owned entirely by migrations (no `synchronize`) from Module 2 onward:

```bash
npm run migration:run -w backend
npm run seed:admin -w backend   # creates the first ADMIN user — see backend/.env for credentials
```

## 5. Run in development

From the root, runs both apps concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000/api/v1 (health check at `/api/v1/health`, Swagger docs at `/api/docs`)

Or run them individually: `npm run dev:frontend` / `npm run dev:backend`.

> **Windows note:** Nest's watch-mode restarter shells out to `taskkill` on every file change. If your shell's `PATH` doesn't include `C:\Windows\System32` (true for some Git Bash / restricted PowerShell setups), the restart fails and the *old* process survives as a zombie still bound to port 4000 — serving stale code while looking like everything's fine. Fix: `$env:PATH += ";C:\Windows\System32"` before `npm run dev -w backend`. If you ever get inexplicable stale behavior after an edit, check `Get-NetTCPConnection -LocalPort 4000` for a leftover process first.
>
> **Low-memory note:** this dev machine has 8GB RAM. Running both dev servers plus a `nest build`/`jest` run at the same time can OOM-kill the build (`JavaScript heap out of memory`). If a build/test run crashes for no obvious reason, stop both dev servers first (`Get-Process -Name node | Stop-Process -Force`), run the build/tests, then restart the servers.

## Backend architecture

NestJS, organized per the spec's modular architecture (`src/modules/<name>/{entities,dto}`, `controllers`, `services`). Schema changes are migrations only — see `backend/src/database/migrations/`. `backend/src/database/data-source.ts` is the CLI-only datasource (migrations); the running app gets its TypeORM config from `backend/src/config/typeorm.config.ts` via `ConfigService`.

### Modules built so far

**Module 2 — Users, Roles, Permissions & Auth** (`src/modules/{auth,users,roles}`)
- Fully dynamic RBAC: `roles`/`permissions`/`role_permissions` tables, admin-manageable at runtime. The 5 spec roles (`ADMIN`, `RESTAURANT_ADMIN`, `RESTAURANT_STAFF`, `CUSTOMER`, `DELIVERY_PARTNER`) are seeded as `is_system` roles and can't be deleted/renamed.
- JWT access tokens (15 min) carry the caller's resolved permission list; routes declare requirements with `@RequirePermissions('module:action')`, checked by `PermissionsGuard`. Every route requires auth by default — opt out with `@Public()`.
- Refresh tokens: opaque, hashed at rest, rotated on every use, with theft/reuse detection (reusing a revoked token revokes its whole session family).
- Register/login/refresh/logout/logout-all, email verification, forgot/reset password. Email/SMS sending is stubbed to `console.log` — wire up the real Notifications module (§29) later.
- `npm run seed:admin -w backend` bootstraps the first `ADMIN` user (not a migration — needs bcrypt).

**Module 3 — Restaurant Registration & Approval** (`src/modules/restaurants`)
- Public `POST /restaurants/register` creates a `PENDING` restaurant + its first `RESTAURANT_ADMIN` user atomically, then auto-logs them in (same token shape as customer register).
- Admin lifecycle: `/admin/restaurants/:id/{approve,reject,suspend,block,reinstate}`, guarded by a server-side state machine (e.g. `PENDING→SUSPENDED` is rejected as `INVALID_STATUS_TRANSITION`; `BLOCKED` is terminal). Every transition is recorded in `restaurant_status_history` (who/when/why) — there's no Audit Log module yet, so this table is the only trail restaurant lifecycle changes get for now.
- Self-service `/restaurant/me/*` routes (profile, business hours, holidays, documents) are identity-scoped via `RestaurantMemberGuard` + `req.user.restaurantId` — never the dynamic permission system, since these aren't admin actions.
- Document uploads (`POST /restaurant/me/documents`, multipart) go to local disk (`backend/uploads/`, gitignored), validated by mime type/size, served back only through an authenticated route — never `express.static`. Admin can verify/reject each document.
- Deliberately **not** storing raw bank account numbers on `restaurants` — that belongs in the Payment module's gateway-hosted onboarding (Module 17), not our DB.
- **Restaurant logo** (added later, alongside the dashboard redesign below): `logo_path`/`logo_original_name`/`logo_mime_type` columns directly on `restaurants` (same shape as the customer profile photo, minus the 1:1-table split — `restaurants` is already its own table). `POST`/`DELETE /restaurant/me/logo` (multipart, `RestaurantMemberGuard`) manage it; unlike a customer's own profile photo, it's served through a **public** route (`GET /restaurants/:id/logo`, no auth) since customers need to see it without a session — same reasoning as Module 16's public product-photo route. `GET /restaurants` and every `StoreRestaurant` summary now include a `hasLogo` boolean so the frontend only attempts the image request when one actually exists.
- **Real bug found and fixed while wiring this up**: Helmet's default `Cross-Origin-Resource-Policy: same-origin` header was silently blocking the frontend (a different origin in dev) from loading *any* publicly-served image via a plain `<img src>` — including Module 16's product photos, which had been silently broken since that module shipped (nobody noticed because the graceful placeholder fallback looks intentional either way). Fixed globally in `main.ts`: `helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })` — every other Helmet protection (CSP, HSTS, frame-options) stays at its default.

**Module 4 — Subscription Plans & Free Trial** (`src/modules/subscriptions`)
- One row per restaurant in `restaurant_subscriptions` (mutable status), append-only `subscription_events` audit log — same pattern as Module 3's status history.
- Trial auto-starts on restaurant approval via an event (`restaurant.status_changed`, `@nestjs/event-emitter`) rather than a direct service call — `RestaurantsService` and `SubscriptionsService` stay decoupled. "Only one free trial ever" is structural: the listener skips if the restaurant already has any subscription row, not just a convention.
- Subscribing snapshots price/commission from the plan server-side (`priceSnapshot`/`commissionValueSnapshot` — the client only sends a `planId`). A later plan price change never retroactively affects an already-subscribed restaurant.
- A daily cron (`@nestjs/schedule`, borrowed early from Module 35 the same way Module 3 borrowed `multer`) expires trials past `trialEndsAt` and logs reminder events at the configured day thresholds.
- Seeded with the spec's own BASIC (₹999/mo, 10%) / PRO (₹1999/mo, 5%) / PREMIUM (₹2999/mo, 0%) example plans so the system is immediately exercisable.
- **Deliberate limitation, flagged**: no payment gateway exists yet (Module 17), so `subscribe` activates a plan immediately instead of going through a pending-payment step.

**Module 5 — Commission System** (`src/modules/commission`)
- `calculateCommission(restaurantId, amount)` resolves the rate through a precedence chain — an active `commission_rules` override beats the subscription plan's snapshot, which beats the trial commission rate — then computes the platform/restaurant split. Percentage: `amount * value / 100`. Fixed: clamped so it can never exceed the order amount (never a negative restaurant payout).
- `CommissionType` (PERCENTAGE/FIXED) moved to `common/enums/` — it's shared between `subscription_plans` and `commission_rules` now, no longer owned by one module.
- A gap in Module 4 fixed here: `trial_settings` gets `trial_commission_type`/`trial_commission_value` columns (§5 always listed "Trial commission rate" as an admin setting; it just hadn't been added yet). Defaults to 0% — trials are commission-free unless admin sets otherwise.
- At most one active `commission_rules` row per restaurant — creating a new one deactivates the prior one in the same transaction, preserving history rather than deleting it (same shape as Module 3/4's audit tables).
- **Deliberate scope limit, flagged**: no `order_commissions` snapshot-per-order table yet — it's meaningless without an `orders` table to reference (Orders is a much later module). What's built now is the calculation engine itself (`CommissionService.calculateCommission`) plus preview endpoints; Orders will call this same service and persist its result once it exists.

**Module 6 — Categories** (`src/modules/categories`)
- Restaurant-owned menu sections (e.g. "Starters", "Main Course") — deliberately *not* a platform-wide cuisine taxonomy for customer browsing/filtering, even though the spec's Admin Panel list mentions "Categories" alongside Products/Coupons. That's a discovery feature with no UI to consume it until the Customer module exists; building it now would be speculative.
- Unique on `(restaurant_id, name)`; a Postgres unique-violation (`23505`) is mapped to a friendly `CATEGORY_NAME_TAKEN` rather than leaking the raw DB error.
- Reordering is a dedicated bulk endpoint (`PUT .../reorder`), not N individual PATCHes — validates the submitted ID list is an *exact* match (same size, no foreign/missing IDs) against the restaurant's own categories before applying anything, so a bad list rejects atomically rather than partially reordering.
- Delete is blocked if any product references the category — a structural no-op today (no `products` table until Module 7) but the guard and its error code (`CATEGORY_IN_USE`) exist now so Module 7 only has to add the real `COUNT` query.
- Admin gets read-only oversight (`GET /admin/restaurants/:id/categories`, new `categories:read` permission); restaurants own full CRUD + reordering via the same identity-scoped `RestaurantMemberGuard` pattern as every other self-service module.

**Module 7 — Products/Menu** (`src/modules/products`)
- `products` (each FK'd to a `category`, `ON DELETE RESTRICT` — a category can't be dropped out from under a live product, backing up the app-level `CATEGORY_IN_USE` guard at the DB level too), plus `product_variants` (mutually-exclusive choice, e.g. Small/Medium/Large — an *absolute* price, not a delta off `base_price`) and `product_addons` (independent multi-select extras, e.g. Extra Cheese — an *additive* price).
- Genuine circular module dependency with Categories, resolved with `forwardRef()` on both sides (both `@Module` imports and both services' constructor injections): `ProductsService.create/update` validates `categoryId` belongs to the caller's restaurant via `CategoriesService.findOneOrThrow`; `CategoriesService.remove` now calls the real `ProductsService.countInCategory()` instead of Module 6's hardcoded-0 stub.
- `isActive` (permanent menu visibility) and `isAvailable` (day-to-day "out of stock" toggle) are deliberately separate booleans — a temporarily 86'd item shouldn't need re-adding, just a `PATCH .../availability`.
- Images are a small `jsonb` array on the product row itself (id/path/originalFileName/mimeType), not a join table — uploaded via `multipart/form-data` (multer `diskStorage`, same 5MB/JPEG-PNG-WebP validation and forward-slash-only stored-path convention as Module 3's documents), served back only through an authenticated route.
- Same exact-match bulk reorder pattern as Module 6, scoped to a category (`PUT .../reorder` with `{ categoryId, orderedIds }`) — rejects atomically if the list doesn't exactly match that category's products.
- Admin gets read-only oversight (`GET /admin/restaurants/:restaurantId/products`, new `products:read` permission); restaurants own full CRUD + variants/add-ons/images/reorder via `RestaurantMemberGuard`.
- Frontend: `/restaurant/products` (grouped by category, inline create form, per-product "Manage" panel for edit/variants/add-ons/photos, up/down reorder scoped within each category) + a read-only products modal on `/admin/restaurants` matching the Categories modal pattern. Product photos render via a small authenticated-blob-to-object-URL helper (`fetchAuthenticatedBlob` in `api-client.ts`) since `<img src>` can't carry a Bearer token.

**Module 8 — Customer Profile** (`src/modules/customers`)
- Registration/login for customers already worked before this module — `POST /auth/register` has always defaulted new signups to the `CUSTOMER` role, and `/admin/users` already gives admins generic list/status/role management across every role. This module adds only what was genuinely missing: a place for a customer to view/edit profile extras.
- `customer_profiles` is a 1:1 extension of `users` (`user_id UNIQUE REFERENCES users(id) ON DELETE CASCADE`) — kept as its own table rather than columns on `users`, same reasoning as `restaurants` not being columns on `users`. The row is created lazily on first access, not at registration time, so `auth.service.ts` stays untouched.
- New `CustomerGuard` (`/customer/me/*`) mirrors `RestaurantMemberGuard`'s identity-check shape, but keys off `roleName === CUSTOMER` instead of a restaurantId.
- `PATCH /customer/me/profile` can update `users` fields (fullName/phone) and `customer_profiles` fields (dateOfBirth/gender) together in one request — the two-table split is an internal detail, not something the API exposes — wrapped in one transaction so a phone-uniqueness conflict can't leave one table updated and the other not. A `23505` on `users.phone` maps to `PHONE_ALREADY_IN_USE`.
- Profile photo upload/delete/serve follows the exact same multer conventions as every other upload in the app (5MB/JPEG-PNG-WebP, forward-slash stored paths, authenticated file-serving route) — a customer has at most one photo, so uploading a new one deletes the old file.
- Email is deliberately **not** editable here — an email change needs its own verification flow, out of scope for this slice.
- Frontend: `/profile` (photo upload/remove via a circular-avatar `ProfilePhoto` component, account-details form) — the first real customer-facing page beyond auth. Login/register/homepage CTAs now route customers here instead of back to the still-storefront-less homepage.

**Module 9 — Customer Addresses** (`src/modules/addresses`)
- `customer_addresses` reuses the exact field convention already established on `restaurants` (`addressLine1/2, city, state, postalCode, country, latitude, longitude`), plus delivery-specific fields: `label` (HOME/WORK/OTHER), `receiverName`/`receiverPhone` (may differ from the account owner), `landmark`, `deliveryInstructions`, `isDefault`. A soft cap of 20 addresses/customer guards against unbounded growth.
- The first address a customer ever saves is forced to `isDefault=true` regardless of what was requested — there's never a "no default" state right after onboarding. Any operation that changes which address is default (create-as-default, `PATCH .../default`, `PATCH :id` with `isDefault: true`, or deleting the current default) wraps the unset-old + set-new in one transaction so two rows can never both be default; deleting the default auto-promotes the oldest remaining address if one exists.
- Reuses the `CustomerGuard` from Module 8 — no new guard needed. No admin oversight endpoint in this slice (private customer data, no support-tooling need yet).
- `AddressesService` is exported from its module so a later Cart/Orders/Delivery module can resolve a customer's default/selected address without duplicating the lookup.
- Frontend: an "Saved addresses" section added to `/profile` — add/edit/delete, set-default, full address form (`AddressForm`/`AddressList` components).

**Module 10 — Cart** (`src/modules/cart`)
- A single `cart_items` table — no separate "cart" header row, there's nothing to hang off one beyond the items. Deliberately stores **no price**: a cart is pre-commitment, so unit/line prices are computed live from the current catalog on every read; snapshotting happens at Order creation (a later module), not here.
- Restaurant-scoped like most food-delivery apps: adding an item from a different restaurant than what's already in the cart is rejected with the existing restaurant's name (`CART_DIFFERENT_RESTAURANT`) unless the request sets `replaceCart: true`, which clears the old cart in a transaction before adding the new item. `restaurantId` is always derived server-side from the fetched product, never accepted as client input.
- Adding an item merges into an existing matching line (same product + variant + add-on set) instead of duplicating it; validates the product is active/available and that a given `variantId`/`addonIds` actually belong to that product; quantity is capped 1–50 per line.
- A cart line whose product/variant/add-on has since gone inactive is kept but flagged `isAvailable: false`, not silently dropped — the customer sees why before checkout.
- **New minimal public "browse" endpoints** added alongside this module, since Cart is otherwise unreachable from a real UI with no storefront yet: `GET /restaurants` (approved restaurants only) and `GET /restaurants/:id/menu` (active categories + active products, each with their active variants/add-ons). This is deliberately not the full storefront (no search/filters/ratings) — just enough to make add-to-cart possible from a browser.
- Frontend: `/restaurants` (browse list), `/restaurants/:id` (menu with per-product variant/add-on/quantity picker and "Add to cart", including the replace-cart confirmation flow), `/cart` (quantity controls, remove, clear, subtotal, checkout).

**Module 11 — Orders** (`src/modules/orders`)
- Converts a validated cart into an **immutable, money-adjacent** record — the opposite of Cart's deliberately live pricing. `orders` snapshots the delivery address (copied from the selected `customer_addresses` row at checkout — a later address edit/delete never rewrites history) and the commission split; `order_items` snapshots product/variant/add-on names and prices. `customer_id`/`restaurant_id` use `ON DELETE RESTRICT` (financial records must never silently vanish); `order_items.product_id`/`variant_id` stay nullable `SET NULL` since Products already supports hard delete.
- Checkout calls Module 5's `CommissionService.calculateCommission` directly — the exact call that service's own notes flagged as deferred until an `orders` table existed. Rejects if the cart is empty or any line is flagged unavailable (the customer must fix the cart first, nothing is auto-removed).
- Order fulfillment reuses Module 3's exact status-transition pattern: an `ALLOWED_TRANSITIONS` map plus an append-only `order_status_history` table, guard-check + update + history row in one transaction. `PLACED→CONFIRMED→PREPARING→READY→OUT_FOR_DELIVERY→DELIVERED`, with `CANCELLED` reachable from `PLACED`/`CONFIRMED`/`PREPARING` by the restaurant. Customer self-cancel is stricter — only while still `PLACED`.
- `paymentStatus` only ever ends up `PENDING` in this module — wired to a real payment flow in Module 12 right after.
- Small additive change to Module 10 alongside this: `CartLineView.addonNames: string[]` became a richer `addons: {id,name,price}[]`, since Orders needed the per-add-on price breakdown Cart's view didn't expose. Also exported `CartService` (was previously module-private) so Orders' checkout can read the validated, live-priced cart it converts.
- Unlike private customer data (Addresses/Profile), admin gets real oversight here (new `orders:read` permission, `GET /admin/orders`) — orders are platform-relevant financial records.
- Frontend: checkout wired into `/cart` (delivery-address picker), `/orders` + `/orders/:id` (customer order history/detail/cancel), `/restaurant/orders` (fulfillment queue with a "mark next status"/cancel per order), `/admin/orders` (read-only table).

**Module 12 — Payment** (`src/modules/payments`)
- No real gateway credentials exist in this dev environment, so this builds the **correct architecture** instead of a fake shortcut: a swappable `PaymentGateway` interface, backed by `MockPaymentGateway` — shaped exactly like a real Razorpay/Stripe adapter (an order-creation call, then `HMAC-SHA256(gatewayOrderId|gatewayPaymentId, secret)` signature verification, the actual mechanism real gateways use). Swapping in a real gateway later means writing one new class and deleting the mock-complete dev route — nothing else in the module changes.
- `payments` is **not** unique on `orderId` — a failed attempt is a legitimate, retryable outcome, not an error state to overwrite. `orders.paymentStatus` always reflects the most recent attempt.
- `verify()` updates the `payments` row and the order's `paymentStatus` together in one transaction (the same "cross-table business operation" shape as Order's own status-transition method) — a payment can never end up `SUCCEEDED` while its order stays `PENDING`. Re-verifying an already-processed payment is rejected outright (idempotency against double submission).
- A `mock-complete` dev-only endpoint stands in for "the browser was redirected back from the gateway's hosted checkout with a payment id + signature" — it generates that payload server-side (where the secret actually lives) and then runs it through the *exact same* `verify()` a real callback would hit, so the real verification code path is genuinely exercised, not bypassed.
- Admin oversight here too (new `payments:read` permission, `GET /admin/payments`) — same reasoning as Orders.
- Frontend: a `PaymentPanel` on `/orders/:id` — "Pay ₹X" → initiate → clearly-labeled mock checkout ("Simulate successful/failed payment") → reflects the result. New `/admin/payments` read-only table.
- **First real Playwright visual verification in five sessions**: after repeated skips due to low RAM, a scripted walkthrough (seed a refresh token into `localStorage`, then click through menu → add-to-cart → cart → checkout → pay) confirmed the entire Modules 10–12 UI chain renders and behaves correctly end-to-end, not just compiles.

**Module 13 — Payment Webhooks** (`src/modules/webhooks`)
- The reliability backstop Module 12's synchronous `/verify` doesn't have: if a customer's browser never calls back (closed tab, dropped connection, device dies right after paying), the order would otherwise stay `PENDING` forever even though the gateway actually captured the payment. `POST /webhooks/payments` is `@Public()` and authenticated by an `X-Webhook-Signature` header instead of a JWT — a genuinely new auth pattern — verified as `HMAC-SHA256` over the **exact raw request bytes**, which required enabling Nest's raw-body capture (`rawBody: true`) at bootstrap; any JSON re-serialization before verification would silently break a real gateway's signature, a common real-world integration bug. Uses its own `PAYMENT_WEBHOOK_SECRET`, separate from Module 12's client-checkout secret, matching how a real gateway issues these independently.
- **Claim-then-process idempotency**: `webhook_events` is unique on `(gateway, gatewayEventId)`, and that constraint — not an application-level check — is what makes a redelivered event (normal at-least-once gateway delivery semantics) a 200 no-op instead of a double-apply. A webhook racing the synchronous `/verify` path for the same payment is handled the same way `verify()`'s own idempotency guard works: whichever one lands first wins, the second is a no-op.
- Extracted the payment+order transactional update (previously only inside `verify()`) into one shared private method both entry points call — same "don't duplicate a cross-table business operation" principle as everywhere else in the codebase.
- A `mock-send` dev-only endpoint builds a correctly-signed payload and runs it through the *real* `processPaymentWebhook()` in-process (not an HTTP self-call) — same "exercise the real code path, don't bypass it" approach as Module 12's `mock-complete`.
- Every delivery is logged regardless of outcome — valid, invalid, duplicate, or processing-failed — an append-only audit trail in the same spirit as `restaurant_status_history`/`order_status_history`, just logging an *external* event hitting the system instead of an internal state change. Admin oversight reuses the `payments:read` permission (`GET /admin/webhooks`) rather than adding a new one — webhook deliveries are payment-domain infrastructure, not a separate resource.
- Frontend: `/admin/webhooks` — a read-only delivery log (event type, gateway, outcome, processing error if any). Deliberately **no customer-facing UI** — webhooks are invisible infrastructure from a customer's perspective in a real system, so duplicating Module 12's "simulate payment" buttons with a second "simulate via webhook" control would just be confusing without adding anything a real user would ever see.

**Module 14 — Refunds** (`src/modules/refunds`)
- Found a real, concrete gap before designing this: **cancelling a `PAID` order never triggered any money back to the customer** — `OrdersService`'s cancellation methods never looked at `paymentStatus` at all. A restaurant could cancel an order the customer already paid for and the money would just stay taken. This module closes exactly that hole.
- **Event-driven, not a direct dependency** — Orders gained a new `order.status_changed` event (emitted only after a transition commits), and `RefundsService` listens for it, acting only when `toStatus === CANCELLED` and the order's `paymentStatus === PAID`. This is the *exact same decoupling shape* as Module 4's restaurant-approval-starts-a-trial listener — Orders stays completely unaware Refunds exists.
- The gateway interface gained a `refund()` method (mocked, same realistic-shape-but-fake pattern as Modules 12–13). The external call happens *outside* any DB transaction (an API call can't be rolled back); its outcome — success or failure — is what gets recorded, not assumed. A refund is its own row, not a mutation of the original `payments` row: a payment succeeding and its later refund are two separate financial events.
- On success, `order.paymentStatus` flips to `REFUNDED`; a failed gateway refund call is recorded as a `FAILED` refund row (visible to admin) rather than thrown away or silently retried forever. Only full refunds of `order.totalAmount` — partial/manual refunds for other reasons (bad food, missing items) are a reasonable future module, deliberately not built here.
- Admin oversight reuses `payments:read` (`GET /admin/refunds`) — same domain-grouping reasoning as Webhooks.
- Frontend: the order detail page (`/orders/:id`) shows a "Refunded ₹X" banner when applicable, reusing the existing `PaymentPanel` rather than a new page; `/admin/refunds` — a read-only log.
- Verified the real gap end-to-end: customer pays → restaurant confirms → restaurant cancels → order automatically flips to `REFUNDED` with a `SUCCEEDED` refund row, all without either side explicitly "issuing" anything.

**Module 15 — Ledger** (`src/modules/ledger`)
- The running per-restaurant balance: what the platform currently owes each restaurant, right now. Note **"Marketplace Split" is already effectively done** — Order (Module 11) already computes and snapshots `commissionAmount`/`restaurantPayoutAmount` via `CommissionService` (Module 5) at checkout time. This module is what turns those per-order numbers into a running balance restaurants can actually see.
- **Single-entry, signed-amount bookkeeping**, not full double-entry — `ledger_entries.amount` is positive for a credit, negative for a debit, so a balance is always a plain `SUM(amount)`, computed fresh on every read rather than stored/cached anywhere it could drift out of sync with its own entries.
- **Event-driven a third time**, same decoupling shape as Module 14: `PaymentsService` gained a `payment.succeeded` event and `RefundsService` gained a `refund.succeeded` event (both emitted only after their transaction commits); `LedgerService` listens to both — crediting `order.restaurantPayoutAmount` on payment success, debiting the *exact same amount* (not the customer's full refund, which includes the platform's commission) on refund success. Neither Payments nor Refunds knows Ledger exists.
- Both events fire at most once per payment/refund by construction — the upstream `CREATED`-only guards already established in Modules 12–14 prevent `applyOutcome`/`initiateForOrder` from ever running twice for the same row, so Ledger needed no separate idempotency check of its own.
- New `ledger:read` permission (rather than reusing `payments:read` like Webhooks/Refunds) — a restaurant's running balance is central enough to the business to warrant its own admin permission.
- Frontend: `/restaurant/ledger` (balance stat card + entry history, credits green/debits red) and a `LedgerModal` on `/admin/restaurants`, matching the Commission/Categories/Products modal pattern — Ledger is inherently restaurant-scoped, so it fits the per-row-modal shape better than a platform-wide list like Orders/Payments/Webhooks/Refunds.
- Verified end-to-end: two paid orders credit twice, cancelling one debits exactly what it credited, balance nets back correctly, admin's view matches the restaurant's own, and a second restaurant's ledger stays completely isolated.

**Module 16 — Customer Home Page** (`src/modules/{food-categories,banners,offers,blogs,favorites,notifications,store}`)
- Built ahead of its position in the module sequence, at explicit user request, as a complete customer-facing storefront home page before continuing to Settlement/Payout. Seven new backend modules plus one `Restaurant.isFeatured` flag, all admin-manageable CMS-style content — nothing on the page is hardcoded.
- `FoodCategories` (cuisine taxonomy for browsing — distinct from Module 6's restaurant-owned menu-section `categories`), `Banners` (promotional carousel, active-window filtering via the same "4-bound-combination" `IsNull()`/`LessThanOrEqual()`/`MoreThanOrEqual()` query shape as Module 5's commission overrides), `Offers` (coupon codes — **display-only**, deliberately not wired into checkout discount math yet; that's the spec's own separate, later Coupons module), `Blogs`/`BlogCategories` (articles with publish/draft + `publishedAt` stamping). All four share one `content:read`/`content:manage` permission pair rather than one pair per content type, a deliberate consistency call (contrast Ledger getting its own dedicated permission in Module 15 for feeling like a more central capability).
- `Favorites` (polymorphic restaurant-or-product heart-toggle, unique on `(userId, targetType, targetId)`, re-favoriting is idempotent not an error) and `Notifications` (real trigger: listens to Module 11's `order.status_changed` event, same decoupled shape as every other cross-module listener in this app — no direct dependency on Orders). Both live under `/customer/me/*`, not the spec's illustrative `/store/favorites` — kept consistent with this codebase's own established identity-scoped-route convention instead.
- `Store` is the new aggregation/discovery layer: `GET /store/home` (one call for banners/categories/featured+popular restaurants/popular+trending products/offers/blogs — an anonymous-safe public aggregate), `GET /store/search` (restaurant/product/category substring match), `GET /store/restaurants/nearby` (real Haversine distance, filtered against each restaurant's *own* `deliveryRadiusKm`, not a fixed radius).
- **Personalization is a separate, fully-authenticated endpoint** (`GET /customer/me/home-personalization` → recommended restaurants + recently-ordered), not folded into `/store/home`. Reason: this app's global `JwtAuthGuard` short-circuits entirely on `@Public()` routes, so `req.user` is never populated there even with a valid token — there's no "optional auth" middle ground. Splitting personalization into its own call is also what makes the page's per-section error isolation real: a failure loading personalization (or nearby, gated on the customer setting a location) can never affect the public aggregate or vice versa.
- "Order again" intentionally does **not** one-click recreate a past order — price/availability/variants may have changed — it links to the restaurant's live menu so re-adding goes through the exact same server-side validation as any other add-to-cart, per the spec's own "never blindly recreate an order" requirement.
- **Flagged, deliberate gaps**: no star ratings anywhere (no Reviews module exists yet — a fabricated number would be worse than none); the cuisine strip is browse-only, not a real filter (products/restaurants aren't tagged with a food category in the schema); a manually-typed delivery location is a label only — only "use my current location" produces real coordinates, since no geocoding service is wired up.
- A public product-photo route was added to Module 10's `PublicMenuController` (`GET /restaurants/:restaurantId/menu/products/:productId/images/:imageId/file`) — the only prior image route was identity-scoped to a restaurant's own authenticated staff, unusable by an anonymous storefront visitor.
- Frontend: full homepage rebuild at `/` — header (location selector, debounced search with recent-searches history, notification bell, mini-cart preview, favorites shortcut), sticky mobile bottom nav, auto-sliding banner carousel, cuisine strip, quick-filter chips, and independently loading/erroring/empty-stated horizontal sections for featured/popular/recommended/nearby restaurants, popular/trending/order-again products, offers, and blog articles — plus new `/blogs`, `/blogs/[slug]`, and `/favorites` pages, and favorite-heart wiring into the existing `/restaurants` list and menu pages.
- Verified with a live backend smoke test (favorites, notifications, search, nearby-Haversine, recommended-with-real-order-history and its popular-restaurants fallback, all passing against the real running server) and Playwright screenshots at desktop and mobile viewports, both anonymous and logged-in (notifications dropdown, cart preview, favorite-toggle persisting through a page reload) — zero console/page errors.

Unit tests: `npm test -w backend` (142 tests, 22 suites — auth token rotation/reuse-detection, login rejection paths, role protection rules, restaurant status-transition guard, slug uniquing, trial-start eligibility, subscription snapshotting, plan-deletion guard, commission precedence chain, fixed-commission clamping, override-deactivation-on-create, category name-collision mapping, reorder validation, in-use delete guard, product category-validation on create/update, product reorder validation, variant/add-on not-found guards, customer profile lazy-creation, profile view merging, phone-conflict mapping, address default-forcing/swapping/auto-promotion, address cap enforcement, cart merge/reject/replace logic, cart price computation, cart line unavailable-flagging, checkout rejection paths, order snapshot correctness, order status-transition guard, customer/restaurant cancellation rules, payment initiate rejection paths, signature verification success/failure, payment+order transactional consistency, webhook signature validation, webhook idempotency/duplicate-delivery handling, webhook race-vs-verify no-op, webhook processing-error recording, refund event-trigger conditions, refund gateway success/failure handling, order-status-changed event emission, ledger balance derivation, ledger credit/debit event handling, food-category/banner/offer active-window and slug/code uniquing, blog publish-state and category-slug lookup, store Haversine filtering and recommended-restaurants fallback).

## Frontend architecture

Single Next.js app, role-scoped route groups — not separate apps per portal. `/admin/*` (ADMIN), `/restaurant/*` (RESTAURANT_ADMIN/STAFF), `/` is the full customer storefront home page (Module 16), `/login` + `/register` + `/register-restaurant` public.
- **Portal "home" pages, one shared design**: an ADMIN or RESTAURANT_ADMIN/STAFF user landing on `/` is redirected straight to `/admin` or `/restaurant` (`PORTAL_HOME` lookup + a `useEffect` in `app/page.tsx`, gated so the customer storefront never flashes underneath them first) rather than having to find a small "Dashboard" link buried in the customer header. All three "home" screens — admin dashboard, restaurant dashboard, customer `/profile` — share one `PortalHero` component (`components/ui/portal-hero.tsx`, the brand amber→orange→rose gradient + dot-pattern banner) so they read as one product's three home pages, not three different apps. The restaurant dashboard and `/profile` also gained a quick-action tile grid (Menu/Products/Orders/Ledger/Subscription; Home/Browse/Orders/Favorites) so each "home" is a real launchpad, not just a data readout.

- **Styling**: Tailwind CSS v4. Reusable primitives in `src/components/ui/` (`Button`, `TextField`, `Modal`, `StatusBadge`, `ErrorBanner`, `StatCard`) — every module's screens use these rather than reinventing styling. `TextField` generates a fallback `id` via React's `useId()` when neither `id` nor `name` is passed, so `<label htmlFor>` always has something to point at — many earlier call sites omitted both, silently breaking click-to-focus/screen-reader association.
- **Auth**: `src/lib/auth-store.ts` is a plain (non-React) singleton holding the session — access token in memory, refresh token in `localStorage`, silent-refresh on page load. `src/lib/auth-context.tsx` wraps it with `useSyncExternalStore` for components (`useAuth()`). `src/lib/api-client.ts` is the fetch wrapper: attaches the access token, retries once through a shared refresh on a 401.
  **Flagged limitation**: refresh tokens in `localStorage` are more XSS-exposed than httpOnly cookies. Deferred to **Module 37 (Security Hardening)**, which the spec itself schedules after MVP features — building it per-module now would slow every future screen down for a hardening step already planned later.
- **Route protection**: `src/components/require-auth.tsx`, used per-portal layout (`app/admin/layout.tsx`, `app/restaurant/layout.tsx`), not global Next.js middleware — role requirements differ per route tree and the check needs the in-memory token anyway.
- **Data fetching**: `src/lib/use-api-query.ts`, a small fetch-on-mount-plus-reload hook — every list/detail page uses this rather than hand-rolled `useEffect`s.
- Frontend screens are built alongside each backend module from here on (Module 4 added both `admin/subscription-plans` and `restaurant/subscription`; Module 5 added a commission modal on the admin restaurants page — effective rate, split preview calculator, override rule history/creation — and a read-only commission card on the restaurant dashboard). Modules 2 and 3 got their screens retrofitted in the same pass as Module 4 (login/register/register-restaurant, admin restaurant approval queue, restaurant profile dashboard, a read-only roles viewer) since Module 4's screens depend on them being in place.
- Verified visually with Playwright (`npx playwright install chromium` once; browsers were already cached locally) rather than just trusting the TypeScript build — screenshot + `console --errors`-equivalent check after logging in as both an admin and a restaurant owner.
- **Known lint-rule gap, flagged rather than silently left**: `npm run lint -w frontend` fails on `react-hooks/set-state-in-effect` (a strict rule that flags any effect calling `setState` synchronously as its first action — including the plain "fetch on mount" shape). This already fails on pre-existing, widely-used code (`use-api-query.ts` itself, `cart/page.tsx`, `profile/page.tsx`, `profile-photo.tsx`) from before Module 16, so it isn't a regression Module 16 introduced — new code in this module follows the same established fetch-on-mount convention rather than inventing a second pattern. `next build` does not run this lint rule and passes cleanly. Worth a dedicated cleanup pass (or reconsidering the rule) later; out of scope for a single module.

## Build for production

```bash
npm run build
```

Builds both `frontend` and `backend` (`backend/dist`, `frontend/.next`).
