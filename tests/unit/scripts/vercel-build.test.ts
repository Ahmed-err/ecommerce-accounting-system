import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = path.resolve(__dirname, "../../../scripts/vercel-build.sh");

// Fake `npx` / `npm` on PATH: npx logs which URL migrate would use (DIRECT_URL wins,
// as in prisma.config.ts) and fails for URLs listed in FAIL_URLS.
function runBuild(env: Record<string, string>) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "vbuild-"));
  const log = path.join(bin, "calls.log");
  fs.writeFileSync(
    path.join(bin, "npx"),
    `#!/bin/sh
url="\${DIRECT_URL:-$DATABASE_URL}"
echo "migrate $url\${PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK:+ nolock}" >> "${log}"
case " $FAIL_URLS " in *" $url "*) exit 1;; esac
exit 0
`,
    { mode: 0o755 }
  );
  fs.writeFileSync(path.join(bin, "npm"), `#!/bin/sh\necho "build" >> "${log}"\n`, { mode: 0o755 });

  let status = 0;
  try {
    execFileSync("sh", [SCRIPT], {
      env: { PATH: `${bin}:${process.env.PATH}`, VERCEL_ENV: "production", MIGRATE_RETRY_DELAY: "0", ...env },
      stdio: "pipe",
    });
  } catch (e: any) {
    status = e.status;
  }
  const calls = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n") : [];
  return { status, calls };
}

describe("scripts/vercel-build.sh", () => {
  it("migrates over DIRECT_URL, then builds", () => {
    const out = runBuild({ DATABASE_URL: "pooled", DIRECT_URL: "direct" });
    expect(out).toEqual({ status: 0, calls: ["migrate direct", "build"] });
  });

  it("falls back to DATABASE_URL when DIRECT_URL is unreachable", () => {
    const out = runBuild({ DATABASE_URL: "pooled", DIRECT_URL: "direct", FAIL_URLS: "direct" });
    expect(out).toEqual({
      status: 0,
      calls: ["migrate direct", "migrate direct", "migrate direct", "migrate pooled nolock", "build"],
    });
  });

  it("does not build when every connection fails", () => {
    const out = runBuild({ DATABASE_URL: "pooled", DIRECT_URL: "direct", FAIL_URLS: "direct pooled" });
    expect(out.status).toBe(1);
    expect(out.calls).not.toContain("build");
  });

  it("uses DATABASE_URL when no DIRECT_URL is set", () => {
    const out = runBuild({ DATABASE_URL: "pooled" });
    expect(out).toEqual({ status: 0, calls: ["migrate pooled nolock", "build"] });
  });

  it("skips migrations outside production", () => {
    const out = runBuild({ DATABASE_URL: "pooled", VERCEL_ENV: "preview" });
    expect(out).toEqual({ status: 0, calls: ["build"] });
  });
});
