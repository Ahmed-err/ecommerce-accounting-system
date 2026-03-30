import { vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true) }));
vi.mock("@/lib/cloudinary", () => ({ uploadImage: vi.fn(async () => ({ url: "https://img", publicId: "p1" })) }));

describe("integration/api/upload", () => {
  it("POST /api/upload rejects unauthenticated", async () => {
    const { POST } = await import("@/app/api/upload/route");
    const req = new Request("http://localhost/api/upload", { method: "POST" });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
