import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every export of a "use server" file is a public endpoint, whether or not a screen calls it.
const SRC = path.resolve(__dirname, "../../../src");

// Meant for anyone (store visitors, sign-up, password reset), each rate-limited or read-only.
const PUBLIC = new Set([
  "actions/cart.js:validateCartStock",
  "actions/contact.js:submitContactForm",
  "actions/coupon.js:previewCoupon",
  "actions/newsletter.js:subscribeToNewsletter",
  "actions/register.js:registerUser",
  "actions/stock-alert.js:requestProductStockAlertAction",
  "actions/user-orders.js:trackGuestOrderAction",
  "actions/reset-password.js:requestPasswordReset",
  "actions/reset-password.js:validateResetToken",
  "actions/reset-password.js:resetPassword",
  "actions/reviews.js:getProductReviewsAction",
  "actions/catalog.js:getCatalogPriceBounds",
  "actions/catalog.js:getCatalogProductsByIds",
  "actions/catalog.js:getCatalogProducts",
  "actions/catalog.js:getProductById",
  "actions/catalog.js:getCatalogBrands",
  "actions/catalog.js:getCatalogCategories",
  "actions/catalog.js:getFeaturedProducts",
]);

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return files(full);
    return /\.[jt]sx?$/.test(e.name) ? [full] : [];
  });
}

const serverFiles = files(SRC).filter((f) => /^\s*["']use server["']/.test(fs.readFileSync(f, "utf8")));

/** Local functions (any depth of helper) that end up calling auth(). */
function authHelpers(src: string) {
  const fns = new Map<string, string>();
  for (const m of src.matchAll(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
    const end = src.indexOf("\n}", m.index);
    fns.set(m[1], src.slice(m.index, end));
  }
  const found = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, body] of fns) {
      if (found.has(name)) continue;
      if (/\bauth\(\)/.test(body) || [...found].some((h) => new RegExp(`\\b${h}\\(`).test(body))) {
        found.add(name);
        grew = true;
      }
    }
  }
  return found;
}

describe("server actions", () => {
  it("live only in src/app/actions (helpers in src/lib must not be callable from the browser)", () => {
    const outside = serverFiles.map((f) => path.relative(SRC, f)).filter((f) => !f.startsWith("app/actions/"));
    expect(outside).toEqual([]);
  });

  for (const file of serverFiles) {
    const rel = path.relative(path.join(SRC, "app"), file);
    const src = fs.readFileSync(file, "utf8");
    const helpers = authHelpers(src);
    const exportsList = [...src.matchAll(/export\s+async\s+function\s+(\w+)/g)];
    exportsList.forEach((m, i) => {
      const key = `${rel}:${m[1]}`;
      if (PUBLIC.has(key)) return;
      it(`${key} checks who is calling`, () => {
        const body = src.slice(m.index, exportsList[i + 1]?.index ?? src.length);
        const ok = /\bauth\(\)/.test(body) || [...helpers].some((h) => new RegExp(`\\b${h}\\(`).test(body));
        expect(ok).toBe(true);
      });
    });
  }
});
