import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../../../src/app/styles/palette.css"), "utf8");
const val = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];

describe("palette remap", () => {
  it("puts brand values behind the classes the app already uses", () => {
    expect(val("amber-500")).toBe("#F2A20C");
    expect(val("amber-700")).toBe("#9A5B00");
    expect(val("emerald-600")).toBe("#1F7A4D");
    expect(val("slate-900")).toBe("#0E1A2B");
  });

  it("keeps the common pairs readable", () => {
    expect(contrast("#000000", val("amber-500")!)).toBeGreaterThanOrEqual(4.5); // bg-amber-500 text-black (131 uses)
    expect(contrast("#FFFFFF", val("emerald-500")!)).toBeGreaterThanOrEqual(4.5); // white on emerald badges
    expect(contrast("#FFFFFF", val("emerald-600")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(val("emerald-400")!, "#0B1422")).toBeGreaterThanOrEqual(4.5); // green text on dark
    expect(contrast(val("amber-400")!, "#0B1422")).toBeGreaterThanOrEqual(4.5); // amber text on dark
    expect(contrast(val("amber-700")!, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("is imported by globals.css", () => {
    const globals = fs.readFileSync(path.resolve(__dirname, "../../../src/app/globals.css"), "utf8");
    expect(globals).toContain('@import "./styles/palette.css";');
  });
});
