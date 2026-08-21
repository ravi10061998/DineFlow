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

Unit tests: `npm test -w backend` (auth token rotation/reuse-detection, login rejection paths, role protection rules, restaurant status-transition guard, slug uniquing, trial-start eligibility, subscription snapshotting, plan-deletion guard, commission precedence chain, fixed-commission clamping, override-deactivation-on-create, category name-collision mapping, reorder validation, in-use delete guard, product category-validation on create/update, product reorder validation, variant/add-on not-found guards, customer profile lazy-creation, profile view merging, phone-conflict mapping, address default-forcing/swapping/auto-promotion, address cap enforcement).

## Frontend architecture

Single Next.js app, role-scoped route groups — not separate apps per portal. `/admin/*` (ADMIN), `/restaurant/*` (RESTAURANT_ADMIN/STAFF), `/` reserved for the customer storefront (built out in the Customer module), `/login` + `/register` + `/register-restaurant` public.

- **Styling**: Tailwind CSS v4. Reusable primitives in `src/components/ui/` (`Button`, `TextField`, `Modal`, `StatusBadge`, `ErrorBanner`, `StatCard`) — every module's screens use these rather than reinventing styling. `TextField` generates a fallback `id` via React's `useId()` when neither `id` nor `name` is passed, so `<label htmlFor>` always has something to point at — many earlier call sites omitted both, silently breaking click-to-focus/screen-reader association.
- **Auth**: `src/lib/auth-store.ts` is a plain (non-React) singleton holding the session — access token in memory, refresh token in `localStorage`, silent-refresh on page load. `src/lib/auth-context.tsx` wraps it with `useSyncExternalStore` for components (`useAuth()`). `src/lib/api-client.ts` is the fetch wrapper: attaches the access token, retries once through a shared refresh on a 401.
  **Flagged limitation**: refresh tokens in `localStorage` are more XSS-exposed than httpOnly cookies. Deferred to **Module 37 (Security Hardening)**, which the spec itself schedules after MVP features — building it per-module now would slow every future screen down for a hardening step already planned later.
- **Route protection**: `src/components/require-auth.tsx`, used per-portal layout (`app/admin/layout.tsx`, `app/restaurant/layout.tsx`), not global Next.js middleware — role requirements differ per route tree and the check needs the in-memory token anyway.
- **Data fetching**: `src/lib/use-api-query.ts`, a small fetch-on-mount-plus-reload hook — every list/detail page uses this rather than hand-rolled `useEffect`s.
- Frontend screens are built alongside each backend module from here on (Module 4 added both `admin/subscription-plans` and `restaurant/subscription`; Module 5 added a commission modal on the admin restaurants page — effective rate, split preview calculator, override rule history/creation — and a read-only commission card on the restaurant dashboard). Modules 2 and 3 got their screens retrofitted in the same pass as Module 4 (login/register/register-restaurant, admin restaurant approval queue, restaurant profile dashboard, a read-only roles viewer) since Module 4's screens depend on them being in place.
- Verified visually with Playwright (`npx playwright install chromium` once; browsers were already cached locally) rather than just trusting the TypeScript build — screenshot + `console --errors`-equivalent check after logging in as both an admin and a restaurant owner.

## Build for production

```bash
npm run build
```

Builds both `frontend` and `backend` (`backend/dist`, `frontend/.next`).
