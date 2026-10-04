import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
// @ts-expect-error plain ESM script
import { findDictionaryLeaks, pickSamples } from "../../../scripts/check-client-bundle.mjs";

it("finds dictionary strings in client chunks", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chunks-"));
  fs.writeFileSync(path.join(dir, "a.js"), 'var x="Your trusted supplier of household and"');
  fs.writeFileSync(path.join(dir, "b.js"), "var y=1");
  expect(findDictionaryLeaks(dir, ["Your trusted supplier of household and"]).map((f: string) => path.basename(f))).toEqual(["a.js"]);
});

it("picks long, distinctive samples from both dictionaries", () => {
  const s = pickSamples();
  expect(s.length).toBe(20);
  expect(s.every((x: string) => x.length >= 24)).toBe(true);
});
