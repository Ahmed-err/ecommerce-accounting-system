import { afterEach, describe, expect, it, vi } from "vitest";

async function cliUrl(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const { default: config } = await import("../../../prisma.config");
  return config.datasource?.url;
}

describe("prisma.config datasource url (used by migrate deploy)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers the direct URL so migrations do not run through the pooler", async () => {
    expect(await cliUrl({ DATABASE_URL: "postgres://pooled", DIRECT_URL: "postgres://direct" })).toBe("postgres://direct");
  });

  it("falls back to DATABASE_URL when no direct URL is set (local dev, CI)", async () => {
    expect(await cliUrl({ DATABASE_URL: "postgres://local", DIRECT_URL: "" })).toBe("postgres://local");
  });
});
