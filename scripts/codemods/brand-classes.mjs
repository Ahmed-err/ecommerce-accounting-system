#!/usr/bin/env node
// P0.3 codemod: amber text on light surfaces -> text-accent-text; remove amber glows.
// Usage: node scripts/codemods/brand-classes.mjs [--write] [--dark-pairs] src/components src/app
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_AMBER = /^((?:(?!dark:)[\w/-]+:)*)text-amber-(400|500|600)$/;
const TEXT_AMBER_OPACITY = /^(?:(?!dark:)[\w/-]+:)*text-amber-(400|500|600)\/\d+$/;
const GLOW = /^(?:[\w/-]+:)*shadow-amber-\d{2,3}(?:\/\d+)?$/;
const DARK_PAIR = /(?:^|\s)(?:[\w/-]+:)*dark:text-\S+(?=\s|$)/;
const DARK_BG =
  /(?:^|\s)(?:[\w/-]+:)*(?:bg-black(?:\/\d+)?|bg-(?:slate|gray|zinc|neutral|stone)-(?:800|900|950)|bg-amber-(?:400|500|600)(?=\s|$)|bg-foreground|bg-brand|bg-primary)(?=\s|$)/;

// convertDarkPairs: also convert the light half of `text-amber-N dark:text-…` pairs (the
// dark: class still wins in dark mode); amber text on dark backgrounds is always left alone.
export function transformClassString(str, { convertDarkPairs = false } = {}) {
  const changes = [];
  const skipped = [];
  const darkContext = DARK_BG.test(str) || (!convertDarkPairs && DARK_PAIR.test(str));
  const out = [];
  for (const part of str.split(/(\s+)/)) {
    if (!part || /^\s+$/.test(part) || part.includes("${")) {
      out.push(part);
      continue;
    }
    if (GLOW.test(part)) {
      changes.push(`${part} → (removed)`);
      continue;
    }
    if (TEXT_AMBER_OPACITY.test(part)) {
      skipped.push(part);
      out.push(part);
      continue;
    }
    const m = part.match(TEXT_AMBER);
    if (m) {
      if (darkContext) {
        skipped.push(part);
        out.push(part);
        continue;
      }
      const next = `${m[1]}text-accent-text`;
      changes.push(`${part} → ${next}`);
      out.push(next);
      continue;
    }
    out.push(part);
  }
  // Collapse the double spaces a removed glow leaves between two classes; leave
  // newlines/indentation and untouched strings exactly as they were.
  const removed = changes.some((c) => c.endsWith("(removed)"));
  const joined = out.join("");
  const value = removed ? joined.replace(/(\S) {2,}(?=\S)/g, "$1 ").replace(/^ +| +$/g, "") : joined;
  return { value: changes.length ? value : str, changes, skipped };
}

const STRING = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
const TARGET = /(?:text|shadow)-amber-/;

export function transformSource(src, options = {}) {
  const changes = [];
  const skipped = [];
  const code = src.replace(STRING, (whole, dq, sq, bt) => {
    const body = dq ?? sq ?? bt;
    if (!TARGET.test(body)) return whole;
    const r = transformClassString(body, options);
    changes.push(...r.changes);
    skipped.push(...r.skipped);
    const q = whole[0];
    return q + r.value + q;
  });
  // A regex cannot pair nested template literals, so some class strings are never seen
  // above. Report every amber token still present that was not deliberately skipped.
  const remaining = [...code.matchAll(LEFTOVER)].map((m) => m[1]);
  const pending = [...skipped];
  const leftovers = remaining.filter((tok) => {
    const i = pending.indexOf(tok);
    if (i === -1) return true;
    pending.splice(i, 1);
    return false;
  });
  return { code, changes, skipped, leftovers };
}

const LEFTOVER =
  /(?<=^|[\s"'`{(])((?:(?!dark:)[\w/-]+:)*(?:text-amber-(?:400|500|600)(?:\/\d+)?|shadow-amber-\d{2,3}(?:\/\d+)?))(?=$|[\s"'`})])/gm;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes("--write");
  const options = { convertDarkPairs: process.argv.includes("--dark-pairs") };
  const dirs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const report = ["# P0.3 brand-classes codemod report", ""];
  let total = 0;
  const skippedAll = [];
  for (const file of dirs.flatMap(walk)) {
    const src = fs.readFileSync(file, "utf8");
    const { code, changes, skipped, leftovers } = transformSource(src, options);
    if (skipped.length) skippedAll.push(`- \`${file}\`: ${skipped.join(", ")}`);
    if (leftovers.length) skippedAll.push(`- \`${file}\` (not reached by the tokenizer): ${leftovers.join(", ")}`);
    if (!changes.length) continue;
    total += changes.length;
    report.push(`## ${file}`, ...changes.map((c) => `- ${c}`), "");
    if (write) fs.writeFileSync(file, code);
  }
  report.push(`**${total} changes.**`, "", "## Left for manual review", ...(skippedAll.length ? skippedAll : ["- none"]));
  console.log(report.join("\n"));
}
