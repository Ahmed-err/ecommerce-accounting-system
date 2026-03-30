import { vi } from "vitest";

const authMock = vi.fn();
const db = {
  notification: {
    updateMany: vi.fn(async () => ({ count: 1 })),
    findFirst: vi.fn(async () => ({ id: "n1" })),
    update: vi.fn(async () => ({ id: "n1", read: true })),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  },
};

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/notifications", () => ({
  countUnreadNotifications: vi.fn(async () => 2),
  listNotificationsForUser: vi.fn(async () => [{ id: "n1", read: false }]),
}));

describe("integration/api/notifications", () => {
  it("GET requires auth", async () => {
    authMock.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications") as any);
    expect(res.status).toBe(401);
  });

  it("GET returns rows when authenticated", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1", role: "ADMIN" } });
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(new Request("http://localhost/api/notifications") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("POST read-all marks all as read", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1", role: "ADMIN" } });
    const { POST } = await import("@/app/api/notifications/read-all/route");
    const res = await POST();
    expect(res.status).toBe(200);
  });
});
