import { beforeEach, describe, expect, it, vi } from "vitest";

const captured: { config?: any } = {};
const findUnique = vi.fn();
const findFirst = vi.fn();

vi.mock("next-auth", () => ({
  default: (config: any) => {
    captured.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({ default: (opts: any) => ({ id: "credentials", ...opts }) }));
vi.mock("next-auth/providers/google", () => ({ default: (opts: any) => ({ id: "google", ...opts }) }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, findFirst } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true) }));

async function config() {
  await import("@/auth");
  return captured.config;
}

describe("src/auth.js wiring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses credentials login for a deactivated account even with the right password", async () => {
    const bcrypt = await import("bcryptjs");
    findFirst.mockResolvedValue({
      id: "u1",
      email: "staff@example.com",
      password: await bcrypt.hash("Password123", 4),
      isActive: false,
      role: "CASHIER",
    });
    const credentials = (await config()).providers.find((p: any) => p.id === "credentials");

    expect(await credentials.authorize({ email: "staff@example.com", password: "Password123" })).toBeNull();
  });

  it("refuses Google sign-in for a deactivated account", async () => {
    const { callbacks } = await config();
    expect(await callbacks.signIn({ user: { id: "u1", isActive: false } })).toBe(false);
  });

  it("ends an existing session once the account is deactivated", async () => {
    findUnique.mockResolvedValue({ role: "ADMIN", isActive: false, accountDeletedAt: null });
    const { callbacks } = await config();

    expect(await callbacks.jwt({ token: { sub: "u1", id: "u1", role: "ADMIN" } })).toBeNull();
  });

  it("picks up a role change on an existing session", async () => {
    findUnique.mockResolvedValue({ role: "CASHIER", isActive: true, accountDeletedAt: null });
    const { callbacks } = await config();

    const token = await callbacks.jwt({ token: { sub: "u1", id: "u1", role: "ADMIN" } });
    expect(token.role).toBe("CASHIER");
  });

  it("stamps the check time at sign-in without a database read", async () => {
    const { callbacks } = await config();
    const token = await callbacks.jwt({ token: { sub: "u1" }, user: { id: "u1", role: "ADMIN" } });

    expect(token).toMatchObject({ id: "u1", role: "ADMIN" });
    expect(typeof token.checkedAt).toBe("number");
    expect(findUnique).not.toHaveBeenCalled();
  });
});
