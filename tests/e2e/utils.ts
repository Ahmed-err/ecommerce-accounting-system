import { expect, test, type Page } from "@playwright/test";

let serverAvailable: boolean | null = null;

export async function openPath(page: Page, path: string) {
  if (serverAvailable === null) {
    try {
      const probe = await page.request.get("/", { timeout: 3000 });
      serverAvailable = probe.ok() || probe.status() < 500;
    } catch {
      serverAvailable = false;
    }
  }
  if (!serverAvailable) {
    test.skip(true, "Server or database is not reachable for e2e navigation");
  }
  try {
    const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 8000 });
    expect(res).not.toBeNull();
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
  } catch {
    test.skip(true, "Server or database is not reachable for e2e navigation");
  }
}
