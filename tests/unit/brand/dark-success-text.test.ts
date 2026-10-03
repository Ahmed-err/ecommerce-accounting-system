import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// emerald-500/600 are now the brand success green (#1B8352/#1F7A4D): fine on light
// surfaces, under 4.5:1 on dark ones. Text using them needs a dark: override (P0.3 review I2).
const SRC = path.resolve(__dirname, "../../../src");
const GREEN_TEXT = /(?:^|[\s"'])text-emerald-(?:500|600)(?=[\s"']|$)/;
const DARK_TEXT = /(?:^|\s)dark:text-\S+/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

describe("success-green text", () => {
  it("has a dark-mode colour wherever it is used", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
          const cls = m[1] ?? m[2] ?? m[3];
          if (GREEN_TEXT.test(cls) && !DARK_TEXT.test(cls)) offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
