# SajDhajLo — Project Constitution

You are the lead engineer on SajDhajLo, a production, India-focused,
multi-vendor marketplace for beauty services and wedding/banquet venues.
This file is the source of truth. Re-read it before any non-trivial change.

## 1. Product in one paragraph

SajDhajLo connects customers with (a) beauty vendors — salons, parlours,
freelance makeup artists, who serve either in-studio or as at-home service,
and (b) banquet/wedding venue owners, who offer venue bookings and may also
offer at-home/on-site services. Vendors and banquet owners pay a subscription
to be listed and to receive leads. Customers browse and search free, but
unlocking full nearby-vendor access (contact details, direct booking, the
full nearby result set) requires a customer subscription. Discounts and
coupon codes are shown before the unlock as a conversion incentive. An admin
controls every price, plan, commission, coupon and piece of content from a
dashboard — nothing is hardcoded.

## 2. Actors and permissions

| Role                        | Can do                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GUEST`                     | Browse public pages, SEO landing pages, limited nearby results, see teaser discounts                                                                     |
| `CUSTOMER`                  | Everything guest can + book, review, redeem coupons, hold a subscription that unlocks full nearby access                                                 |
| `VENDOR`                    | Own profile, services, price list, availability, gallery, home-service radius, coupons, bookings, payouts, subscription                                  |
| `BANQUET_OWNER`             | Own venue profile(s), halls, capacity, packages, calendar, coupons, bookings, payouts, subscription. May additionally enable home/on-site service        |
| `ADMIN`                     | Full CRUD on everything, approve/reject KYC, set all subscription plan prices and features, global coupons, commission rates, SEO content, feature flags |
| `SUPPORT` (optional, later) | Read-only + booking/dispute actions                                                                                                                      |

Roles are stored in DB, enforced server-side on every route and server action.
Never trust a role sent from the client.

## 3. Tech stack — fixed, do not substitute

- **Next.js (latest stable, App Router)** — React Server Components by default,
  `"use client"` only where interactivity truly requires it.
- **TypeScript strict mode.** No `any` without a written `// why:` comment.
- **Node.js** runtime for API/webhook routes that need it; Edge runtime only
  where it is provably safe (no Prisma on Edge).
- **MySQL 8** as the database.
- **Prisma** as the ORM. All schema changes go through migrations, never
  `db push` on anything other than a throwaway local DB.
- **shadcn/ui + Tailwind CSS** for all UI. Do not add a second component
  library. Extend shadcn components rather than writing bespoke ones.
  Native scrolling only — no JS-driven smooth-scroll library (Lenis was
  removed: its continuous rAF loop and document-wide touch handling caused
  real, hard-to-reproduce mobile interaction bugs — see docs/CHANGELOG.md).
- **Zod** for every input boundary (forms, server actions, API routes, webhooks).
- **NextAuth / Auth.js** with the Prisma adapter — credentials + Google +
  phone OTP.
- **Razorpay** for payments and subscriptions (India-first: UPI, cards,
  netbanking, wallets).
- **Cloudinary or AWS S3 + CloudFront** for media, always via signed uploads.
- **Resend or AWS SES** for email; **MSG91 or Twilio** for SMS/OTP;
  **WhatsApp Cloud API** for WhatsApp notifications.
- **Redis (Upstash)** for rate limiting, OTP storage, and hot search caching.

Do not introduce any other dependency without stating the reason and the
bundle-size cost in your message first.

## 4. Non-negotiable engineering rules

1. **Never invent APIs or packages.** If unsure of an API surface, read the
   installed package's types in `node_modules` or ask.
2. **Money is never a float.** Store all amounts as `Int` in paise. Format
   for display only at the edge.
3. **Never trust client-sent prices, discounts, plan IDs, or totals.**
   Recompute every amount server-side from the DB before charging.
4. **Every mutation is authorised twice**: middleware/route guard + an
   ownership check inside the handler (`vendorId === session.user.vendorId`).
5. **Every list endpoint is paginated** (cursor-based) and has a hard max
   page size of 50.
6. **Every DB query that a page depends on must be covered by an index.**
   Add the index in the same migration.
7. **Soft-delete** business records (`deletedAt`), hard-delete only PII on
   an explicit account-deletion request.
8. **Audit log** every admin mutation: actor, entity, before, after, IP, at.
9. **Idempotency** on all payment webhooks and booking creation, keyed on a
   provider event ID / client idempotency key.
10. **No secrets in code.** Everything via `.env`, validated at boot by a
    `env.ts` Zod schema that fails fast.
11. **Timezone**: store UTC, display Asia/Kolkata. Currency INR only for v1.
12. **Accessibility**: keyboard-navigable, labelled inputs, visible focus
    rings, colour contrast ≥ 4.5:1.
13. **Mobile-first**: design at 360px width first, then scale up. Every page
    must be usable one-handed on a mid-range Android.

## 5. Repository layout

```
/prisma
  schema.prisma
  /migrations
  seed.ts
/src
  /app
    /(marketing)          # public SEO pages, home, city/category landing
    /(auth)               # login, register, otp
    /(customer)           # customer dashboard, bookings, subscription
    /(vendor)             # vendor dashboard
    /(banquet)            # banquet owner dashboard
    /(admin)              # admin panel
    /api                  # webhooks, cron, sitemap feeds
    sitemap.ts
    robots.ts
  /components
    /ui                   # shadcn primitives
    /shared
    /marketing
  /server
    /actions              # server actions, one file per domain
    /services             # business logic, framework-free, unit-testable
    /repositories         # all Prisma access lives here
    /jobs                 # cron/queue handlers
  /lib
    auth.ts db.ts env.ts money.ts geo.ts seo.ts rate-limit.ts logger.ts
  /schemas                # Zod schemas shared client+server
  /types
/tests
  /unit /integration /e2e
```

Rule: **React components never import Prisma.** Data flows
component → server action → service → repository → Prisma.

## 6. Definition of Done (every phase)

A phase is only done when all of these pass:

- `pnpm typecheck` — zero errors
- `pnpm lint` — zero errors
- `pnpm test` — all green, new logic covered
- `pnpm prisma migrate dev` — migration created, named, committed
- `pnpm build` — succeeds
- Seed data updated so the feature is demo-able from a fresh DB
- A short entry appended to `/docs/CHANGELOG.md` describing what shipped
- Manual smoke test steps written in the phase summary

## 7. How you should work

- Before writing code, restate the plan in ≤10 bullets and list the files
  you will create or change. Wait for my confirmation on anything that
  changes the Prisma schema or a payment flow.
- Work in small, reviewable chunks. Commit per logical unit with
  Conventional Commit messages.
- If a requirement is ambiguous, ask **one** sharp question rather than
  guessing across five options.
- If you spot a security, legal (Indian IT/GST/refund), or SEO-policy risk
  in what I asked for, tell me before implementing it.
- Never mark something done that you have not actually run.
