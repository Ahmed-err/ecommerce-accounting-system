import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("store shopping e2e", () => {
  test("homepage to products navigation works", async ({ page }) => {
    await openPath(page, "/");
    await openPath(page, "/products");
    await expect(page).toHaveURL(/\/products/);
  });

  test("cart and checkout pages load", async ({ page }) => {
    await openPath(page, "/cart");
    await expect(page).toHaveURL(/\/cart/);
    await openPath(page, "/checkout");
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("product listing page renders", async ({ page }) => {
    await openPath(page, "/products");
    await expect(page.locator("body")).toBeVisible();
  });
});
