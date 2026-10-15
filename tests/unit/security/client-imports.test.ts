import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A browser ("use client") file must never reach the database driver. Imports of "use server"
// files are fine: the browser gets a stub that calls the server.
const SRC = path.resolve(__dirname, "../../../src");
const EXT = ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.ts"];

function resolve(from: string, spec: string) {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const e of EXT) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return base + e;
  return null;
}

const read = (f: string) => fs.readFileSync(f, "utf8");
const isServerAction = (src: string) => /^\s*["']use server["']/.test(src);

/** Path of imports from `file` to src/lib/prisma.js, or null. */
function pathToPrisma(file: string, seen = new Set<string>()): string[] | null {
  if (seen.has(file)) return null;
  seen.add(file);
  if (file.endsWith(path.join("lib", "prisma.js"))) return [file];
  const src = read(file);
  if (isServerAction(src)) return null;
  for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
    const next = resolve(file, m[1] || m[2]);
    if (!next) continue;
    const rest = pathToPrisma(next, seen);
    if (rest) return [file, ...rest];
  }
  return null;
}

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return files(full);
    return /\.[jt]sx?$/.test(e.name) ? [full] : [];
  });
}

describe("browser code", () => {
  const clientFiles = files(SRC).filter((f) => /^\s*["']use client["']/.test(read(f)));
  it("finds client files", () => expect(clientFiles.length).toBeGreaterThan(20));
  for (const f of clientFiles) {
    it(`${path.relative(SRC, f)} doesn't import the database`, () => {
      const chain = pathToPrisma(f);
      expect(chain && chain.map((c) => path.relative(SRC, c)).join(" → ")).toBeNull();
    });
  }
});
