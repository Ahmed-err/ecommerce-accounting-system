#!/usr/bin/env node
// Lighthouse lab numbers for key store pages (mobile preset, median of N runs).
// Usage: PERF_BASE_URL=http://127.0.0.1:3000 node scripts/perf-lighthouse.mjs > report.json
// Needs Chrome and network access for `npx lighthouse` (CI runners have both).
// Writes a Markdown table to $GITHUB_STEP_SUMMARY when set.

import { execFile } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const baseUrl = (process.env.PERF_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const runs = Math.max(1, Number(process.env.PERF_RUNS || 3));
const LIGHTHOUSE = "lighthouse@12";

async function firstProductPath() {
  const html = await (await fetch(`${baseUrl}/products`)).text();
  const match = html.match(/href="(\/products\/(?!compare)[^"?#]+)"/);
  return match ? match[1] : null;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

async function lighthouse(url, outDir, i) {
  const out = path.join(outDir, `lh-${i}.json`);
  await run(
    "npx",
    [
      "--yes",
      LIGHTHOUSE,
      url,
      "--quiet",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${out}`,
      "--chrome-flags=--headless=new --no-sandbox",
    ],
    { maxBuffer: 64 * 1024 * 1024, timeout: 180_000 }
  );
  const lhr = JSON.parse(readFileSync(out, "utf8"));
  const audit = (id) => lhr.audits[id]?.numericValue ?? NaN;
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
    fcpMs: audit("first-contentful-paint"),
    lcpMs: audit("largest-contentful-paint"),
    tbtMs: audit("total-blocking-time"),
    cls: audit("cumulative-layout-shift"),
    speedIndexMs: audit("speed-index"),
    transferKb: audit("total-byte-weight") / 1024,
  };
}

async function main() {
  const productPath = await firstProductPath();
  const paths = ["/", "/products", ...(productPath ? [productPath] : []), "/cart", "/login"];
  const outDir = mkdtempSync(path.join(tmpdir(), "lh-"));
  const results = [];

  for (const p of paths) {
    const samples = [];
    for (let i = 0; i < runs; i++) samples.push(await lighthouse(`${baseUrl}${p}`, outDir, `${results.length}-${i}`));
    const pick = (k) => median(samples.map((s) => s[k]));
    results.push({
      path: p === productPath ? "/products/[slug]" : p,
      url: p,
      runs,
      performance: pick("performance"),
      accessibility: pick("accessibility"),
      bestPractices: pick("bestPractices"),
      seo: pick("seo"),
      fcpMs: Math.round(pick("fcpMs")),
      lcpMs: Math.round(pick("lcpMs")),
      tbtMs: Math.round(pick("tbtMs")),
      cls: Number(pick("cls").toFixed(3)),
      speedIndexMs: Math.round(pick("speedIndexMs")),
      transferKb: Math.round(pick("transferKb")),
    });
  }

  const report = { baseUrl, preset: "lighthouse mobile (default)", runs, generatedAt: new Date().toISOString(), results };
  console.log(JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(
      (r) =>
        `| ${r.path} | ${r.performance} | ${r.lcpMs} | ${r.tbtMs} | ${r.cls} | ${r.fcpMs} | ${r.transferKb} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} |`
    );
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        `### Lighthouse (mobile, median of ${runs}) — ${baseUrl}`,
        "",
        "| Page | Perf | LCP ms | TBT ms | CLS | FCP ms | KB | A11y | BP | SEO |",
        "|---|---|---|---|---|---|---|---|---|---|",
        ...rows,
        "",
      ].join("\n")
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
