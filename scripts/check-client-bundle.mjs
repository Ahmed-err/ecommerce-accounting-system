#!/usr/bin/env node
// Fails if UI dictionary text is bundled into client JS (P0.4: only the current language travels, via the layout).
// Run after `next build`: node scripts/check-client-bundle.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ar from "../src/lib/i18n/ar.js";
import en from "../src/lib/i18n/en.js";

export function pickSamples(count = 10) {
  const pick = (dict) =>
    Object.values(dict)
      .filter((v) => typeof v === "string" && v.length >= 24 && !/[{}<>]/.test(v))
      .sort((a, b) => b.length - a.length)
      .filter((_, i) => i % 7 === 0)
      .slice(0, count);
  return [...pick(ar), ...pick(en)];
}

function walk(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const f = path.join(dir, e.name);
        return e.isDirectory() ? walk(f) : f.endsWith(".js") ? [f] : [];
      })
    : [];
}

export function findDictionaryLeaks(dir, samples) {
  return walk(dir).filter((f) => {
    const s = fs.readFileSync(f, "utf8");
    return samples.some((x) => s.includes(x) || s.includes(JSON.stringify(x).slice(1, -1)));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const leaks = findDictionaryLeaks(".next/static/chunks", pickSamples());
  if (leaks.length) {
    console.error(`Dictionary text found in client chunks:\n${leaks.join("\n")}`);
    process.exit(1);
  }
  console.log("client bundle: no dictionary text");
}
