import { expect, test } from "@playwright/test";

test("customer can find a vendor via search and request a booking", async ({ browser }) => {
  const customerEmail = `e2e-cust-booking-${Date.now()}@example.com`;

  // Register a customer and book a vendor found via search.
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto("/register");
  await customerPage.getByLabel("Full name").fill("E2E Booking Customer");
  await customerPage.getByLabel("Email").fill(customerEmail);
  await customerPage.getByLabel("Password").fill("Password123");
  await customerPage.getByRole("button", { name: "Create account" }).click();
  await expect(customerPage).toHaveURL(/\/account$/, { timeout: 15_000 });

  await customerPage.goto("/search?type=vendor");
  await customerPage.locator("a[href^='/vendor/']").first().click();
  await expect(customerPage.getByText("Book now")).toBeVisible();

  await customerPage.locator('input[type="checkbox"]').first().check();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await customerPage.locator('input[type="date"]').fill(tomorrow);
  await customerPage.locator('input[type="time"]').fill("11:00");
  await customerPage.getByRole("button", { name: "Request booking" }).click();
  await expect(customerPage.getByText(/awaiting vendor confirmation/)).toBeVisible({
    timeout: 10_000,
  });

  await customerPage.goto("/account/bookings");
  await expect(customerPage.getByText("PENDING")).toBeVisible();
});
