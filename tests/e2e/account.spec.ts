import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("account e2e", () => {
  test("account settings page requires auth or renders", async ({ page }) => {
    await openPath(page, "/account/settings");
    await expect(page).toHaveURL(/\/(account\/settings|login)/);
  });

  test("account orders page requires auth or renders", async ({ page }) => {
    await openPath(page, "/account/orders");
    await expect(page).toHaveURL(/\/(account\/orders|login)/);
  });
});
