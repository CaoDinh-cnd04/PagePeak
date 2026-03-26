import { test, expect } from "@playwright/test";

test("trang chủ tải được", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
