import { test, expect } from "@playwright/test";

test("投稿フロー", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await page.fill("input", "テスト e2e");
  await page.click("text=投稿");
  await expect(page.getByText("テスト e2e")).toBeVisible();
});