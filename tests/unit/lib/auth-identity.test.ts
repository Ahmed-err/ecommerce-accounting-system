import { describe, expect, it } from "vitest";
import { normalizeEmail, phoneVariants, isSafeCallbackPath } from "@/lib/auth-identity";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ahmed@Gmail.COM ")).toBe("ahmed@gmail.com");
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("phoneVariants", () => {
  it("gives every Sudan form the same canonical number", () => {
    for (const input of ["0912345678", "912345678", "+249912345678", "00249 912 345 678", "249-912-345-678"]) {
      expect(phoneVariants(input)?.canonical).toBe("+249912345678");
    }
  });

  it("includes the forms older sign-ups were saved in", () => {
    expect(phoneVariants("+249912345678")?.variants).toEqual(
      expect.arrayContaining(["+249912345678", "+0912345678", "0912345678", "+912345678"])
    );
  });

  it("handles Sudani/Zain 01x numbers", () => {
    expect(phoneVariants("0123456789")?.canonical).toBe("+249123456789");
  });

  it("keeps other international numbers as typed", () => {
    expect(phoneVariants("+20 100 123 4567")).toEqual({ canonical: "+201001234567", variants: ["+201001234567"] });
  });

  it("rejects junk", () => {
    expect(phoneVariants("abc")).toBeNull();
    expect(phoneVariants("12")).toBeNull();
    expect(phoneVariants("")).toBeNull();
  });
});

describe("isSafeCallbackPath", () => {
  it("allows same-site paths only", () => {
    expect(isSafeCallbackPath("/account/orders?x=1")).toBe(true);
    expect(isSafeCallbackPath("//evil.com")).toBe(false);
    expect(isSafeCallbackPath("/\\evil.com")).toBe(false);
    expect(isSafeCallbackPath("https://evil.com")).toBe(false);
    expect(isSafeCallbackPath("/login")).toBe(false);
    expect(isSafeCallbackPath(null)).toBe(false);
  });
});

describe("accountLookupWhere", () => {
  it("matches email without case and phone in any saved form", async () => {
    const { accountLookupWhere } = await import("@/lib/auth-identity");
    expect(accountLookupWhere(" A@B.com ")).toEqual({ email: { equals: "a@b.com", mode: "insensitive" } });
    expect(accountLookupWhere("0912345678")).toEqual({
      phone: { in: ["+249912345678", "+0912345678", "0912345678", "+912345678"] },
    });
    expect(accountLookupWhere("hello")).toBeNull();
  });
});
