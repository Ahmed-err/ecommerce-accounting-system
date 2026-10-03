#!/usr/bin/env node
// P0.3 codemod: amber text on light surfaces -> text-accent-text; remove amber glows.
// Usage: node scripts/codemods/brand-classes.mjs [--write] src/components src/app
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_AMBER = /^((?:(?!dark:)[\w-]+:)*)text-amber-(400|500|600)$/;
const TEXT_AMBER_OPACITY = /^(?:(?!dark:)[\w-]+:)*text-amber-(400|500|600)\/\d+$/;
const GLOW = /^(?:[\w-]+:)*shadow-amber-\d{2,3}(?:\/\d+)?$/;
const DARK_CONTEXT =
  /(?:^|\s)(?:[\w-]+:)*(?:dark:text-\S+|bg-black(?:\/\d+)?|bg-(?:slate|gray|zinc|neutral|stone)-(?:800|900|950)|bg-amber-(?:400|500|600)(?=\s|$)|bg-foreground|bg-brand|bg-primary)(?=\s|$)/;

export function transformClassString(str) {
  const changes = [];
  const skipped = [];
  const darkContext = DARK_CONTEXT.test(str);
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

export function transformSource(src) {
  const changes = [];
  const skipped = [];
  const code = src.replace(STRING, (whole, dq, sq, bt) => {
    const body = dq ?? sq ?? bt;
    if (!TARGET.test(body)) return whole;
    const r = transformClassString(body);
    changes.push(...r.changes);
    skipped.push(...r.skipped);
    const q = whole[0];
    return q + r.value + q;
  });
  return { code, changes, skipped };
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes("--write");
  const dirs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const report = ["# P0.3 brand-classes codemod report", ""];
  let total = 0;
  const skippedAll = [];
  for (const file of dirs.flatMap(walk)) {
    const src = fs.readFileSync(file, "utf8");
    const { code, changes, skipped } = transformSource(src);
    if (skipped.length) skippedAll.push(`- \`${file}\`: ${skipped.join(", ")}`);
    if (!changes.length) continue;
    total += changes.length;
    report.push(`## ${file}`, ...changes.map((c) => `- ${c}`), "");
    if (write) fs.writeFileSync(file, code);
  }
  report.push(`**${total} changes.**`, "", "## Left for manual review", ...(skippedAll.length ? skippedAll : ["- none"]));
  console.log(report.join("\n"));
}
