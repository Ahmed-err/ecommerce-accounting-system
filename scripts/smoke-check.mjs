#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const timeoutMs = Math.max(2000, Number(process.env.SMOKE_TIMEOUT_MS || 20000));
const endpoints = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/sitemap.xml",
  "/robots.txt",
  "/api/health",
];

async function check(path) {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { path, status: res.status, ok: res.status < 500 };
  } catch (error) {
    return { path, status: 0, ok: false, error: error.message };
  }
}

async function main() {
  const results = [];
  for (const path of endpoints) results.push(await check(path));
  for (const r of results) {
    const suffix = r.error ? ` (${r.error})` : "";
    console.log(`${r.status} ${r.path}${suffix}`);
  }
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((error) => {
  console.error("Smoke check failed:", error.message);
  process.exit(1);
});
