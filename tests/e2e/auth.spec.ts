import { expect, test } from "@playwright/test";

test("customer can register, land on /account, and guests get redirected off it", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Test Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/account$/, { timeout: 10_000 });
  await expect(page.getByText(email)).toBeVisible();
});

test("guests are redirected away from protected routes", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("vendor registration redirects to onboarding, which is guarded from other roles", async ({
  page,
}) => {
  const email = `e2e-vendor-${Date.now()}@example.com`;

  await page.goto("/register");
  // Scoped to the "I am a..." field specifically — the navbar's own City/Service
  // selects are also on this page now, so a generic "first select" locator
  // would grab one of those instead.
  await page.getByRole("combobox", { name: "I am a..." }).click();
  await page.getByRole("option", { name: "Beauty Parlour / Salon Owner" }).click();
  await page.getByLabel("Full name").fill("E2E Test Vendor");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard\/vendor\/onboarding$/, { timeout: 10_000 });
});
