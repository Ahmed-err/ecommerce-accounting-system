import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../../../src");
const files = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(d, e.name);
    return e.isDirectory() ? files(f) : /\.(jsx?|tsx?)$/.test(e.name) ? [f] : [];
  });

it("no client module imports both dictionaries", () => {
  const offenders = files(SRC).filter((f) => {
    const s = fs.readFileSync(f, "utf8");
    return s.includes('"use client"') && /from "@\/lib\/translations"/.test(s);
  });
  expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
});
