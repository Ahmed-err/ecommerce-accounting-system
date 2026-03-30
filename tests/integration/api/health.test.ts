import { vi } from "vitest";

const db = { $queryRaw: vi.fn(async () => [{ "?column?": 1 }]) };
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

describe("integration/api/health", () => {
  it("GET returns ok true", async () => {
    const { GET } = await import("@/app/api/health/route");
    const req = new Request("http://localhost/api/health", { headers: { "x-request-id": "r1" } });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
