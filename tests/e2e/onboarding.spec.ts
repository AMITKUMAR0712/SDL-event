import { expect, test } from "@playwright/test";

test("vendor onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  const email = `e2e-vendor-onboard-${Date.now()}@example.com`;
  const businessName = `E2E Glow Studio ${Date.now()}`;

  await page.goto("/register");
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.getByRole("option", { name: "Beauty vendor / salon / artist" }).click();
  await page.getByLabel("Full name").fill("E2E Test Vendor");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/vendor\/onboarding$/, { timeout: 15_000 });

  // Step 1: business
  await page.getByLabel("Business name").fill(businessName);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: location
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: services
  await page
    .getByRole("button", { name: /Bridal Makeup/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4: documents (optional, skip)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 5: plan (default already selected) -> submit
  await expect(page.getByText("Choose a plan")).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/dashboard\/vendor$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: businessName })).toBeVisible();
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});

test("banquet onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  const email = `e2e-banquet-onboard-${Date.now()}@example.com`;
  const venueName = `E2E Grand Venue ${Date.now()}`;

  await page.goto("/register");
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.getByRole("option", { name: "Banquet / venue owner" }).click();
  await page.getByLabel("Full name").fill("E2E Test Banquet Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/banquet\/onboarding$/, { timeout: 15_000 });

  // Step 1: venue
  await page.getByLabel("Venue name").fill(venueName);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: location
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: pricing (defaults are fine)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4: documents (info only)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 5: plan -> submit
  await expect(page.getByText("Choose a plan")).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/dashboard\/banquet$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: venueName })).toBeVisible();
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});
