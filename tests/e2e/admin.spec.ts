import { expect, test } from "@playwright/test";

test("admin can log in and see the dashboard with real metrics", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@sajdhajlo.com");
  await page.getByLabel("Password").fill("AdminPass123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard\/admin$/, { timeout: 15_000 });
  await expect(page.getByText("Total users")).toBeVisible();
  await expect(page.getByText("Pending KYC")).toBeVisible();

  await page.goto("/dashboard/admin/kyc");
  await expect(page.getByRole("heading", { name: "KYC review" })).toBeVisible();
});
