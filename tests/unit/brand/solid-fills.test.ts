import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Buttons/badges default to --primary-foreground (navy). A solid green/red/blue fill
// set on top needs its own light text, or the label drops below 4.5:1 (P0.3 review I1).
const SRC = path.resolve(__dirname, "../../../src");
const SOLID = /(?:^|\s)bg-(?:emerald|red|rose|blue|green)-(?:600|700)(?=\s|$)/;
const TEXT = /(?:^|\s)(?:[\w/-]+:)*text-(?:white|black|primary-foreground|destructive-foreground|success-foreground|info-foreground|\[)/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

describe("solid status fills", () => {
  it("always set a readable text colour", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
          const cls = m[1] ?? m[2] ?? m[3];
          if (SOLID.test(cls) && !TEXT.test(cls)) offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
