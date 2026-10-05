// P1.2: new product names, brand, specs and English descriptions (docs/rebuild/data/p1-2-content.json).
//
// Take a database backup first. Then:
//   DATABASE_URL="<url>" node scripts/apply/p1-2-content.mjs           # preview only, writes nothing
//   DATABASE_URL="<url>" node scripts/apply/p1-2-content.mjs --apply   # make the changes
//
// A product whose name was edited since the snapshot is skipped and reported, never overwritten.
// Products listed under "remove" are hidden (isActive = false), not deleted.
// Safe to re-run; one transaction; old values logged to export/ for rollback.

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
const contentArg = process.argv.indexOf("--content");
const content = JSON.parse(fs.readFileSync(contentArg > 0 ? process.argv[contentArg + 1] : "docs/rebuild/data/p1-2-content.json", "utf8"));
const client = new pg.Client({ connectionString: url });
console.log(`Database: ${new URL(url).hostname}${new URL(url).pathname}`);

const FIELDS = ["name", "nameAr", "nameEn", "brand", "specs", "descriptionEn", "descriptionAr", "description"];
// jsonb stores object keys in its own order, so compare with sorted keys.
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v ?? null;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

try {
  await client.connect();
  const rows = (await client.query(`SELECT id, sku, name, "nameAr", "nameEn", brand, specs, "descriptionEn", "descriptionAr", description, "isActive" FROM "Product"`)).rows;
  const bySku = new Map(rows.map((r) => [r.sku, r]));
  const updates = [], skipped = [], hide = [];

  for (const e of content.products) {
    const cur = bySku.get(e.sku);
    if (!cur) { skipped.push(`${e.sku}: not found`); continue; }
    const changed = FIELDS.filter((f) => f in e && !same(cur[f], e[f]));
    if (!changed.length) continue;
    const nameTouched = cur.nameAr !== e.nameAr && cur.nameAr !== e.expectOld.nameAr;
    if (nameTouched) { skipped.push(`${e.sku}: name edited since the snapshot ("${cur.nameAr}")`); continue; }
    updates.push({ id: cur.id, sku: e.sku, set: Object.fromEntries(changed.map((f) => [f, e[f]])), before: Object.fromEntries(changed.map((f) => [f, cur[f]])) });
  }
  for (const sku of content.remove) {
    const cur = bySku.get(sku);
    if (cur?.isActive) hide.push({ id: cur.id, sku, name: cur.nameAr });
  }

  console.log(`Plan: update ${updates.length} products, hide ${hide.length}, skip ${skipped.length}.`);
  for (const s of skipped) console.log(`  ! ${s}`);
  for (const h of hide) console.log(`  - hide ${h.sku} ${h.name}`);
  if (!updates.length && !hide.length) console.log("Nothing to do.");
  else if (!apply) console.log("Preview only. Re-run with --apply after a backup.");
  else {
    await client.query("BEGIN");
    try {
      for (const u of updates) {
        const cols = Object.keys(u.set);
        const sets = cols.map((c, i) => `"${c}" = $${i + 2}${c === "specs" ? "::jsonb" : ""}`).join(", ");
        const vals = cols.map((c) => (c === "specs" ? JSON.stringify(u.set[c]) : u.set[c]));
        await client.query(`UPDATE "Product" SET ${sets}, "updatedAt" = now() WHERE id = $1`, [u.id, ...vals]);
      }
      for (const h of hide) await client.query(`UPDATE "Product" SET "isActive" = false, "updatedAt" = now() WHERE id = $1`, [h.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    fs.mkdirSync("export", { recursive: true });
    const log = path.join("export", `p1-2-apply-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(log, JSON.stringify({ updates, hide, skipped }, null, 2));
    console.log(`Done. Log (keeps the old values for rollback): ${log}`);
  }
} catch (err) {
  console.error("Failed, nothing written:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
