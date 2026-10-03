import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The proxy only matches /admin pages, not /api/admin, so every admin API
// handler has to authenticate on its own.
const ADMIN_API = path.resolve(__dirname, "../../../src/app/api/admin");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return routeFiles(full);
    return /^route\.[jt]s$/.test(e.name) ? [full] : [];
  });
}

function handlers(src: string) {
  const re = new RegExp(`export\\s+async\\s+function\\s+(${METHODS.join("|")})\\b`, "g");
  const found = [...src.matchAll(re)];
  return found.map((m, i) => ({
    method: m[1],
    body: src.slice(m.index, found[i + 1]?.index ?? src.length),
  }));
}

describe("admin API routes", () => {
  const files = routeFiles(ADMIN_API);

  it("exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = path.relative(ADMIN_API, file);
    const src = fs.readFileSync(file, "utf8");
    for (const { method, body } of handlers(src)) {
      it(`${method} ${rel} calls auth()`, () => {
        expect(body).toMatch(/\bawait\s+auth\(\)/);
      });
    }
  }
});
