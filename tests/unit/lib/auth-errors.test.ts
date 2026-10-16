import { describe, expect, it } from "vitest";
import { authErrorKey } from "@/lib/auth-errors";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";

describe("sign-in error messages", () => {
  it("names the reason for the cases a customer can act on", () => {
    expect(authErrorKey("AccessDenied")).toBe("authErrAccessDenied");
    expect(authErrorKey("OAuthAccountNotLinked")).toBe("authErrAccountNotLinked");
    expect(authErrorKey("AccountNotLinked")).toBe("authErrAccountNotLinked");
    expect(authErrorKey("Configuration")).toBe("authErrGoogleUnavailable");
  });

  it("anything else from Google (cancelled, expired, network) asks to try again", () => {
    for (const code of ["OAuthCallbackError", "OAuthSignin", "Callback", "Verification", "Something"]) {
      expect(authErrorKey(code)).toBe("authErrGoogleFailed");
    }
  });

  it("no code, no message", () => {
    expect(authErrorKey(null)).toBeNull();
    expect(authErrorKey("")).toBeNull();
  });

  it("every message exists in Arabic and English", () => {
    for (const code of ["AccessDenied", "OAuthAccountNotLinked", "Configuration", "X"]) {
      const key = authErrorKey(code) as string;
      expect((ar as any)[key]).toBeTruthy();
      expect((en as any)[key]).toBeTruthy();
    }
  });
});
