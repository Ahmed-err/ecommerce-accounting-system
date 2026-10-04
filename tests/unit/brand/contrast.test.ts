import { describe, expect, it } from "vitest";
import { contrast, readTokens } from "./tokens";

const PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["info-foreground", "info"],
  ["warning-foreground", "warning"],
  ["brand-foreground", "brand"],
  ["accent-text", "background"],
  ["accent-text", "card"],
  ["success", "card"],
  ["destructive", "card"],
  ["info", "card"],
  ["ink-2", "card"],
  ["ink-2", "background"],
];

describe.each(["light", "dark"] as const)("%s tokens", (theme) => {
  const t = readTokens(theme);

  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(t[fg], `missing --${fg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(t[bg], `missing --${bg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it("uses the approved brand values", () => {
  const t = readTokens("light");
  expect(t["navy-900"]).toBe("#0E1A2B");
  expect(t["amber-500"]).toBe("#F2A20C");
  expect(t.primary).toBe("#F2A20C");
  expect(t["primary-foreground"]).toBe("#0E1A2B");
  expect(t.background).toBe("#F7F6F3");
});
