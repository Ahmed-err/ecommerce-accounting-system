import { afterEach, describe, expect, it, vi } from "vitest";

const base = { NODE_ENV: "production", NEXT_PHASE: "", DATABASE_URL: "postgres://x", AUTH_SECRET: "s" };

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ ...base, NEXT_PUBLIC_URL: "", NEXT_PUBLIC_SITE_URL: "", ...env })) vi.stubEnv(k, v);
  return (await import("@/lib/env")).validateEnv;
}

afterEach(() => vi.unstubAllEnvs());

describe("validateEnv", () => {
  it("accepts either site URL variable", async () => {
    expect(await load({ NEXT_PUBLIC_SITE_URL: "https://www.himmat.store" })).not.toThrow();
    expect(await load({ NEXT_PUBLIC_URL: "https://www.himmat.store" })).not.toThrow();
  });

  it("names both options when the site URL is missing", async () => {
    expect(await load({})).toThrow("NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_URL");
  });
});
