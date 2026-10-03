import { describe, expect, it, vi } from "vitest";
import { AUTH_RECHECK_MS, canSignIn, refreshAuthToken } from "@/lib/auth-session-guard";

describe("canSignIn", () => {
  it("allows active accounts", () => {
    expect(canSignIn({ isActive: true, accountDeletedAt: null })).toBe(true);
  });

  it("allows new OAuth users that have no isActive flag yet", () => {
    expect(canSignIn({ email: "new@example.com" })).toBe(true);
  });

  it("refuses deactivated, closed or missing accounts", () => {
    expect(canSignIn({ isActive: false })).toBe(false);
    expect(canSignIn({ isActive: true, accountDeletedAt: new Date() })).toBe(false);
    expect(canSignIn(null)).toBe(false);
  });
});

describe("refreshAuthToken", () => {
  const now = 1_000_000_000;

  it("re-reads role and active state once the last check is older than the interval", async () => {
    const load = vi.fn(async () => ({ role: "CASHIER", isActive: true }));
    const token = { id: "u1", role: "ADMIN", checkedAt: now - AUTH_RECHECK_MS - 1 };

    expect(await refreshAuthToken(token, load, now)).toEqual({ id: "u1", role: "CASHIER", checkedAt: now });
    expect(load).toHaveBeenCalledWith("u1");
  });

  it("ends the session of a deactivated user", async () => {
    const load = vi.fn(async () => ({ role: "ADMIN", isActive: false }));
    expect(await refreshAuthToken({ id: "u1", role: "ADMIN" }, load, now)).toBeNull();
  });

  it("ends the session when the user no longer exists", async () => {
    expect(await refreshAuthToken({ id: "u1", role: "ADMIN" }, vi.fn(async () => null), now)).toBeNull();
  });

  it("skips the database while the last check is recent", async () => {
    const load = vi.fn();
    const token = { id: "u1", role: "ADMIN", checkedAt: now - 1000 };
    expect(await refreshAuthToken(token, load, now)).toBe(token);
    expect(load).not.toHaveBeenCalled();
  });

  it("keeps the session if the database is briefly unreachable", async () => {
    const token = { id: "u1", role: "ADMIN" };
    const load = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect(await refreshAuthToken(token, load, now)).toBe(token);
  });
});
