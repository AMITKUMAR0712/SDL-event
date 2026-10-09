import { expect, test } from "@playwright/test";

test("vendor onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  // The real Cashfree sandbox call below has been observed taking just
  // over the default 30s test timeout to fully load the modal's payment
  // methods, so this test needs more headroom than the suite default.
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
  await page.getByRole("button", { name: /Buy Now/ }).click();

  // Real Cashfree sandbox keys are configured in this environment, so
  // clicking above creates the profile+subscription (proven by the fact
  // that a real Checkout modal opens right after, with the phone number
  // just entered) and then opens a real payment widget. The modal stays
  // open waiting for a real interaction, which a live third-party payment
  // UI isn't something e2e should simulate — so this only waits for proof
  // the modal opened, then navigates directly rather than waiting on the
  // wizard's own navigation (blocked on that same open modal).
  // `.first()` on a bare "iframe" locator is unreliable here: other
  // scripts (GTM, etc.) can add iframes to the DOM, and a plain CSS
  // locator doesn't know which one is Cashfree's. Target it by its actual
  // src so this isn't dependent on DOM order, and assert on the "Payment
  // Options for +91..." text, which only renders once the real payment
  // methods have loaded from Cashfree — unambiguous, visible proof the
  // modal fully opened.
  await page.waitForTimeout(5_000);
  console.log(
    "DEBUG iframes:",
    await page.evaluate(() =>
      Array.from(document.querySelectorAll("iframe")).map((f) => ({
        src: f.src,
        title: f.title,
        name: f.name,
        id: f.id,
        w: f.offsetWidth,
        h: f.offsetHeight,
      })),
    ),
  );

  await page
    .frameLocator('iframe[src*="cashfree.com"]')
    .getByText(/Payment Options for/)
    .waitFor({ state: "visible", timeout: 45_000 });

  await page.goto("/dashboard/vendor");
  await expect(page.getByRole("heading", { name: businessName })).toBeVisible();
  // No more KYC approval gate — onboarding itself never blocks on admin
  // review. But visibility is gated on payment: this test never completes
  // the real Cashfree checkout (see above), so the listing should still be
  // unpublished at this point rather than live with an unpaid plan.
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});

test("banquet onboarding wizard completes and shows the new profile on the dashboard", async ({
  page,
}) => {
  // The real Cashfree sandbox call below has been observed taking just
  // over the default 30s test timeout to fully load the modal's payment
  // methods, so this test needs more headroom than the suite default.
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
  await page.getByRole("button", { name: /Buy Now/ }).click();

  // Real Cashfree sandbox keys are configured in this environment, so
  // clicking above creates the profile+subscription (proven by the fact
  // that a real Checkout modal opens right after, with the phone number
  // just entered) and then opens a real payment widget. The modal stays
  // open waiting for a real interaction, which a live third-party payment
  // UI isn't something e2e should simulate — so this only waits for proof
  // the modal opened, then navigates directly rather than waiting on the
  // wizard's own navigation (blocked on that same open modal).
  // `.first()` on a bare "iframe" locator is unreliable here: other
  // scripts (GTM, etc.) can add iframes to the DOM, and a plain CSS
  // locator doesn't know which one is Cashfree's. Target it by its actual
  // src so this isn't dependent on DOM order, and assert on the "Payment
  // Options for +91..." text, which only renders once the real payment
  // methods have loaded from Cashfree — unambiguous, visible proof the
  // modal fully opened.
  await page
    .frameLocator('iframe[src*="cashfree.com"]')
    .getByText(/Payment Options for/)
    .waitFor({ state: "visible", timeout: 45_000 });

  await page.goto("/dashboard/banquet");
  await expect(page.getByRole("heading", { name: venueName })).toBeVisible();
  // No more KYC approval gate — onboarding itself never blocks on admin
  // review. But visibility is gated on payment: this test never completes
  // the real Cashfree checkout (see above), so the listing should still be
  // unpublished at this point rather than live with an unpaid plan.
  await expect(page.getByText(/KYC status: APPROVED/)).toBeVisible();
  await expect(page.getByText(/Not published yet/)).toBeVisible();
});
