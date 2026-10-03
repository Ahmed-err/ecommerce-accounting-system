import { afterEach, describe, expect, it, vi } from "vitest";

async function scriptSrc(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const { default: config } = await import("../../../next.config.mjs");
  const [{ headers }] = await config.headers();
  const csp = headers.find((h: { key: string }) => h.key === "Content-Security-Policy").value as string;
  return csp.split(";").find((d) => d.trim().startsWith("script-src"))!.trim();
}

describe("Content-Security-Policy script-src", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows eval in development so webpack dev chunks can run", async () => {
    expect(await scriptSrc("development")).toContain("'unsafe-eval'");
  });

  it("never allows eval in production", async () => {
    expect(await scriptSrc("production")).toBe("script-src 'self' 'unsafe-inline'");
  });
});
