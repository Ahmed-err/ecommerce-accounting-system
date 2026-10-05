// P1.3: save the reviewed, AI-cleaned product photos as new Cloudinary images and
// point the products at them (docs/rebuild/data/p1-3-photo-fixes.json).
//
//   CLOUDINARY_CLOUD_NAME=… CLOUDINARY_API_KEY=… CLOUDINARY_API_SECRET=… \
//   DATABASE_URL="<url>" node scripts/apply/p1-3-photos.mjs [--apply]
//
// Preview by default. Each photo is uploaded once under a fixed name, so re-runs reuse it.
// The original photo stays in Cloudinary (rollback = put the old URL back; log in export/).
// A product whose photo was changed since the review is skipped.

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { v2 as cloudinary } from "cloudinary";

const apply = process.argv.includes("--apply");
const { DATABASE_URL: url, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!url || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Set DATABASE_URL and CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET first.");
  process.exit(1);
}
cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
const { fixes } = JSON.parse(fs.readFileSync("docs/rebuild/data/p1-3-photo-fixes.json", "utf8"));
const client = new pg.Client({ connectionString: url });
console.log(`Database: ${new URL(url).hostname}${new URL(url).pathname} · Cloudinary: ${CLOUDINARY_CLOUD_NAME}`);

try {
  await client.connect();
  const rows = (await client.query(`SELECT id, sku, images FROM "Product"`)).rows;
  const bySku = new Map(rows.map((r) => [r.sku, r]));
  const todo = [], skipped = [];
  for (const f of fixes) {
    const p = bySku.get(f.sku);
    if (!p) skipped.push(`${f.sku}: not found`);
    else if (!p.images.includes(f.oldUrl)) {
      if (!p.images.some((u) => u.includes(f.publicId))) skipped.push(`${f.sku}: photo changed since the review`);
    } else todo.push({ ...f, id: p.id, images: p.images });
  }
  console.log(`Plan: replace ${todo.length} photos, skip ${skipped.length}.`);
  for (const s of skipped) console.log(`  ! ${s}`);
  if (!todo.length) console.log("Nothing to do.");
  else if (!apply) console.log("Preview only. Re-run with --apply after a backup.");
  else {
    for (const t of todo) {
      const up = await cloudinary.uploader.upload(t.processedUrl, { public_id: t.publicId, overwrite: false, resource_type: "image" });
      t.newUrl = up.secure_url;
      console.log(`  ↑ ${t.sku} ${t.name_en}`);
    }
    await client.query("BEGIN");
    try {
      for (const t of todo) {
        const images = t.images.map((u) => (u === t.oldUrl ? t.newUrl : u));
        await client.query(`UPDATE "Product" SET images = $2, "updatedAt" = now() WHERE id = $1`, [t.id, images]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    fs.mkdirSync("export", { recursive: true });
    const log = path.join("export", `p1-3-photos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(log, JSON.stringify(todo.map(({ sku, oldUrl, newUrl }) => ({ sku, oldUrl, newUrl })), null, 2));
    console.log(`Done. Log (old URLs for rollback): ${log}`);
  }
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
