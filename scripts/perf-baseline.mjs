#!/usr/bin/env node

const baseUrl = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const runs = Math.max(1, Number(process.env.PERF_RUNS || 3));
const timeoutMs = Math.max(2000, Number(process.env.PERF_TIMEOUT_MS || 15000));
const endpoints = ["/", "/products", "/about", "/contact", "/api/health"];

async function one(path) {
  const url = `${baseUrl}${path}`;
  const started = performance.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const ttfb = performance.now() - started;
  const bodyStart = performance.now();
  const text = await res.text();
  const total = performance.now() - started;
  const transfer = performance.now() - bodyStart;
  return {
    path,
    status: res.status,
    ok: res.ok,
    ttfbMs: Number(ttfb.toFixed(1)),
    transferMs: Number(transfer.toFixed(1)),
    totalMs: Number(total.toFixed(1)),
    bytes: new TextEncoder().encode(text).length,
  };
}

function summarize(rows) {
  const byPath = new Map();
  for (const row of rows) {
    if (!byPath.has(row.path)) byPath.set(row.path, []);
    byPath.get(row.path).push(row);
  }
  const summary = [];
  for (const [path, list] of byPath.entries()) {
    const avg = (k) => list.reduce((s, x) => s + x[k], 0) / list.length;
    const worst = (k) => Math.max(...list.map((x) => x[k]));
    summary.push({
      path,
      runs: list.length,
      successRate: `${Math.round((list.filter((x) => x.ok).length / list.length) * 100)}%`,
      avgTtfbMs: Number(avg("ttfbMs").toFixed(1)),
      avgTotalMs: Number(avg("totalMs").toFixed(1)),
      worstTotalMs: Number(worst("totalMs").toFixed(1)),
      avgBytes: Math.round(avg("bytes")),
    });
  }
  return summary;
}

async function main() {
  const all = [];
  for (let i = 0; i < runs; i += 1) {
    for (const path of endpoints) {
      try {
        const row = await one(path);
        all.push(row);
      } catch (error) {
        all.push({
          path,
          status: 0,
          ok: false,
          ttfbMs: timeoutMs,
          transferMs: 0,
          totalMs: timeoutMs,
          bytes: 0,
          error: error.message,
        });
      }
    }
  }

  const report = {
    baseUrl,
    runs,
    generatedAt: new Date().toISOString(),
    summary: summarize(all),
    raw: all,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("perf baseline failed:", error.message);
  process.exit(1);
});
