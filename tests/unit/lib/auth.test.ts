import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v: string) => /^(\+?\d{8,15}|09\d{8})$/.test(v.replace(/\s+/g, ""));
const otp = () => Math.floor(1000 + Math.random() * 9000);

describe("auth helpers", () => {
  it("validates email", () => {
    expect(isEmail("a@b.com")).toBe(true);
    expect(isEmail("bad-email")).toBe(false);
    expect(isEmail("0912345678")).toBe(false);
  });

  it("validates phone", () => {
    expect(isPhone("0912345678")).toBe(true);
    expect(isPhone("+249912345678")).toBe(true);
    expect(isPhone("abc")).toBe(false);
  });

  it("hashes and verifies password", async () => {
    const hash = await bcrypt.hash("Password123", 10);
    expect(await bcrypt.compare("Password123", hash)).toBe(true);
    expect(await bcrypt.compare("Wrong123", hash)).toBe(false);
  });

  it("generates unique token with expiry", () => {
    const a = crypto.randomUUID();
    const b = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });

  it("generates 4 digit OTP", () => {
    const code = otp();
    expect(code).toBeGreaterThanOrEqual(1000);
    expect(code).toBeLessThanOrEqual(9999);
  });
});
