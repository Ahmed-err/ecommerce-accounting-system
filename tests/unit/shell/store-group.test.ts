import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const GROUP = path.resolve(__dirname, "../../../src/app/(store)");
const files = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(d, e.name);
    return e.isDirectory() ? files(f) : f.endsWith(".js") ? [f] : [];
  });

it("store pages do not render their own shell", () => {
  const bad = files(GROUP)
    .filter((f) => !f.endsWith("layout.js"))
    .filter((f) => /<Navbar|<Footer|<main\b|@\/components\/(Navbar|Footer)"/.test(fs.readFileSync(f, "utf8")));
  expect(bad.map((f) => path.relative(GROUP, f))).toEqual([]);
});

it("the store shell has a skip link and a focusable main", () => {
  const s = fs.readFileSync(path.resolve(__dirname, "../../../src/components/shell/StoreShell.js"), "utf8");
  expect(s).toContain('href="#content"');
  expect(s).toMatch(/<main id="content" tabIndex=\{-1\}/);
});
