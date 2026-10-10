import { expect, test } from "@playwright/test";

test("vendor onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = Date.now();
  const email = `e2e-vendor-onboard-${suffix}@example.com`;
  const businessName = `E2E Glow Studio ${suffix}`;
  // Unique per run (phone has a unique constraint) — "9" + last 9 digits of
  // the timestamp, so it's still a plausible 10-digit Indian mobile number.
  const phone = `9${String(suffix).slice(-9)}`;

  await page.goto("/register");
  // Scoped to "I am a..." specifically — the navbar's own City/Service
  // selects are also on every page now, so a generic "first select" locator
  // would grab one of those instead.
  await page.getByRole("combobox", { name: "I am a..." }).click();
  await page.getByRole("option", { name: "Beauty Parlour / Salon Owner" }).click();
  await page.getByLabel("Full name").fill("E2E Test Vendor");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/vendor\/onboarding$/, { timeout: 15_000 });

  // Step 1: business
  await page.getByLabel("Business name").fill(businessName);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: location
  // Scoped to "City" — the navbar's own City/Service selects are present on
  // this page too, so a generic "first select" locator would grab one of those.
  await page.getByRole("combobox", { name: "City" }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Street address").fill("123 Test Street");
  await page.getByLabel("Pincode").fill("110001");
  await page.getByLabel("Business phone number").fill(phone);
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
  await page.route(/https:\/\/(?:test|secure)\.payu\.in\/_payment$/, async (route) => {
    const fields = new URLSearchParams(route.request().postData() ?? "");
    expect(fields.get("amount")).toMatch(/^\d+\.\d{2}$/);
    expect(fields.get("hash")).toMatch(/^[a-f\d]{128}$/i);
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "PayU checkout intercepted",
    });
  });
  await page.getByRole("button", { name: /Buy Now/ }).click();

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toMatch(/\/dashboard\/vendor|\/_payment/);

  await page.goto("/dashboard/vendor");
  await expect(page.getByRole("heading", { name: businessName })).toBeVisible();
  // No more KYC approval gate — onboarding itself never blocks on admin
  // review. But visibility is gated on payment: this test intercepts the
  // PayU checkout without completing payment, so the listing should still be
  // unpublished at this point rather than live with an unpaid plan.
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});

test("banquet onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = Date.now();
  const email = `e2e-banquet-onboard-${suffix}@example.com`;
  const venueName = `E2E Grand Venue ${suffix}`;
  // Unique per run (phone has a unique constraint), and a different leading
  // digit than the vendor test above so the two can never collide even if
  // run in the same millisecond.
  const phone = `8${String(suffix).slice(-9)}`;

  await page.goto("/register");
  await page.getByRole("combobox", { name: "I am a..." }).click();
  await page.getByRole("option", { name: "Banquet Owner (Weddings & Parties)" }).click();
  await page.getByLabel("Full name").fill("E2E Test Banquet Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/banquet\/onboarding$/, { timeout: 15_000 });

  // Step 1: venue
  await page.getByLabel("Venue name").fill(venueName);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: location
  // Scoped to "City" — the navbar's own City/Service selects are present on
  // this page too, so a generic "first select" locator would grab one of those.
  await page.getByRole("combobox", { name: "City" }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Street address").fill("456 Venue Road");
  await page.getByLabel("Pincode").fill("110001");
  await page.getByLabel("Venue phone number").fill(phone);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: pricing (defaults are fine)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4: documents (info only)
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 5: plan -> submit
  await expect(page.getByText("Choose a plan")).toBeVisible();
  await page.route(/https:\/\/(?:test|secure)\.payu\.in\/_payment$/, async (route) => {
    const fields = new URLSearchParams(route.request().postData() ?? "");
    expect(fields.get("amount")).toMatch(/^\d+\.\d{2}$/);
    expect(fields.get("hash")).toMatch(/^[a-f\d]{128}$/i);
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "PayU checkout intercepted",
    });
  });
  await page.getByRole("button", { name: /Buy Now/ }).click();

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toMatch(/\/dashboard\/banquet|\/_payment/);

  await page.goto("/dashboard/banquet");
  await expect(page.getByRole("heading", { name: venueName })).toBeVisible();
  // No more KYC approval gate — onboarding itself never blocks on admin
  // review. But visibility is gated on payment: this test intercepts the
  // PayU checkout without completing payment, so the listing should still be
  // unpublished at this point rather than live with an unpaid plan.
  await expect(page.getByText(/KYC status: APPROVED/)).toBeVisible();
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});
