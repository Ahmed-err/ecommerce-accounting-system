import { expect, test } from "@playwright/test";

test.describe("store shell", () => {
  for (const path of ["/", "/products", "/cart", "/login", "/track-order", "/about", "/privacy"]) {
    test(`${path} renders inside the shell`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.locator("main#content")).toHaveCount(1);
      await expect(page.locator("footer").first()).toBeVisible();
    });
  }

  test("unknown URLs return 404 inside the shell", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.locator("header").first()).toBeVisible();
  });

  test("skip link moves focus to the content", async ({ page }) => {
    await page.goto("/products");
    await page.keyboard.press("Tab");
    await expect(page.locator('a[href="#content"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#content")).toBeFocused();
  });
});
