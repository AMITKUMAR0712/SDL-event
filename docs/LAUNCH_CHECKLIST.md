# Launch Checklist

Everything below must be true before SajDhajLo takes real payments from
real customers. Items are grouped by who typically owns them — check off as
completed, don't skip silently.

## Legal (needs a lawyer, not just an engineer)

- [ ] `/terms`, `/privacy`, `/refund-policy` reviewed by a qualified lawyer —
      the current text is a real, structured draft covering the DPDP Act 2023
      and the specific cancellation windows this app actually enforces, but it
      was written by an engineer, not counsel.
- [ ] Business entity incorporated; registered office address filled into
      `/contact` (currently a placeholder).
- [ ] GST registration obtained if the platform itself will invoice
      commission (as opposed to only facilitating vendor-issued invoices).
- [ ] Grievance officer named for DPDP Act compliance (currently a generic
      `privacy@sajdhajlo.com` placeholder on `/contact`).

## Payments (Razorpay)

- [ ] Razorpay account activated for live payments (requires the legal items
      above — Razorpay checks for live Terms/Privacy/Refund pages).
- [ ] `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` set to
      **live** (not test) values in production environment variables.
- [ ] Razorpay webhook URL (`/api/webhooks/razorpay`) registered in the
      Razorpay dashboard, pointed at the production domain.
- [ ] A real end-to-end test payment (small real amount) completed against
      live credentials before opening to the public.

## Security

- [ ] `AUTH_SECRET` is a freshly generated production secret, not the one
      committed to any `.env.example` or used in development.
- [ ] Security headers verified in production (`curl -I` your domain and
      check for `Content-Security-Policy`, `Strict-Transport-Security`,
      `X-Frame-Options` — configured in `next.config.ts`).
- [ ] Rate limiting backed by real Upstash Redis, not the in-memory dev
      fallback (`UPSTASH_REDIS_REST_URL`/`TOKEN` set) — the in-memory fallback
      doesn't share state across instances or survive a restart.
- [ ] `CRON_SECRET` set and the notification-retry job scheduled (see
      RUNBOOK.md).
- [ ] Database backups configured and a restore actually tested (see
      RUNBOOK.md) — not just "a script exists."

## Observability

- [ ] `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) set to a
      real Sentry project.
- [ ] Alerting configured on Sentry for error-rate spikes, not just passive
      logging.
- [ ] `GOOGLE_SITE_VERIFICATION` set and the domain verified in Google Search
      Console, so `sitemap.xml` submission and indexing status are visible.

## SEO

- [ ] Sitemap submitted to Google Search Console and Bing Webmaster Tools.
- [ ] `INDEXNOW_KEY` set (a random string you choose) — the site auto-serves
      it at `/indexnow-key.txt` and pings IndexNow on vendor/banquet approval.
- [ ] Spot-check 5–10 `/[city]/[category]` pages for thin content — a city
      with only 1 published vendor in a category will look sparse; consider
      raising the "listings needed to generate this page" bar past >0 as
      real inventory grows (currently: any published listing qualifies).

## Data & communications

- [ ] `RESEND_API_KEY` (or SES) set to a real, domain-verified sender —
      without it, all transactional email silently no-ops with a log line
      instead of sending (see `src/server/services/email.ts`).
- [ ] `MSG91_AUTH_KEY`/`MSG91_SENDER_ID`/`MSG91_OTP_TEMPLATE_ID` set and the
      OTP template DLT-registered — required for phone-OTP login to work at
      all in production (India's TRAI rules block unregistered template SMS).
- [ ] Decide whether to pursue SMS/WhatsApp notification templates beyond
      OTP — `src/server/services/notification.ts` currently only delivers
      over EMAIL and IN_APP; SMS/WhatsApp notifications are written to the DB
      but marked `FAILED` until an approved template is configured.
- [ ] Seed data (`prisma/seed.ts`) is dev-only — confirm the production
      database is NOT seeded with fake vendors/bookings before go-live.

## Final smoke test (do this against the actual production URL)

- [ ] Register as a customer, vendor, and banquet owner — confirm the
      correct dashboard redirect for each.
- [ ] Complete one real booking end-to-end, including payment.
- [ ] Confirm the booking's invoice downloads correctly from
      `/account/bookings` once the booking is marked `COMPLETED`.
- [ ] Log in as admin, approve a pending vendor KYC, confirm the vendor
      receives the approval email and the profile goes live.
- [ ] Load `/robots.txt` and `/sitemap.xml` on the production domain.
