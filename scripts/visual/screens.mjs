#!/usr/bin/env node
// Screenshots key pages in AR/EN × light/dark × phone/desktop for visual review.
// BASE_URL=http://127.0.0.1:3000 OUT=screens node scripts/visual/screens.mjs
import fs from "node:fs";
import { chromium } from "playwright";

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const out = process.env.OUT || "screens";
fs.mkdirSync(out, { recursive: true });

const pages = { home: "/", products: "/products", cart: "/cart", login: "/login", styleguide: "/styleguide" };
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
      for (const [name, path] of Object.entries(pages)) {
        await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
        await page.screenshot({ path: `${out}/${name}-${lang}-${theme}-${device}.png`, fullPage: device === "desktop" });
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log("screenshots in", out);
