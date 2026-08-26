# Deploying DineFlow

This is a deploy **runbook**, not a record of an actual live deployment — no account has been
created on any hosting platform for this project, and Module 32 (Docker) was explicitly skipped
in this dev environment (no Docker installed anywhere on the machine this was built on). Nothing
below has been clicked through end-to-end; it's written from what the codebase itself actually
requires (`production-safety.util.ts`'s hard checks, the real env vars every module reads, the
migrations-are-manual-not-automatic design decision made back in Module 2), not generic advice.

**Docker not being available doesn't block real deployment.** Platforms like Render, Railway, and
Fly.io build directly from a git push via their own buildpack systems (Nixpacks, etc.) — they
auto-detect a Node project and build a container *for* you, with no Dockerfile required in this
repo. If Module 32 gets picked up later (e.g. on a machine that actually has Docker), the same
platforms also accept a hand-written Dockerfile instead — this doc doesn't assume either way.

## The three deployables, and why they're independent

- **Backend** (NestJS + Postgres) — the API every other piece calls. Deploy this first.
- **Frontend** (Next.js) — the customer/admin/restaurant web app. Needs the backend's URL.
- **Mobile** (Expo) — needs its own separate path entirely (see below); it isn't a web server.

---

## 1. Database (Postgres)

Any managed Postgres works (Render Postgres, Railway Postgres, Supabase, RDS, Neon, etc.) — the
app has no provider-specific code. What it *does* care about:

- **TLS**: most managed Postgres requires it. Set `DB_SSL=true`. Leave
  `DB_SSL_REJECT_UNAUTHORIZED=true` (the default) unless your specific provider's docs say
  otherwise — that flag exists as an escape hatch, not a default to flip.
- **Migrations are a deliberate, separate manual step — never automatic on boot.** This was a
  real design decision back in Module 2 (`synchronize: false` everywhere), reinforced by
  Settlement/Payout's own transactional patterns assuming a stable schema. Run once per deploy,
  before the new backend version starts serving traffic:
  ```bash
  npm run migration:run -w backend
  ```
  Running this automatically in every container's startup script is the wrong instinct once you
  have more than one backend replica — two replicas racing to run the same migration on boot is
  exactly the kind of bug this manual-step design avoids.
- **First deploy only**: seed the first admin user (needs bcrypt hashing, which is why this isn't
  a migration — see `seed-admin.ts`'s own comment):
  ```bash
  ADMIN_EMAIL=you@yourcompany.com ADMIN_PASSWORD='a-real-password' npm run seed:admin -w backend
  ```
  Change `ADMIN_PASSWORD` immediately after first login if you used a temporary one to run this.

## 2. Backend

**Recommended platforms**: Render, Railway, or Fly.io — all three support a Node web service
built directly from source (no Dockerfile needed) with a persistent process (not a serverless
function), which this app needs since it holds a long-lived Postgres connection pool and runs an
in-process `@nestjs/schedule` cron (Module 4/17's trial-expiry and settlement jobs) that a
serverless platform would silently never fire.

**Build command**: `npm ci && npm run build -w backend`
**Start command**: `node backend/dist/main.js`
**Health check path**: `/api/v1/health` (already public, unauthenticated, exists since Module 1 —
point your platform's health-check probe at this, not `/`, which doesn't exist as a route here).

**Required environment variables** — the app will not simply behave insecurely if these are
missing or wrong; `assertProductionConfigIsSafe()` (`common/utils/production-safety.util.ts`)
throws and refuses to boot at all, before Nest even builds the module graph:

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` — this is what turns the safety check on at all |
| `JWT_ACCESS_SECRET` | ≥32 chars, real random value (`openssl rand -hex 64`), must not contain `dev-only`/`change-me` |
| `PAYMENT_GATEWAY_SECRET` | same requirement — used by the mock payment gateway's HMAC signing; swap `MockPaymentGateway` for a real Razorpay/Stripe adapter before this matters for real money |
| `PAYMENT_WEBHOOK_SECRET` | same requirement — deliberately a *different* secret from the one above (see Module 13's own reasoning: a leak of one channel shouldn't compromise the other) |
| `CORS_ORIGIN` | your real frontend's origin, e.g. `https://dineflow.yourdomain.com` — the app refuses to fall back to a permissive default in production |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | your managed Postgres connection details |
| `DB_SSL` | `true` for essentially every managed provider |
| `PORT` | most platforms inject this automatically; the app reads it via `process.env.PORT \|\| 4000` |

Everything else in `backend/.env.example` (`JWT_ACCESS_EXPIRES_IN`, `PAYMENT_GATEWAY_KEY_ID`) has
a sane default or isn't security-sensitive.

**Not yet true, flagged not hidden**: the payment/payout/push-notification gateways
(`MockPaymentGateway`, `MockPayoutGateway`, `MockNotificationGateway`'s email/SMS methods — its
push method is genuinely real, see Module 26/the push-tokens work) are mocks. Swapping in a real
Razorpay/Stripe/SendGrid/Twilio adapter is a real, separate piece of work — the interfaces
(`PaymentGateway`, `PayoutGateway`, `NotificationGateway`) were deliberately shaped so that's a
new class, not a rewrite, but nobody should point this backend at real customer payments as-is.

## 3. Frontend

**Recommended platform**: Vercel — first-party Next.js support, zero config beyond the one env
var below. (Render/Railway also work fine for a Next.js app if you'd rather keep everything on
one platform; Vercel is just the path of least resistance for Next.js specifically.)

**Build command**: `npm ci && npm run build -w frontend`
**Required environment variable**:

| Variable | Requirement |
|---|---|
| `NEXT_PUBLIC_API_URL` | the backend's real deployed URL + `/api/v1`, e.g. `https://api.yourdomain.com/api/v1` |

That's the only one — everything else the frontend needs comes from the backend at request time.
**Known pre-existing gap, not new**: `npm run lint -w frontend` fails on the
`react-hooks/set-state-in-effect` rule against code that predates this document (documented since
Module 16); `next build` doesn't run that rule and passes cleanly, which is exactly why CI
(Module 33) treats build, not lint, as the gate. Don't be alarmed if your platform also runs lint
separately and shows it red — it's known, and `next build` succeeding is the real signal.

## 4. Mobile

This is fundamentally different from the two above — there's no "deployed URL" for a mobile app.
**Nothing here has been done yet; this is the honest starting point, not a completed step:**

- A real deploy means either **EAS Build** (Expo's own cloud build service — needs a free Expo
  account, the exact thing this whole mobile effort deliberately avoided so far to stay
  account-free for local Expo Go testing) producing real `.ipa`/`.apk` artifacts for the App
  Store / Play Store, or a **local native build** (needs Xcode on a Mac for iOS, Android Studio
  for Android — neither exists in this dev environment).
- Before either: `mobile/app.json`'s `icon`/`splash`/`android.adaptiveIcon` fields are already
  real brand assets (Module "real brand icons" pass) — those only take visual effect in a real
  build like this, never in Expo Go, so this is the point where that work actually pays off.
- `mobile/.env`'s `EXPO_PUBLIC_API_URL` needs to point at the real deployed backend before
  building — the tunnel URLs used throughout this project's phone-testing sessions were dev-only
  and don't exist once those local sessions end.
- Push notifications' mobile half (deferred earlier — Expo Go on Android can't receive real push,
  and the backend infra for it already exists) becomes testable for real the moment a genuine
  EAS/native build exists, since that's a real app outside Expo Go's sandbox restriction.

## 5. Post-deploy checklist

1. `curl https://your-backend/api/v1/health` → `{"success":true,"data":{"status":"ok"},...}`
2. Log in as the seeded admin, confirm `/api/v1/auth/me` returns a real profile
3. Load the frontend, confirm the browser network tab is hitting your real backend URL, not
   `localhost:4000` (a forgotten `NEXT_PUBLIC_API_URL` silently falls back to that)
4. Register a test restaurant + customer end to end, run a full checkout with the mock payment
   gateway, confirm the ledger credits — the exact chain `test/checkout.e2e-spec.ts` (Module 31)
   already verifies locally; this is the same chain against real deployed infrastructure
5. Check CORS: a request from a *different* origin than `CORS_ORIGIN` should be rejected — if it
   isn't, `CORS_ORIGIN` is probably still set to `*` or missing (which `assertProductionConfigIsSafe`
   should have already refused to boot on, but verify)
