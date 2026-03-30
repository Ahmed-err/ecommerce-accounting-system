import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { openPath } from "./utils";

test.describe("auth e2e", () => {
  test("register page loads", async ({ page }) => {
    await openPath(page, "/register");
    await expect(page).toHaveURL(/\/register/);
  });

  test("login page loads", async ({ page }) => {
    await openPath(page, "/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot password page loads", async ({ page }) => {
    await openPath(page, "/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("reset password page loads", async ({ page }) => {
    await openPath(page, "/reset-password");
    await expect(page).toHaveURL(/\/reset-password/);
  });
});
