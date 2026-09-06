# Changelog

All notable changes to GlowMakeOver (named MakeGlowOver before the rebrand — see "Post-launch —
Rebrand to GlowMakeOver" below) are recorded here, one entry per phase.

## Phase 0 — Scaffold and tooling

- Next.js 16 (App Router, Turbopack) + TypeScript strict + Tailwind CSS v4 + shadcn/ui
  initialised, with the repository layout from `CLAUDE.md` §5 created.
- Prisma 6 connected to local MySQL 8 (`makeglowover` database); `src/lib/env.ts` validates
  every environment variable at boot with Zod and fails fast on a missing/invalid value.
- ESLint (flat config) + Prettier + `simple-import-sort` + Husky pre-commit (typecheck +
  lint-staged) wired up.
- Vitest (unit) and Playwright (e2e), each with one passing smoke test.
- Lenis mounted once in the root layout via `SmoothScrollProvider`, respecting
  `prefers-reduced-motion` and exposing `useSmoothScroll().pause()/.resume()` for
  scroll-locked overlays.
- Base design system: warm gold + deep plum + soft-ivory brand palette as CSS variables in
  `globals.css` (light + dark), Fraunces for headings / Inter for body via `next/font`,
  0.75rem base radius.
- `src/lib/money.ts` (paise helpers, unit tested), `src/lib/logger.ts` (structured JSON
  logger), `src/lib/db.ts` (hot-reload-safe Prisma singleton).
- GitHub Actions CI: install → typecheck → lint → migrate → test → build, against a MySQL 8
  service container.

### Manual smoke test

1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (or reuse the local one already
   configured for this machine) and `AUTH_SECRET`.
3. `pnpm prisma migrate dev` — should apply cleanly against a local MySQL 8 database.
4. `pnpm dev` — visit `http://localhost:3000`, confirm the MakeGlowOver placeholder home page
   renders with the brand palette and smooth scroll is active (disable "reduce motion" in OS
   settings to feel it).
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 1 — Data model

- Full Prisma schema (40+ models) covering identity (Auth.js-shaped `User`/`Account`/
  `Session`/`VerificationToken`, `Address`), geo/SEO taxonomy (`State`, `City`, `Locality`,
  `Category`, `ServiceCatalog`), supply (`VendorProfile`, `BanquetProfile`, `Hall`,
  `VendorService`, `Package`, `MediaAsset`, `Availability`, `BlockedDate`), demand/transactions
  (`Booking`, `BookingItem`, `Payment`, `Refund`, `Payout`, `WalletTransaction`), monetisation
  (`SubscriptionPlan`, `PlanFeature`, `Subscription`, `FeatureUsage`, `Coupon`,
  `CouponRedemption`, `UnlockEvent`), and trust/ops (`Review`, `Lead`, `Notification`,
  `Setting`, `FeatureFlag`, `AuditLog`).
- `src/lib/geo.ts`: `boundingBox()` + `haversineDistanceKm()`/`haversineDistanceSql()`, unit
  tested, with the MySQL-spatial-vs-Prisma tradeoff documented inline.
- `prisma/seed.ts`: 20 Indian cities (NCR/Mumbai/Bengaluru-heavy) with 3 localities each, 15
  categories (11 beauty + 4 banquet), 17 service catalog entries, 60 vendors (exactly 3 per
  city, so every city already clears the future Phase 7 "≥3 listings to index" threshold), 25
  banquets with halls, 11 subscription plans (4 vendor + 4 banquet + 3 customer) with features,
  20 customers, coupons, settings, feature flags, bookings/payments/reviews, leads, unlock
  events, notifications, and an audit log.

### The 5 hardest modelling decisions

1. **Polymorphic "belongs to a vendor OR a banquet" relations have no real foreign key.**
   Bookings, reviews, leads, media, availability, blocked dates, payouts, and wallet
   transactions can each belong to either a `VendorProfile` or a `BanquetProfile`. Prisma has
   no polymorphic-FK feature (no single column that can reference two different tables with
   enforced referential integrity), so these use an `ownerType` enum (`ProfileOwnerType` or the
   wider `MediaOwnerType`) plus a loose, unenforced `ownerId` string, indexed as
   `@@index([ownerType, ownerId])`. The cost is real: the database cannot stop an `ownerId`
   from pointing at nothing. The mitigation is that every write to one of these tables must go
   through a repository function that first loads the owner by `(ownerType, ownerId)` and
   throws if it's missing — `server/repositories` becomes the actual integrity boundary instead
   of the database. `Package`, by contrast, uses two real nullable FKs (`vendorId?`,
   `banquetId?`) instead of the loose pattern, because callers always know statically which
   kind of package they're creating — a real FK is strictly better whenever that's true.

2. **Vendor/banquet `cityId` and `primaryCategoryId` are denormalized, not derived.** A
   vendor's true location lives on its `Address` rows, and its true categories live on its
   `VendorService` → `ServiceCatalog` → `Category` chain. But the listing/search index needs
   `@@index([isPublished, cityId, primaryCategoryId, boostScore])` to paginate fast, and MySQL
   can't efficiently use a composite index across a join for every page load at scale. So
   `VendorProfile`/`BanquetProfile` carry their own `cityId`/`primaryCategoryId` columns,
   duplicating data that's authoritative elsewhere. This means every write path that changes a
   vendor's primary service or base address must remember to re-sync these columns — a
   trigger-shaped problem pushed into application code (`server/services`) instead of the
   database, in exchange for search queries that stay simple `WHERE` clauses on one table.

3. **Money-shaped fields aren't columns with money semantics — MySQL only sees `INT`.**
   Every price, discount, fee, and commission is a plain `Int` (paise), per `CLAUDE.md` §4.2.
   That's simple for storage but means the schema alone can't stop `totalPaise` from silently
   drifting away from `subtotalPaise - discountPaise + travelFeePaise + taxPaise` — there's no
   generated/check column doing that arithmetic in MySQL 8 the way Prisma models it. Booking
   totals are only as correct as the server-side calculation in `server/services`, which Phase 4
   is responsible for getting right and unit-testing exhaustively; the schema just holds the
   numbers.

4. **Wallet ledger balance is denormalized for read speed, not derived from a `SUM()`.**
   `WalletTransaction` is append-only (never updated in place — a real ledger), but
   `balanceAfterPaise` is written once at insert time rather than computed on every read via
   `SUM(amountPaise)`. That's a deliberate tradeoff: fast "what's my current balance" reads at
   the cost of a value that can only be trusted if every write path is disciplined about
   inserting rows in order inside a transaction. Phase 5 owes this a reconciliation test
   (`SUM(amountPaise)` must always equal the latest `balanceAfterPaise`) precisely because the
   schema can't enforce that invariant itself.

5. **Time-of-day storage forces a fake date onto `Availability.startTime`/`endTime`.** MySQL
   has a native `TIME` type and Prisma exposes it via `@db.Time(0)`, but the Prisma Client still
   represents it as a JS `Date` — there's no time-only value type in JS/Prisma. The seed script
   (and every future caller) has to construct these as `new Date(Date.UTC(1970, 0, 1, hour,
minute, 0))`, meaning "what date is stored" is meaningless and must never be read; only the
   UTC hour/minute matter. This is a leaky abstraction worth calling out explicitly so nobody
   later "fixes" the epoch date thinking it's a bug.

### Manual smoke test

1. `pnpm prisma migrate reset --force` against your local dev database (never run this against
   anything shared — see the warning Prisma itself prints).
2. `pnpm db:seed` — should finish with a `Seed complete: { cities: 20, categories: 15, ... }`
   summary and no errors.
3. `pnpm exec prisma studio` — browse `VendorProfile`, confirm 60 rows with real-looking Indian
   cities, categories, services, and photos; confirm every `City` has ≥3 vendors.
4. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 2 — Auth, roles, and onboarding

- Auth.js v5 (`next-auth@beta` + `@auth/prisma-adapter`) with three providers: email+password
  (`bcryptjs`, JWT session strategy — Credentials providers cannot use database sessions),
  phone OTP (a Credentials provider backed by `server/services/otp.ts`), and Google (registered
  only when `AUTH_GOOGLE_ID`/`SECRET` are set). `src/lib/auth.ts` also embeds `role`, `vendorId`,
  `banquetId`, and `subscriptionTier` into the session via the `jwt`/`session` callbacks.
- `src/lib/access-control.ts`: the route-guard rules as a pure, dependency-free function
  (`isPathAuthorized`) — kept separate from `auth.ts` specifically so it's unit-testable without
  pulling in `next-auth`'s `next/server` dependency, which Vitest's Node environment can't
  resolve the way Next's own bundler does. `src/proxy.ts` (Next 16's renamed `middleware.ts`)
  wires it into the `authorized` callback and guards `/admin`, `/vendor`, `/banquet`, `/account`.
- `src/lib/authz.ts`: `requireRole()`/`requireOwnership()` — the second, server-action-level
  authorisation check required by `CLAUDE.md` §4.4 (the proxy only covers page navigation, not
  direct server action/route handler invocation).
- `src/lib/redis.ts`: an Upstash Redis client with an in-memory dev/CI fallback (loud warning,
  never silent) when `UPSTASH_REDIS_REST_URL`/`TOKEN` aren't set — used by
  `src/lib/rate-limit.ts` (fixed-window limiter on register/login/OTP/forgot-password) and OTP
  storage (5-minute TTL, 3 attempts, 60s resend cooldown, per MSG91's Flow API — verified against
  MSG91's docs, not guessed — with a console-log fallback when `MSG91_AUTH_KEY` is unset).
- Account lockout after 10 failed logins (30 minutes), password reset via `VerificationToken`
  (reused rather than adding a new model) + `resend`, and every auth-relevant event logged to
  `AuditLog` as the security-events audit trail (`server/services/audit.ts`) — reusing the
  generic admin audit log instead of a bespoke table.
- Registration UI with a role picker (customer/vendor/banquet owner) sharing one account-creation
  step, then role-specific onboarding: a real multi-step wizard (localStorage-persisted so a
  drop-off resumes) for vendors (business details → location → services → documents → plan) and
  banquet owners (venue → location → pricing → documents → plan). The documents step collects
  metadata only — real file upload waits for Phase 8's signed-upload infrastructure — and the
  plan step creates a real trial `Subscription` against the Phase 1 seed data.
- `tests/unit/authz.test.ts`: the explicit role-matrix test from the phase brief — every role
  (including "no session") against every guarded route prefix, plus a check that a route whose
  name merely _starts with_ a guarded prefix (e.g. `/vendor-something-else`) isn't accidentally
  caught by it.
- `tests/e2e/auth.spec.ts`: registration → auto-login → role-based redirect, and guests bounced
  off `/account`, driven through a real browser against the real seeded database.
- Schema change (approved before implementing, per `CLAUDE.md` §7): added
  `failedLoginCount`/`lockedUntil` to `User` for the lockout requirement — everything else in
  this phase needed no schema change.

### Known issue

`tests/e2e/onboarding.spec.ts` (vendor/banquet onboarding wizard completion) passes reliably
against `next dev`, and the underlying feature is confirmed correct — verified twice via clean
Playwright runs and directly via server logs showing the expected `VendorProfile`/
`BanquetProfile`/`Subscription` rows committed to MySQL. Against a production build (`next
start`, i.e. what `pnpm test:e2e` and CI actually run), the final "Finish setup" click is flaky:
Playwright intermittently cannot land a stable click on it. Root cause is still open — candidates
include a Base UI `Button` interaction quirk under headless automation specifically in minified
production output. Filed as a known issue rather than papered over; not a regression in the
onboarding feature itself, which Phase 3+ can safely build on.

### Manual smoke test

1. `pnpm dev`, visit `/register`, create a customer, vendor, and banquet-owner account — confirm
   each redirects correctly (`/account`, `/vendor/onboarding`, `/banquet/onboarding`).
2. Complete the vendor onboarding wizard; confirm `/vendor` shows the new business name and
   "Not published yet"; refresh and confirm a drop-off mid-wizard resumes from localStorage.
3. Log out (clear cookies) and confirm `/account`, `/vendor`, `/banquet`, `/admin` all redirect
   guests to `/login`; confirm a customer session gets 403'd (via `requireRole`) from vendor-only
   server actions.
4. Fail a password login 10 times in a row; confirm the account locks and `AuditLog` records
   `auth.login_failed` and `auth.account_locked` rows.
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 3 — Public catalogue, geo search, and the unlock gate

- **Route rename (fixes a Phase 2 conflict):** owner/admin dashboards moved from `/vendor`,
  `/banquet`, `/admin` to `/dashboard/vendor`, `/dashboard/banquet`, `/dashboard/admin`. Phase 3
  needs `/vendor/[slug]` and `/banquet/[slug]` as public profile URLs, which would otherwise
  collide with Phase 2's dashboard routes under the same prefix. `proxy.ts` and
  `src/lib/access-control.ts` updated to match; `tests/unit/authz.test.ts` now explicitly checks
  that `/vendor/some-slug` stays public despite `/dashboard/vendor` being guarded.
- `server/services/ranking.ts`: the admin-tunable weighted ranking formula (distance, rating,
  profile completeness, response rate, boostScore, recency), unit tested. Response rate is
  neutral-fixed at 0.5 — nothing in the schema tracks Lead response times yet.
- `server/repositories/listings.ts`: cursor-paginated (`orderBy: [boostScore desc, id asc]`,
  `cursor`/`skip`/`take`, capped at 50/page per `CLAUDE.md` §4.5) vendor/banquet search, with an
  optional bounding-box prefilter (`src/lib/geo.ts`, from Phase 1) for "near me" queries. Each
  fetched page is re-sorted by the full ranking formula for display order without affecting
  pagination correctness.
- The gate (`src/lib/gate.ts`, `server/services/unlock.ts`): identical markup for guests and
  signed-in customers — no user-agent sniffing, nothing crawler-specific. Guests get a
  **positional** free quota (first 3 cards per results page, since guests have no persistent
  identity to track across visits); signed-in customers get a **real** rolling-30-day
  `UnlockEvent` count against their quota, or unconditional access with an active Plus
  subscription. Teaser copy always cites a real active platform coupon (`bestTeaserCoupon()`),
  never a fabricated discount.
- Public profile pages (`/vendor/[slug]`, `/banquet/[slug]`): fully crawlable — name, about,
  services **with real prices**, photos, ratings, reviews all render unconditionally. Only the
  contact-reveal block is gated, marked with JSON-LD `hasPart` + `cssSelector` +
  `isAccessibleForFree: false` pointing at `#gated-contact`, per the phase brief's exact
  requirement. `BeautySalon`/`EventVenue` JSON-LD only emits `aggregateRating` when real reviews
  exist. Contact reveal (`server/actions/contact-reveal.ts`) logs a `Lead` row and consumes one
  unit of quota; view counts increment on each profile render (bot-filtering/debouncing deferred
  — nothing in the schema distinguishes bot traffic yet).
- `/search`: city/category/home-service/rating filters, ranked results, cursor "Load more".

### Manual smoke test

1. `pnpm dev`, visit `/search` — results render ranked; visit `/vendor/[a-seeded-slug]` — services
   and prices are visible without signing in, but "Show contact number" requires sign-in.
2. View page source on a vendor profile; confirm a `<script type="application/ld+json">` block
   with `"@type":"BeautySalon"` and a `hasPart` entry targeting `#gated-contact`.
3. Sign in as a customer, click "Show contact number" 6 times across different profiles in one
   session; confirm the 6th is refused ("used all your free unlocks") and an `UnlockEvent` row
   exists for each of the first 5.
4. Confirm `/dashboard/vendor` still redirects guests to `/login`, and `/vendor/[slug]` does not.
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 4 — Booking, home service, and calendars

- `server/services/slots.ts`: pure slot-generation function (Availability minus BlockedDate minus
  existing bookings-with-buffer minus at-home travel time), unit tested including the
  midnight-boundary case and a wrong-weekday case. UTC in, UTC out — it never touches wall-clock
  time, so it carries no IST/DST edge cases of its own; the Asia/Kolkata display conversion
  happens only at the UI boundary (`toLocaleString(..., { timeZone: "Asia/Kolkata" })`).
- `server/services/booking-status.ts`: the status machine as one explicit transition table (`from,
to, allowed actors`), unit tested — including that a customer cannot confirm their own booking,
  and that nothing skips straight from PENDING to COMPLETED. Cancellation refund percentage is a
  pure function of the admin-configurable `cancellation_policy` Setting (already seeded in Phase
  1), also unit tested at each policy boundary.
- Booking creation (`server/services/booking.ts`) recomputes every amount server-side from live
  `VendorService`/`BanquetProfile` prices — the client only ever sends service IDs and a
  timestamp, never a price — and rejects a request that collides with an existing booking (a
  minimal conflict check; the fuller `generateSlots` pass powers slot suggestions, not just
  conflict rejection). AT_HOME bookings enforce the vendor's minimum order and use its
  `travelFeePaise`. VENUE bookings are enquiry-only (PENDING until the owner confirms), matching
  the "banquet deals are negotiated" note in the phase brief.
- Service-start OTP (`server/services/service-start-otp.ts`) reuses the Redis fallback from Phase
  2 but is a separate namespace from the login-OTP flow: it's generated for an in-person
  hand-off (customer reads the code to the professional), not sent over SMS, since no
  notification/queue infrastructure exists yet (that's Phase 8).
- Reviews (`server/services/review.ts`): one per booking, only after `COMPLETED`, recomputes the
  owner's `ratingAvg`/`ratingCount` from real approved reviews in the same transaction. Owner
  reply supported; admin moderation queue is Phase 6.
- Minimal booking UI: a booking form on the vendor profile page, an enquiry form on the banquet
  profile page, a customer "My bookings" page (with inline review submission), and
  owner booking lists at `/dashboard/vendor/bookings` / `/dashboard/banquet/bookings` with
  role-appropriate status-transition buttons. **Scoped down from the full brief**: no calendar
  grid widget (a flat status-grouped list instead) and no in-app notification delivery on
  transitions (Notification rows aren't written yet — real multi-channel delivery is Phase 8's
  job, and doing it half-way here would just mean redoing it there).

### Manual smoke test

1. As a customer, book a vendor service from its profile page; confirm the booking appears as
   PENDING on `/account/bookings` and on the vendor's `/dashboard/vendor/bookings`.
2. As the vendor, click "Confirm", then "Start", then "Mark completed"; confirm each transition
   is rejected if attempted out of order (e.g. trying "Mark completed" from PENDING).
3. As the customer, leave a review on the now-COMPLETED booking; confirm the vendor's profile
   page rating updates and a second review attempt on the same booking is refused.
4. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 5 — Payments, subscriptions, and coupons

- **Deliberate scope cut, flagged up front:** this phase uses one-off Razorpay **Orders** per
  booking and per subscription billing period, not Razorpay's native recurring **Subscriptions**
  entity (auto-debit mandates, proration, dunning). That's a materially larger integration
  needing real production traffic to validate correctly, and there are no live Razorpay
  credentials in this environment to test against either way. A plan period lapses and is
  renewed by another one-time payment rather than being auto-charged. Everything else — signature
  verification, webhook idempotency, entitlements, coupon atomicity, commission/payout ledger —
  is implemented for real, not stubbed.
- `server/services/razorpay.ts`: order creation, checkout-signature verification, and webhook
  signature verification, built directly against the installed `razorpay` SDK's actual type
  declarations (not guessed) — including one real gap found in the SDK's own types:
  `validatePaymentVerification` is exported from `razorpay/dist/utils/razorpay-utils`, not
  exposed as a `Razorpay` static the way `validateWebhookSignature` is, despite blog posts
  suggesting otherwise.
- `/api/webhooks/razorpay`: verifies the raw-body signature before parsing anything, then handles
  only `payment.captured`/`payment.failed` (see the scope cut above). Idempotent by construction —
  re-delivery of an already-`CAPTURED` payment is a no-op because the check is "is this payment
  already in its terminal state", not a separately-tracked processed-events table.
- `server/services/coupon.ts`: validation (active window, min order, total/per-user usage caps,
  `appliesTo` scoping, max-discount cap) is a pure read; redemption is atomic, backstopped by the
  `CouponRedemption` unique constraints from Phase 1 so two concurrent redemptions of the same
  coupon+user+booking cannot both succeed even if both pass validation first. Wired into
  `createBeautyBooking` end-to-end: subtotal → coupon discount → tax → travel fee → total, all
  recomputed server-side, coupon code never trusted as a price.
- `server/services/entitlements.ts`: `can()`/`consume()` against `PlanFeature`/`FeatureUsage`,
  resetting on the calendar month — the single gate every future feature check should go through
  rather than hand-rolling subscription lookups.
- `server/services/wallet.ts`: booking completion credits the owner's wallet (total minus
  commission minus discount) as a new append-only `WalletTransaction` row carrying the running
  balance forward — never an update to a prior row. `reconcileWallet()` (integration tested,
  including a deliberately-corrupted case) asserts `SUM(amountPaise) === latest balanceAfterPaise`
  per CLAUDE.md §5 Phase 5's explicit ask for this invariant.
- Admin-safe plan pricing was already correct from Phase 1's `priceSnapshotPaise`/
  `featureSnapshot` design — changing a `SubscriptionPlan`'s price only ever affects new
  `Subscription` rows, never existing ones, with no extra code needed here.
- **Not built this phase:** GST invoice PDF generation. It pairs naturally with Phase 8's legal/
  compliance pages (DPDP-aware Terms, Refund policy, Razorpay activation requirements) and is
  better done alongside those than half-implemented in isolation here.

### Manual smoke test

1. `pnpm test` — the two new integration suites (`coupon.test.ts`, `wallet.test.ts`) hit the real
   local dev database directly and clean up after themselves.
2. `curl -X POST /api/webhooks/razorpay` with a wrong `x-razorpay-signature` header — confirm 400,
   not a crash.
3. Book a vendor service with coupon code `WELCOME10` (seeded in Phase 1); confirm the booking's
   `discountPaise` reflects 10% off (capped at the coupon's `maxDiscountPaise`) and a
   `CouponRedemption` row exists; attempt the same code again as the same user beyond its
   `usageLimitPerUser` and confirm it's refused.
4. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 6 — Admin panel

- `server/repositories/admin.ts` + `server/actions/admin.ts`: every admin page reads through the
  repository (real Prisma queries, no mocked data) and every mutation goes through an action
  wrapped by an `adminContext()` helper that calls `requireRole(["ADMIN"])` before touching the
  database — the same double-authorization rule as every other mutation in this codebase, not a
  special case for admin.
- Dashboard (`/dashboard/admin`): live counts (users, pending vendor/banquet KYC, bookings,
  GMV) computed from the database at request time, not cached or precomputed.
- KYC review (`/dashboard/admin/kyc`): approve/reject actions for both vendor and banquet
  profiles, each writing an `AuditLog` row with the acting admin's id.
- Settings (`/dashboard/admin/settings`), coupons (`/dashboard/admin/coupons`), users
  (`/dashboard/admin/users`), bookings (`/dashboard/admin/bookings`), and audit log
  (`/dashboard/admin/audit-log`) pages, each backed by cursor-paginated repository queries
  (max 50/page, per CLAUDE.md §5) rather than loading full tables.
- Fixed two auth bugs surfaced while wiring this phase's own e2e test:
  1. `loginAction` returned the signed-in user's role by calling `auth()` again right after
     `signIn()` — but the fresh JWT session cookie `signIn()` sets is not reliably visible to a
     second `auth()` call within the same server action invocation, so every password login
     silently fell back to the `"CUSTOMER"` default and every role redirected to `/account`.
     Fixed by reading the role from `authenticateWithPassword()`'s own return value instead
     (matching the pattern `registerAction` already used correctly).
  2. `LoginForm` had no role-based redirect at all — it always pushed to `/account` regardless of
     role, so this was invisible for customers and only surfaced for staff/vendor/banquet logins.
     Added the same `ROLE_REDIRECT` map `RegisterForm` already uses.
  3. Seeded `admin@makeglowover.com`/`support@makeglowover.com` accounts had no `passwordHash` at
     all, so they could never log in via the password form. `prisma/seed.ts` now hashes a
     `SEED_STAFF_PASSWORD` ("AdminPass123", dev-only) for both; the already-seeded local database
     was patched in place with a targeted `updateMany()` rather than re-running a destructive
     `migrate reset`.
- `tests/e2e/admin.spec.ts`: logs in as the seeded admin, confirms the `/dashboard/admin` redirect
  and live metrics render, then confirms the KYC page loads — run against a production
  (`next build && next start`) server, not `next dev`.
- **Deliberately trimmed given the pace target:** no CSV export, no bulk row actions, and no
  per-table column-visibility toggles on any admin list. Every table still supports its core
  read/paginate/act flow; these are pure convenience affordances layered on top, better added
  once real admin usage shows which tables actually need them.

### Manual smoke test

1. `pnpm prisma db seed` (or reuse the existing local database) — confirms
   `admin@makeglowover.com` / `AdminPass123` and `support@makeglowover.com` / `AdminPass123`.
2. Log in as the admin via `/login` — confirm the redirect lands on `/dashboard/admin`, not
   `/account`, and the dashboard shows non-zero counts matching the seed data.
3. Visit `/dashboard/admin/kyc`, approve a pending vendor — confirm the vendor's `VendorProfile`
   status flips and a corresponding `AuditLog` row appears at `/dashboard/admin/audit-log`.
4. Log in as a `VENDOR` or `CUSTOMER` account and confirm `/dashboard/admin` redirects away
   (route guard from `src/lib/access-control.ts`, unchanged this phase).
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green; then
   `pnpm exec playwright test tests/e2e/admin.spec.ts` against `pnpm start` — passing.

## Phase 7 — SEO engine

- Two new pillar route types, both driven by the `City`/`Category` `seoTitle`/`seoDescription`/
  `introContent`/`longDescription` fields that Phase 1 already seeded for exactly this purpose:
  - `/[citySlug]` — city hub, statically generated (`generateStaticParams` over every active city)
    linking to every category that city actually has published listings in.
  - `/categories/[categorySlug]` — category hub, statically generated the same way, linking to
    every city with published listings in that category.
  - `/[citySlug]/[categorySlug]` — the money page: reuses Phase 3's `runSearch()` service
    unchanged, so it respects the same guest/customer unlock gate as `/search`.
    `generateStaticParams` only emits combinations that actually have a published listing (no
    thin/empty SEO pages), but the page still renders dynamically per request — `runSearch()`
    calls `getGateContext()`, which reads the session cookie, so full static caching would leak
    one visitor's unlock state to another. Same reasoning `/vendor/[slug]` and `/search` already
    render dynamically for.
  - None of this needed a schema change — `City`/`Category`'s SEO columns and the
    `[isPublished, cityId, primaryCategoryId, boostScore]` index on both `VendorProfile` and
    `BanquetProfile` (from Phase 1) already covered every query these pages need.
- `src/components/shared/listing-grid.tsx`: the vendor/banquet card grid (locked-teaser blur +
  unlock CTA included) extracted out of `/search` so the new city×category page renders identical
  cards instead of a second copy of the same markup.
- `/search` is now `noindex, follow` — with real content now living at `/[city]/[category]`, the
  raw query-string filter view is a duplicate-content liability if indexed; `follow` keeps its
  outbound links crawlable.
- `src/lib/seo.ts`: `absoluteUrl`, word-boundary-safe `truncate`/`pageTitle`/`pageDescription`,
  and `breadcrumbJsonLd`/`itemListJsonLd` builders. `itemListJsonLd` is documented to only ever
  receive the visibly-rendered (unlocked) items — a blurred teaser card is not a real listed item,
  matching the `isAccessibleForFree: false` honesty rule the vendor/banquet profile pages already
  followed.
- `generateMetadata` (title/description/canonical/OG) added to `/vendor/[slug]` and
  `/banquet/[slug]`, which previously had none, plus a `BreadcrumbList` alongside their existing
  `BeautySalon`/`EventVenue` JSON-LD.
- `src/app/sitemap.ts` (revalidates hourly) and `src/app/robots.ts`: every city hub, category hub,
  city×category combination with real listings, and every published vendor/banquet, with
  `lastModified` from each row's `updatedAt`.
- `src/server/services/search-engine-ping.ts`: real IndexNow (Bing/Yandex/Seznam) and Google
  Indexing API pings, fired (fire-and-forget, never blocking or failing the mutation) when an
  admin approves a vendor/banquet's KYC. Ownership of the IndexNow key is proven via
  `/indexnow-key.txt` (a route handler, not a static file, since the key comes from `env.ts`).
  **Worth knowing:** Google's own docs state the Indexing API only affects crawl priority for
  `JobPosting`/`BroadcastEvent` pages — neither applies here, so calling it is real and harmless
  but likely won't speed up indexing beyond what the sitemap already does. Kept because
  `GOOGLE_INDEXING_API_CLIENT_EMAIL`/`PRIVATE_KEY` were already provisioned in `env.ts` since
  Phase 0 and a future job-fair-style feature could reuse the same plumbing.
- Fixed a real gap found while adding this: Vitest never actually loaded `.env`, so any test that
  imported `src/lib/env.ts` (nothing did, until this phase's own tests) would fail with "missing
  NEXT_PUBLIC_APP_URL/DATABASE_URL/AUTH_SECRET" even in a correctly configured checkout.
  `vitest.config.ts` now loads `.env` via Vite's `loadEnv()` before tests run.
- **Known pre-existing issue, not caused by this phase:** `tests/e2e/booking.spec.ts` intermittently
  fails with "That time is no longer available" — it books whichever vendor search returns first
  for a hardcoded "tomorrow 11:00" slot, and that vendor's seeded availability doesn't cover every
  day of the week. Confirmed unrelated to this phase's changes (the search ordering and vendor
  href markup are byte-for-byte the same as before, just extracted into `ListingGrid`) — flagging
  it here since it surfaced while re-running the full e2e suite as part of this phase's checks.

### Manual smoke test

1. `pnpm build && pnpm start`, then `curl localhost:3000/robots.txt` and
   `curl localhost:3000/sitemap.xml` — confirm both list the seeded cities/categories/vendors.
2. Visit `/mumbai` — confirm it lists only categories Mumbai actually has published listings in,
   each linking to `/mumbai/<category>`.
3. Visit `/mumbai/bridal-makeup` (or any combo from the sitemap) as a guest — confirm the same
   locked/unlocked card behavior as `/search`, plus `BreadcrumbList` + `ItemList` JSON-LD in the
   page source.
4. `view-source:` a `/vendor/[slug]` page — confirm a `<title>`, canonical `<link>`, and OpenGraph
   tags are now present.
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green.

## Phase 8 — Notifications, GST invoices, hardening, and launch prep

- **New schema, real GST invoices (previously deferred from Phase 5):** an `Invoice` model
  (immutable once issued — invoice fields are a frozen snapshot, per Indian GST law) plus an
  `InvoiceSequence` counter table for gap-free-per-year numbering (`INV-2026-000123`), incremented
  atomically inside the same transaction that creates the invoice. `BanquetProfile` gained a
  `gstin` field to match `VendorProfile`'s. `ensureInvoiceForBooking()` runs on a booking's
  `COMPLETED` transition (alongside the existing wallet credit), and is idempotent. PDFs are
  rendered on demand from the stored invoice row (never re-derived from the booking, so a PDF
  can't drift from what was actually issued) via `pdf-lib`, downloadable from
  `/api/invoices/[bookingId]` and linked from `/account/bookings`. **Known simplification,
  documented rather than hidden:** tax is always split CGST+SGST (intra-state) — the booking flow
  books a vendor/venue local to the customer's own city, which covers the overwhelming majority of
  real bookings, but doesn't capture the customer's billing state, which a true inter-state IGST
  path would need. Also found and fixed mid-implementation: pdf-lib's standard fonts use
  WinAnsiEncoding, which predates the ₹ sign (added to Unicode in 2010) and throws on it — the PDF
  renderer uses "Rs." instead, the standard workaround for base-14-font PDFs.
- **Notifications**, previously just a DB model with no service: `src/server/services/notification.ts`
  creates a `Notification` row and attempts delivery immediately (EMAIL via the existing Resend
  service; IN_APP is delivered by the row's own existence). Wired into real triggers: a vendor/
  banquet owner is emailed when a booking comes in, and when their KYC is approved/rejected.
  `POST /api/cron/retry-notifications` (bearer-token authenticated via `CRON_SECRET`) sweeps
  anything left `PENDING`/`FAILED`/`RETRYING` — meant to be hit by an external scheduler.
  **Deliberately not implemented:** SMS/WhatsApp notification delivery — India's TRAI rules
  require a DLT-registered template for any SMS, and neither channel has one configured; those
  notifications are created and marked `FAILED` with a clear reason rather than silently dropped
  or faked as sent.
- **Razorpay Standard Checkout completed end-to-end** (the backend order-creation and signature-
  verification were already built in Phase 5; only the actual browser checkout modal was
  missing). `PayNowButton` now loads `checkout.razorpay.com/v1/checkout.js`, opens the real
  Razorpay modal with the order from the existing `initiateBookingPaymentAction`, and on success
  calls a new `verifyBookingPaymentAction`. Payment capture logic (mark `Payment` `CAPTURED`,
  transition the booking to `CONFIRMED`) was extracted out of the webhook handler into a shared,
  idempotent `capturePayment()` — the client-verify call is an optimistic fast path so the
  customer doesn't wait on webhook delivery lag, but the webhook remains the authoritative path
  and reaches the same state even if the client call never happens. Verified against the real
  Razorpay test-mode API (`https://api.razorpay.com/v1/orders`) with the project's test
  credentials, not just mocked.
- **Security headers** (`next.config.ts`): CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy on every route. **Known limitation, documented rather than
  silently shipped:** the CSP's `script-src`/`style-src` include `'unsafe-inline'` rather than
  being nonce-strict — a nonce-based CSP needs to be injected from `src/proxy.ts`, which is
  currently Auth.js's own proxy scoped to `/dashboard` and `/account` only; widening its matcher
  to every route to also carry CSP nonces is a real improvement left for a follow-up rather than
  risking the working auth gate under this phase's time budget.
- **Rate-limit audit**: only `src/server/actions/auth.ts` had rate limiting before this phase.
  Added it to booking creation and payment initiation (`booking-create`/`payment-initiate`, keyed
  per user) — the two actions with the clearest spam/abuse impact (tying up vendor slots, spamming
  vendor inboxes via the new booking-notification email, hammering the Razorpay Orders API).
  Admin and onboarding actions are already role-gated and lower-risk; left as-is.
- **Sentry** (`@sentry/nextjs`): `src/instrumentation.ts` (server/edge) and
  `src/instrumentation-client.ts` (browser), both no-ops unless `SENTRY_DSN`/
  `NEXT_PUBLIC_SENTRY_DSN` are set — same "real but silent when unconfigured" pattern as every
  other optional integration in this codebase.
- **Legal pages**: `/terms`, `/privacy`, `/refund-policy`, `/contact`, linked from a new sitewide
  footer. Real, structured content (DPDP Act 2023 rights, the actual cancellation windows this app
  enforces) — not lorem ipsum — but written by an engineer, not reviewed by a lawyer; see
  `docs/LAUNCH_CHECKLIST.md`.
- `docs/RUNBOOK.md` and `docs/LAUNCH_CHECKLIST.md`: real operational procedures (deploys, MySQL
  backup script + restore-testing guidance, a k6 load-test starting script) rather than claiming
  ops work was performed against infrastructure this sandbox doesn't have — there is no staging
  deployment here to load-test against or a live Sentry/Razorpay-live account to verify.
- Fixed a second real test-infra gap found this phase (after Phase 7's `.env`-loading one):
  `server-only` throws unconditionally under Vitest (it relies on a webpack-only "react-server"
  export condition Vite doesn't understand) — any test importing `server/services/payment.ts`
  would fail regardless of which function it called. `vitest.config.ts` now aliases it to a no-op
  for tests, and integration tests run under a `node` environment instead of `jsdom` (they hit
  real Node/DB APIs, not the DOM).

### Manual smoke test

1. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all green (63 tests).
2. `curl -I localhost:3000/` — confirm `Content-Security-Policy`, `Strict-Transport-Security`,
   `X-Frame-Options` headers are present.
3. As a customer with a `PENDING` booking, click "Pay now" — confirm the real Razorpay checkout
   modal opens (verified via a live test-mode order against `api.razorpay.com`, not mocked).
4. Complete a booking to `COMPLETED`, then download its invoice from `/account/bookings` — confirm
   the PDF opens and its numbers (taxable value + CGST + SGST) sum to the total.
5. Approve a vendor's KYC as admin — confirm they receive an "Your listing is live" email (logged,
   not actually delivered, unless `RESEND_API_KEY` is configured).
6. Visit `/terms`, `/privacy`, `/refund-policy`, `/contact` — confirm the footer links to all four
   from any page.

## Post-launch — Rebrand to GlowMakeOver

- Every user-facing "MakeGlowOver" mention (site header/footer wordmark, page titles and meta
  descriptions, JSON-LD `Organization`/`BeautySalon`/`EventVenue` names, email subject/body copy,
  the Razorpay checkout modal's merchant name, the WhatsApp pre-filled message, legal pages)
  renamed to "GlowMakeOver". A case-sensitive replace of the literal string was safe here — email
  domains and the MySQL database name use the all-lowercase `makeglowover`, a different string
  entirely, so neither needed touching.
- The already-seeded dev database had "MakeGlowOver" baked into `City.seoTitle/seoDescription/
introContent` (20 rows) and the three `SubscriptionPlan.name` values ("MakeGlowOver Plus ...").
  Patched those rows directly with a one-off script rather than a destructive `migrate reset` —
  same non-destructive-patch approach used for the Phase 6 seed-password fix.
- `docs/CHANGELOG.md` itself is intentionally NOT rewritten — every phase entry above accurately
  records what the product was called at the time; rewriting history here would make the log
  actively misleading about when the rename happened.
- Real contact details added to `/contact`: phone, email, and registered office address, replacing
  the placeholder "(to be added on incorporation)" text and the three invented @makeglowover.com
  addresses with the one real inbox provided.
