import path from "node:path";

import { type Browser, expect, test } from "@playwright/test";

const DUMMY_VIDEO = path.join(__dirname, "dummy.mp4");

// These settings are global, shared dev-DB rows (not per-test-suffixed like a
// user/booking), so a test that activates one must deactivate it again —
// otherwise the popup/button stays on for every test that runs after this
// file, in this run and any later one.
async function deactivateVideoSettings(browser: Browser) {
  const page = await browser.newPage();
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@sajdhajlo.com");
  await page.getByLabel("Password", { exact: true }).fill("AdminPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin$/, { timeout: 15_000 });

  await page.goto("/dashboard/admin/settings");
  for (const heading of ["Homepage popup video", "Vendor onboarding guide video"]) {
    const section = page.locator("div.rounded-lg", { hasText: heading }).first();
    const checkbox = section.getByRole("checkbox");
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
      await section.getByRole("button", { name: "Save" }).click();
      await expect(section.getByText("Saved.")).toBeVisible({ timeout: 10_000 });
    }
  }
  await page.close();
}

test.afterEach(async ({ browser }) => {
  await deactivateVideoSettings(browser);
});

test("admin can configure the popup video and it shows on the home page", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@sajdhajlo.com");
  await page.getByLabel("Password", { exact: true }).fill("AdminPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin$/, { timeout: 15_000 });

  await page.goto("/dashboard/admin/settings");
  await expect(page.getByText("Homepage popup video")).toBeVisible();

  await page.getByPlaceholder("Popup title").fill("Smoke Test Popup");
  const popupSection = page.locator("div.rounded-lg", { hasText: "Homepage popup video" }).first();
  await popupSection.locator('input[type="file"]').setInputFiles(DUMMY_VIDEO);
  await expect(popupSection.locator("video")).toHaveCount(1, { timeout: 10_000 });
  await popupSection.getByRole("checkbox").check();
  await popupSection.getByRole("button", { name: "Save" }).click();
  await expect(popupSection.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  // fresh context = fresh sessionStorage, so the popup should show on first load
  const freshPage = await context.browser()!.newPage();
  await freshPage.goto("/");
  await expect(freshPage.getByRole("heading", { name: "Smoke Test Popup" })).toBeVisible({
    timeout: 10_000,
  });
  await freshPage.close();
});

test("admin can configure the vendor guide video and it shows on onboarding step 1", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@sajdhajlo.com");
  await page.getByLabel("Password", { exact: true }).fill("AdminPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin$/, { timeout: 15_000 });

  await page.goto("/dashboard/admin/settings");
  const guideSection = page
    .locator("div.rounded-lg", { hasText: "Vendor onboarding guide video" })
    .first();
  await guideSection.locator('input[type="file"]').setInputFiles(DUMMY_VIDEO);
  await expect(guideSection.locator("video")).toHaveCount(1, { timeout: 10_000 });
  await guideSection.getByRole("checkbox").check();
  await guideSection.getByRole("button", { name: "Save" }).click();
  await expect(guideSection.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  // register a fresh vendor and reach onboarding step 1
  const suffix = Date.now();
  await page.goto("/register");
  await page.getByRole("combobox", { name: "I am a..." }).click();
  await page.getByRole("option", { name: "Beauty Parlour / Salon Owner" }).click();
  await page.getByLabel("Full name").fill("Smoke Vendor");
  await page.getByLabel("Email").fill(`smoke-vendor-${suffix}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard\/vendor\/onboarding$/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: /how to register your business/i })).toBeVisible();
  await page.getByRole("button", { name: /how to register your business/i }).click();
  await expect(page.getByRole("heading", { name: "How to register your business" })).toBeVisible();
  await expect(page.locator('[role="dialog"] video')).toHaveCount(1);
});
