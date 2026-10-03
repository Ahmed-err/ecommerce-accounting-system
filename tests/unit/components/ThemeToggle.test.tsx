import { describe, expect, it } from "vitest";
import { nextTheme } from "@/components/ThemeToggle";

describe("nextTheme", () => {
  it("toggles light and dark only", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("sends legacy or unknown values to dark from a light-looking page", () => {
    expect(nextTheme("system")).toBe("dark");
    expect(nextTheme(undefined)).toBe("dark");
  });
});
