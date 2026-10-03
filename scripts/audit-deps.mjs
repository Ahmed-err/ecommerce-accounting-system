// `npm audit` with an allowlist: fails on any high or critical advisory except
// ones listed in audit-allowlist.json (each with a reason and an expiry date).
// npm audit has no way to accept an advisory that has no fixed version yet.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BLOCKING = new Set(["high", "critical"]);

export function blockingAdvisories(report, allowlist, today) {
  if (!report || typeof report.vulnerabilities !== "object") {
    throw new Error(`npm audit did not return results: ${report?.message ?? "unknown error"}`);
  }
  const allowed = new Set(allowlist.filter((a) => new Date(a.expires) >= today).map((a) => a.id));
  const found = new Map();
  for (const [pkg, vuln] of Object.entries(report.vulnerabilities)) {
    for (const via of vuln.via) {
      if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
      const id = String(via.url).split("/").pop();
      if (!allowed.has(id) && !found.has(id)) found.set(id, { id, package: pkg, severity: via.severity, title: via.title });
    }
  }
  return [...found.values()];
}

function main() {
  const allowlist = JSON.parse(readFileSync(new URL("../audit-allowlist.json", import.meta.url), "utf8"));
  // npm audit exits non-zero whenever anything is found, so read its JSON instead of its status.
  const run = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    console.error(`audit-deps: could not parse npm audit output\n${run.stderr}`);
    process.exit(2);
  }

  let blocking;
  try {
    blocking = blockingAdvisories(report, allowlist, new Date());
  } catch (e) {
    console.error(`audit-deps: ${e.message}`);
    process.exit(2);
  }

  for (const a of allowlist) console.log(`audit-deps: allowed ${a.id} (${a.package}) until ${a.expires} — ${a.reason}`);
  if (blocking.length) {
    for (const b of blocking) console.error(`audit-deps: ${b.severity} ${b.id} in ${b.package} — ${b.title}`);
    process.exit(1);
  }
  console.log("audit-deps: no unallowed high or critical advisories");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
