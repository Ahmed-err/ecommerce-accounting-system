import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", async (orig) => ({ ...(await orig<object>()), notFound }));

describe("/styleguide", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is hidden in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { default: Page } = await import("@/app/styleguide/page");
    expect(() => Page()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders on previews and locally", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { default: Page } = await import("@/app/styleguide/page");
    expect(Page()).toBeTruthy();
  });
});
