import { expect, test } from "@playwright/test";

test("admin can bulk-delete users and cancel a booking", async ({ page, browser }) => {
  const suffix = Date.now();
  const email1 = `e2e-mod-user1-${suffix}@example.com`;
  const email2 = `e2e-mod-user2-${suffix}@example.com`;
  const bookingCustomerEmail = `e2e-mod-booker-${suffix}@example.com`;

  // Register two throwaway customers to delete, and a third to book with.
  for (const email of [email1, email2]) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto("/register");
    await p.getByLabel("Full name").fill(`E2E Mod User ${email}`);
    await p.getByLabel("Email").fill(email);
    await p.getByLabel("Password", { exact: true }).fill("Password123");
    await p.getByRole("button", { name: "Create account" }).click();
    await expect(p).toHaveURL("http://localhost:3000/", { timeout: 15_000 });
    await ctx.close();
  }

  const bookerContext = await browser.newContext();
  const bookerPage = await bookerContext.newPage();
  await bookerPage.goto("/register");
  await bookerPage.getByLabel("Full name").fill(`E2E Mod Booker ${suffix}`);
  await bookerPage.getByLabel("Email").fill(bookingCustomerEmail);
  await bookerPage.getByLabel("Password", { exact: true }).fill("Password123");
  await bookerPage.getByRole("button", { name: "Create account" }).click();
  await expect(bookerPage).toHaveURL("http://localhost:3000/", { timeout: 15_000 });

  await bookerPage.goto("/search?type=vendor");
  await bookerPage.locator("a[href^='/vendor/']").first().click();
  await expect(bookerPage.getByText("Book now")).toBeVisible();
  await bookerPage.locator('input[type="checkbox"]').first().check();
  const daysAhead = 1 + Math.floor(Math.random() * 13);
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await bookerPage.locator('input[type="date"]').fill(date);
  const hour = 9 + Math.floor(Math.random() * 8);
  const minute = Math.random() < 0.5 ? "00" : "30";
  await bookerPage.locator('input[type="time"]').fill(`${String(hour).padStart(2, "0")}:${minute}`);
  await bookerPage.getByPlaceholder("Your 10-digit mobile number").fill("9876543210");
  await bookerPage.getByRole("button", { name: "Request booking" }).click();
  await expect(bookerPage.getByText(/awaiting vendor confirmation/)).toBeVisible({
    timeout: 10_000,
  });
  await bookerContext.close();

  // Admin: bulk-delete the two throwaway users.
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@sajdhajlo.com");
  await page.getByLabel("Password", { exact: true }).fill("AdminPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin$/, { timeout: 15_000 });

  await page.goto("/dashboard/admin/users");
  const row1 = page.locator("div.p-3", { hasText: email1 });
  const row2 = page.locator("div.p-3", { hasText: email2 });
  await row1.locator('input[type="checkbox"]').check();
  await row2.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /Delete selected \(2\)/ }).click();
  await expect(page.getByText(email1)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(email2)).toHaveCount(0);

  // Admin: cancel the booking just created.
  await page.goto("/dashboard/admin/bookings");
  const bookingRow = page.locator("div.p-3", { hasText: `E2E Mod Booker ${suffix}` });
  await expect(bookingRow.getByText("PENDING")).toBeVisible();
  await bookingRow.getByRole("button", { name: "Cancel" }).click();
  await expect(bookingRow.getByText("CANCELLED")).toBeVisible({ timeout: 10_000 });
  await expect(bookingRow.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});
