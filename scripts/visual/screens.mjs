#!/usr/bin/env node
// Screenshots key pages in AR/EN × light/dark × phone/desktop for visual review.
// BASE_URL=http://127.0.0.1:3000 OUT=screens node scripts/visual/screens.mjs
import fs from "node:fs";
import { chromium } from "playwright";

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const out = process.env.OUT || "screens";
fs.mkdirSync(out, { recursive: true });

const pages = { home: "/", products: "/products", cart: "/cart", login: "/login", styleguide: "/styleguide" };
// Staff pages, captured after signing in as the seeded admin (seed data only, never production).
const staffPages = { admin: "/admin", "admin-orders": "/admin/orders", "admin-reviews": "/admin/reviews", pos: "/pos" };
const ADMIN = { email: "admin@powerstore.com", password: "admin123" };

async function signIn(page) {
  await page.goto(`${base}/login`, { waitUntil: "load" });
  await page.fill('form input[type="text"]', ADMIN.email);
  await page.fill('form input[type="password"]', ADMIN.password);
  await Promise.all([page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 }), page.click('form button[type="submit"]')]);
}

// Staff pages keep a live notifications stream open, so "networkidle" never comes:
// wait for load plus a short settle instead. A page that fails is logged and the run
// exits non-zero at the end, without losing the other screenshots.
const failures = [];
async function shoot(page, name, path, file, fullPage, live = false) {
  try {
    await page.goto(`${base}${path}`, { waitUntil: live ? "load" : "networkidle", timeout: 45000 });
    if (live) await page.waitForTimeout(2500);
    await page.screenshot({ path: file, fullPage });
  } catch (error) {
    failures.push(`${name}: ${error.message.split("\n")[0]}`);
  }
}

const devices = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

const html = await (await fetch(`${base}/products`)).text();
const product = html.match(/href="(\/products\/(?!compare)[^"?#]+)"/)?.[1];
if (product) pages.product = product;

const browser = await chromium.launch();
for (const lang of ["ar", "en"]) {
  for (const theme of ["light", "dark"]) {
    for (const [device, viewport] of Object.entries(devices)) {
      const ctx = await browser.newContext({ viewport });
      await ctx.addCookies([{ name: "lang", value: lang, url: base }]);
      await ctx.addInitScript((t) => localStorage.setItem("himmat-theme", t), theme);
      const page = await ctx.newPage();
      const tag = `${lang}-${theme}-${device}`;
      for (const [name, path] of Object.entries(pages)) {
        await shoot(page, `${name}-${tag}`, path, `${out}/${name}-${tag}.png`, device === "desktop");
      }
      await signIn(page);
      for (const [name, path] of Object.entries(staffPages)) {
        await shoot(page, `${name}-${tag}`, path, `${out}/${name}-${tag}.png`, device === "desktop", true);
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log("screenshots in", out);
if (failures.length) {
  console.error(`${failures.length} page(s) failed:\n${failures.join("\n")}`);
  process.exit(1);
}
