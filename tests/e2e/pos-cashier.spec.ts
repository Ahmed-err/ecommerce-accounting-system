import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("pos cashier e2e", () => {
  test("pos route loads", async ({ page }) => {
    await openPath(page, "/pos");
    await expect(page).toHaveURL(/\/(pos|login)/);
  });
});
