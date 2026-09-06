# Runbook

Operational procedures for running MakeGlowOver in production. This is a
living document — update it whenever a procedure below turns out to be wrong
or incomplete.

## Environment variables

Every variable is validated at boot by `src/lib/env.ts` (Zod) — a missing
required value fails the process immediately rather than surfacing as a
runtime crash. Optional integrations (Redis, MSG91, Sentry, IndexNow, Google
Indexing, Razorpay, Cloudinary/S3, WhatsApp) degrade to a logged no-op/dev
fallback when unset — see `src/lib/redis.ts` for the pattern. Required in
every environment: `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `AUTH_SECRET`.

## Deploys

1. `pnpm install --frozen-lockfile`
2. `pnpm prisma migrate deploy` — never `migrate dev` against production; it
   can prompt for destructive confirmation and is meant for local iteration.
3. `pnpm build`
4. `pnpm start` (or your platform's equivalent — Vercel/Node host).

Roll back by redeploying the previous build artifact. If the deploy included
a migration, check whether it's backwards-compatible before rolling the app
back without also rolling the schema back — an additive migration (new
nullable column, new table) is always safe to leave in place; only a
destructive migration (dropped/renamed column) requires a compensating
migration before rollback.

## Database backups

This app uses MySQL 8. There is no managed-backup service wired up in this
repository — set one of these up before handling real customer data:

- **Managed DB (RDS/PlanetScale/Cloud SQL):** enable the provider's automated
  daily snapshot + point-in-time recovery. This is the recommended path —
  don't hand-roll backups if your host offers this.
- **Self-managed MySQL:** a daily `mysqldump` cron job, e.g.:

  ```bash
  #!/bin/sh
  # /etc/cron.daily/makeglowover-backup
  TIMESTAMP=$(date +%Y%m%d)
  mysqldump --single-transaction --routines --triggers \
    -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" makeglowover \
    | gzip > "/backups/makeglowover-${TIMESTAMP}.sql.gz"
  find /backups -name '*.sql.gz' -mtime +30 -delete
  ```

  Store backups off the DB host (S3/GCS), test a restore quarterly — an
  untested backup is not a backup. `--single-transaction` gets a consistent
  snapshot of InnoDB tables without locking the whole database.

- **Retention:** 30 daily + 12 monthly is a reasonable starting point;
  booking/payment records must be retrievable for as long as Indian tax law
  requires (see the `/privacy` page — currently documented as up to 8 years
  for GST-relevant records).

## Scheduled jobs

- `POST /api/cron/retry-notifications` — sweeps `Notification` rows stuck in
  `PENDING`/`FAILED`/`RETRYING` and re-attempts delivery. Authenticate with
  `Authorization: Bearer $CRON_SECRET`. Point an external scheduler (Vercel
  Cron, GitHub Actions scheduled workflow, a plain crontab hitting curl) at
  this every 5–15 minutes. Returns `503` if `CRON_SECRET` isn't configured —
  that's a signal it hasn't been wired up yet, not a bug.

## Load testing

Not run against a live deployment as part of this build — there's no staging
environment in this sandbox to load-test against, and hammering a shared dev
database would be counterproductive. Before launch, run a real load test
against a staging deployment with production-equivalent DB sizing:

1. Install [k6](https://k6.io/): `brew install k6` / see k6 docs for other platforms.
2. A starting script, targeting the two highest-traffic pages:

   ```js
   // scripts/load-test.js
   import http from "k6/http";
   import { sleep } from "k6";

   export const options = { vus: 50, duration: "2m" };

   export default function () {
     http.get(`${__ENV.BASE_URL}/mumbai/bridal-makeup`);
     http.get(`${__ENV.BASE_URL}/search?type=vendor&city=mumbai`);
     sleep(1);
   }
   ```

   Run with `BASE_URL=https://staging.makeglowover.com k6 run scripts/load-test.js`.

3. Watch: p95 response time, MySQL connection pool saturation (Prisma's
   default pool is small — tune `connection_limit` in `DATABASE_URL` for your
   expected concurrency), and Redis latency if using Upstash's free tier
   (rate limiting and OTP storage both depend on it).

## Incident response

1. Check `SENTRY_DSN`-reported errors first if Sentry is configured
   (`src/instrumentation.ts` / `src/instrumentation-client.ts`) — it captures
   both server and client exceptions.
2. Every admin mutation is audit-logged (`AuditLog` table, viewable at
   `/dashboard/admin/audit-log`) — use it to answer "who changed what, when."
3. Payment issues: check the `Payment.rawPayload` column for the raw Razorpay
   webhook/order payload before escalating to Razorpay support.
4. If Redis is down: the app falls back to an in-memory rate limiter/OTP store
   per-instance (see `src/lib/redis.ts`) — rate limits and OTP codes stop
   being shared across instances, but the app does not crash.
