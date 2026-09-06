import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Serial, not parallel: several specs register/log in against a shared
  // per-IP rate limiter (src/lib/rate-limit.ts) meant to stop real abuse —
  // parallel workers + CI retries multiply attempts past that limit and
  // produce flaky failures that have nothing to do with the feature under
  // test. The suite is small enough that running serially costs nothing.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
