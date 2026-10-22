import { vi } from "vitest";

const db = { $queryRaw: vi.fn(async () => [{ "?column?": 1 }]) };
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/monitoring", () => ({ emitAlert: vi.fn(async () => {}) }));

describe("integration/api/health", () => {
  beforeEach(() => db.$queryRaw.mockClear());

  it("GET returns ok without touching the database", async () => {
    const { GET } = await import("@/app/api/health/route");
    const req = new Request("http://localhost/api/health", { headers: { "x-request-id": "r1" } });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("not_checked");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("GET ?db=1 runs the database check", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(new Request("http://localhost/api/health?db=1") as any);
    expect(res.status).toBe(200);
    expect((await res.json()).db).toBe("ok");
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("GET ?db=1 returns 503 when the database is unavailable", async () => {
    db.$queryRaw.mockRejectedValueOnce(new Error("down"));
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(new Request("http://localhost/api/health?db=1") as any);
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });
});
