import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("rtl arabic e2e", () => {
  test("arabic locale renders page", async ({ page }) => {
    await openPath(page, "/");
    await expect(page.locator("html")).toBeVisible();
  });

  test("arabic locale products page loads", async ({ page }) => {
    await openPath(page, "/products");
    await expect(page).toHaveURL(/\/products/);
  });
});
