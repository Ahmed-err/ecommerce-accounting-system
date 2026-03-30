import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("admin inventory e2e", () => {
  test("admin inventory route loads or redirects", async ({ page }) => {
    await openPath(page, "/admin/inventory");
    await expect(page).toHaveURL(/\/(admin\/inventory|login)/);
  });
});
