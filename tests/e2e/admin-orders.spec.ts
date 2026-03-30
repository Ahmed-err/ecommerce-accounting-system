import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("admin orders e2e", () => {
  test("admin orders route loads or redirects", async ({ page }) => {
    await openPath(page, "/admin/orders");
    await expect(page).toHaveURL(/\/(admin\/orders|login)/);
  });
});
