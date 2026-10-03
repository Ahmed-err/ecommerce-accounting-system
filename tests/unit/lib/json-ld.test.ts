import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { jsonLdHtml } from "@/lib/json-ld";

describe("jsonLdHtml", () => {
  it("cannot close the surrounding <script> tag", () => {
    const html = jsonLdHtml({ author: { name: "</script><script>alert(1)</script>" } });
    expect(html).not.toMatch(/<\/?script/i);
    expect(html).not.toContain("<");
  });

  it("still parses back to the same data", () => {
    const data = { name: "</script> & \u2028 مثقاب", n: 1 };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });
});

describe("JSON-LD call sites", () => {
  const SRC = path.resolve(__dirname, "../../../src");
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? files(full) : /\.(js|jsx|ts|tsx)$/.test(e.name) ? [full] : [];
    });

  it("never inline raw JSON.stringify output into a script tag", () => {
    const offenders = files(SRC).filter((f) =>
      /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\(/.test(fs.readFileSync(f, "utf8"))
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
