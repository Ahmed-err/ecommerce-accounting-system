import { describe, expect, it } from "vitest";
import { blockingAdvisories } from "../../../scripts/audit-deps.mjs";

const BRACES = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";

// Shape of `npm audit --json`: direct advisories are objects in `via`,
// transitive entries only name the package they come through.
const report = {
  vulnerabilities: {
    braces: { severity: "high", via: [{ source: 1, title: "braces DoS", url: BRACES, severity: "high" }] },
    micromatch: { severity: "high", via: ["braces"] },
    esbuild: { severity: "low", via: [{ source: 2, title: "esbuild file read", url: "https://github.com/advisories/GHSA-g7r4-m6w7-qqqr", severity: "low" }] },
  },
};

const allow = [{ id: "GHSA-vfj7-8cjw-p6xm", package: "braces", reason: "no fixed version", expires: "2027-01-03" }];
const today = new Date("2026-10-03");

describe("blockingAdvisories", () => {
  it("blocks high advisories that are not allowlisted, once per advisory", () => {
    expect(blockingAdvisories(report, [], today)).toEqual([{ id: "GHSA-vfj7-8cjw-p6xm", package: "braces", severity: "high", title: "braces DoS" }]);
  });

  it("lets an allowlisted advisory through and ignores low severity", () => {
    expect(blockingAdvisories(report, allow, today)).toEqual([]);
  });

  it("blocks again once the allowlist entry has expired", () => {
    expect(blockingAdvisories(report, allow, new Date("2027-01-04"))).toHaveLength(1);
  });

  it("blocks critical advisories", () => {
    const critical = { vulnerabilities: { x: { severity: "critical", via: [{ title: "rce", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "critical" }] } } };
    expect(blockingAdvisories(critical, allow, today).map((a: { id: string }) => a.id)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
  });

  it("throws when the report is not an audit result (e.g. the audit endpoint failed)", () => {
    expect(() => blockingAdvisories({ message: "request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed" }, allow, today)).toThrow(
      /audit did not return results/
    );
  });
});
