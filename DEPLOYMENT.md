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

## Quick start: free dev environment (Render + Vercel)

This turns the reference material below into an actual sequence of clicks, for the specific ask
of "get the `dev` branch running somewhere real and free, for testing, before a later separate
production deploy." A `render.yaml` Blueprint already sits at the repo root, wired to the `dev`
branch — Render reads that file directly; there's no service to hand-configure.

Two accounts, in a specific order, because step 2 needs an output value from step 1, and step 3
needs an output value from step 2. Neither account can be created by me — GitHub OAuth consent and
billing-adjacent signup flows are yours to click through. What follows is the ordered list.

**Step 1 — Render: database + backend (you do this)**
1. Sign up at render.com with GitHub (free tier, no card required).
2. Dashboard → New → Blueprint → select the dineflow repo. Render finds `render.yaml` at the root
   and shows the `dineflow-dev-db` + `dineflow-dev-backend` resources it defines.
3. On the review screen, confirm the web service's branch is `dev` (already set in the file).
4. Click Apply. Render provisions the free Postgres, then builds and deploys the backend.
   **Expect the first deploy to fail its health check** — `CORS_ORIGIN` has no value yet
   (`sync: false` in the file means Render deliberately leaves it blank), and
   `assertProductionConfigIsSafe` refuses to boot without a real one. That's the app correctly
   refusing to start insecurely, not a broken deploy — step 3 below fixes it.
5. Note the backend's URL from the dashboard even while it's failing, e.g.
   `https://dineflow-dev-backend.onrender.com` — needed in step 2.

Free-tier trade-offs worth expecting going in (already flagged earlier in this doc): the web
service spins down after 15 minutes idle and wakes on the next request with a ~30–50s cold start,
and the free Postgres instance expires after 30 days and would need recreating. Both are fine for
testing; neither is what a real production deploy should run on.

**Step 2 — Vercel: frontend (you do this)**
1. Sign up at vercel.com with GitHub.
2. New Project → import the same repo.
3. Root Directory: `frontend`. Framework preset should auto-detect Next.js.
4. Leave Install Command on its default first — Vercel's monorepo detection looks for the
   workspace lockfile at the repo root and installs from there even with Root Directory set to a
   subdirectory. If the deploy log shows it only installed inside `frontend/` and then fails to
   resolve a workspace dependency, override Install Command to run from the repo root instead
   (Vercel's project settings expose this override explicitly).
5. Before deploying: Settings → Git → change the Production Branch from `main` to `dev` — this
   project is specifically for testing the `dev` branch, not `main`.
6. Environment Variables: add `NEXT_PUBLIC_API_URL` = `<Render backend URL from step 1>/api/v1`,
   e.g. `https://dineflow-dev-backend.onrender.com/api/v1`.
7. Deploy. Note the resulting Vercel URL, e.g. `https://dineflow-xyz.vercel.app`.

**Step 3 — close the loop back on Render (you do this)**
1. Render dashboard → `dineflow-dev-backend` → Environment → set `CORS_ORIGIN` to the exact
   Vercel URL from step 2 (no trailing slash).
2. Save — Render auto-redeploys. The health check should pass this time and the backend goes
   live for real.

**Step 4 — first admin + end-to-end check (send me the DB's external connection string and I'll
do this)**
Migrations already ran automatically via `preDeployCommand` in `render.yaml` — no separate step
needed for that part. What's left is the one-time admin seed, which needs to run from somewhere
that can reach the database from outside Render's internal network — Render's Postgres dashboard
page has a separate "External Connection String" for exactly this. It's a throwaway dev database,
reasonable to hand over for this: paste it here and I'll run `seed:admin` against it directly, then
verify `/api/v1/health`, a real login, and CORS the same way the Post-deploy checklist below
describes — against this actual deployed dev environment, not just locally.

---

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
