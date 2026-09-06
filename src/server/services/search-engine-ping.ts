import crypto from "node:crypto";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/lib/seo";

/**
 * IndexNow (https://www.indexnow.org) — a single push endpoint shared by Bing,
 * Yandex, Seznam, and others, telling them a URL changed instead of waiting
 * for a crawl. Ownership is proven by serving INDEXNOW_KEY as plain text at
 * `keyLocation`; see `src/app/indexnow-key.txt/route.ts`.
 */
async function pingIndexNow(urls: string[]): Promise<void> {
  if (!env.INDEXNOW_KEY) {
    logger.warn("[search-engine-ping] INDEXNOW_KEY not set — skipping IndexNow ping");
    return;
  }

  const host = new URL(env.NEXT_PUBLIC_APP_URL).host;
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: env.INDEXNOW_KEY,
      keyLocation: absoluteUrl("/indexnow-key.txt"),
      urlList: urls,
    }),
  });

  if (!response.ok) {
    throw new Error(`IndexNow responded ${response.status}`);
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getGoogleAccessToken(): Promise<string | null> {
  if (!env.GOOGLE_INDEXING_API_CLIENT_EMAIL || !env.GOOGLE_INDEXING_API_PRIVATE_KEY) return null;

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: env.GOOGLE_INDEXING_API_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  // Env files commonly escape the PEM's real newlines as literal "\n".
  const privateKey = env.GOOGLE_INDEXING_API_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange responded ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Google's Indexing API (https://developers.google.com/search/apis/indexing-api).
 * Google's own docs state this only affects crawl priority for `JobPosting`/
 * `BroadcastEvent` pages — neither applies to our vendor/banquet/city listings,
 * so calling it here is unlikely to speed up indexing beyond what the sitemap
 * already does. It's still real, correctly implemented, and harmless to call
 * (Google just may not act on it) — kept because the credentials are already
 * provisioned in `env.ts` and a future job-fair/livestream feature could reuse it.
 */
async function pingGoogleIndexing(urls: string[]): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    logger.warn(
      "[search-engine-ping] GOOGLE_INDEXING_API_CLIENT_EMAIL/PRIVATE_KEY not set — skipping",
    );
    return;
  }

  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, type: "URL_UPDATED" }),
      });
      if (!response.ok) {
        throw new Error(`Google Indexing API responded ${response.status} for ${url}`);
      }
    }),
  );
}

/**
 * Best-effort, fire-and-forget notification that the given paths changed.
 * Never throws — a search-engine ping failing must never fail the mutation
 * (KYC approval, etc.) that triggered it.
 */
export async function notifySearchEnginesOfUpdate(paths: string[]): Promise<void> {
  const urls = paths.map(absoluteUrl);

  await Promise.all([
    pingIndexNow(urls).catch((error: unknown) => {
      logger.error("[search-engine-ping] IndexNow ping failed", { error: String(error) });
    }),
    pingGoogleIndexing(urls).catch((error: unknown) => {
      logger.error("[search-engine-ping] Google Indexing ping failed", { error: String(error) });
    }),
  ]);
}
