import { expect, test } from "@playwright/test";

test("customer can find a vendor via search and request a booking", async ({ browser }) => {
  const customerEmail = `e2e-cust-booking-${Date.now()}@example.com`;

  // Register a customer and book a vendor found via search.
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto("/register");
  await customerPage.getByLabel("Full name").fill("E2E Booking Customer");
  await customerPage.getByLabel("Email").fill(customerEmail);
  await customerPage.getByLabel("Password", { exact: true }).fill("Password123");
  await customerPage.getByRole("button", { name: "Create account" }).click();
  await expect(customerPage).toHaveURL("http://localhost:3000/", { timeout: 15_000 });

  await customerPage.goto("/search?type=vendor");
  await customerPage.locator("a[href^='/vendor/']").first().click();
  await expect(customerPage.getByText("Book now")).toBeVisible();

  await customerPage.locator('input[type="checkbox"]').first().check();
  // A random day+slot, not a fixed one — this test targets a shared seeded
  // vendor, so re-running it against the same dev DB would otherwise
  // collide with a slot an earlier run already booked. Spreading across
  // two weeks and half-hour slots gives well over a hundred combinations.
  const daysAhead = 1 + Math.floor(Math.random() * 13);
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await customerPage.locator('input[type="date"]').fill(date);
  const hour = 9 + Math.floor(Math.random() * 8);
  const minute = Math.random() < 0.5 ? "00" : "30";
  await customerPage
    .locator('input[type="time"]')
    .fill(`${String(hour).padStart(2, "0")}:${minute}`);
  await customerPage.getByPlaceholder("Your 10-digit mobile number").fill("9876543210");
  await customerPage.getByRole("button", { name: "Request booking" }).click();
  await expect(customerPage.getByText(/awaiting vendor confirmation/)).toBeVisible({
    timeout: 10_000,
  });

  await customerPage.goto("/account/bookings");
  await expect(customerPage.getByText("PENDING")).toBeVisible();
});
