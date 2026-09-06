# Changelog

All notable changes to MakeGlowOver are recorded here, one entry per phase.

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
