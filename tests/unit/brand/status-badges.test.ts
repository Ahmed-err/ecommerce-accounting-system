import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// destructive/success/info badges are dot + coloured text (no fill, no padding). A badge
// that paints its own solid background must use a filled variant, or the text sits flush
// against the edges with a stray dot (P0.3 review: POS out-of-stock badge).
const SRC = path.resolve(__dirname, "../../../src");

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

describe("status badges", () => {
  it("never combine a dot variant with a background fill", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/<Badge\b[^>]*>/g)) {
          if (/variant="(destructive|success|info)"/.test(m[0]) && /className="[^"]*\bbg-/.test(m[0])) {
            offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
