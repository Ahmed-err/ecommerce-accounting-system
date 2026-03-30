import { vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  getClientIP: vi.fn(async () => "127.0.0.1"),
  checkRateLimit: vi.fn(async () => true),
}));

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  verificationToken: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(async (ops: any) => (Array.isArray(ops) ? Promise.all(ops) : ops())),
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock, db: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(async () => ({ count: 1 })) }));
vi.mock("@/lib/senders", () => ({ sendResetEmail: vi.fn(async () => true), sendResetSMS: vi.fn(async () => true) }));

describe("actions/auth", () => {
  it("registerUser success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1", name: "A B", email: "a@b.com" });
    const { registerUser } = await import("@/app/actions/register");
    const fd = new FormData();
    fd.set("firstName", "A");
    fd.set("lastName", "B");
    fd.set("email", "a@b.com");
    fd.set("phone", "0912345678");
    fd.set("password", "Password123");
    const out = await registerUser(fd);
    expect(out.success).toBe(true);
  });

  it("registerUser duplicate email/phone", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "x" });
    const { registerUser } = await import("@/app/actions/register");
    const fd = new FormData();
    fd.set("firstName", "A");
    fd.set("lastName", "B");
    fd.set("email", "a@b.com");
    fd.set("phone", "0912345678");
    fd.set("password", "Password123");
    const out = await registerUser(fd);
    expect(out.error).toBeTruthy();
  });

  it("registerUser weak password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { registerUser } = await import("@/app/actions/register");
    const fd = new FormData();
    fd.set("firstName", "A");
    fd.set("lastName", "B");
    fd.set("email", "a@b.com");
    fd.set("phone", "0912345678");
    fd.set("password", "weak");
    const out = await registerUser(fd);
    expect(out.error).toMatch(/Password/);
  });

  it("forgotPassword returns success for unknown", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { requestPasswordReset } = await import("@/app/actions/reset-password");
    const out = await requestPasswordReset("unknown@test.local");
    expect(out.success).toBe(true);
  });

  it("resetPassword invalid token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);
    const { resetPassword } = await import("@/app/actions/reset-password");
    const out = await resetPassword("a@b.com", "bad", "Password123");
    expect(out.success).toBe(false);
  });
});
