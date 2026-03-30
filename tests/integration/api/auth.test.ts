import { vi } from "vitest";

vi.mock("@/auth", () => ({
  handlers: {
    GET: vi.fn(async () => new Response("ok", { status: 200 })),
    POST: vi.fn(async () => new Response("ok", { status: 200 })),
  },
}));

describe("integration/api/auth", () => {
  it("delegates GET to next-auth handler", async () => {
    const { GET } = await import("@/app/api/auth/[...nextauth]/route");
    const res = await GET(new Request("http://localhost/api/auth") as any);
    expect(res.status).toBe(200);
  });

  it("delegates POST to next-auth handler", async () => {
    const { POST } = await import("@/app/api/auth/[...nextauth]/route");
    const res = await POST(new Request("http://localhost/api/auth", { method: "POST" }) as any);
    expect(res.status).toBe(200);
  });
});
