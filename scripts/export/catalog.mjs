// Read-only catalog export for P1.1–P1.3 (categories, product content, media).
// Runs inside a READ ONLY transaction, so the database rejects any write.
// Leaves out costs, suppliers, stock counts and customer data.
//
//   DATABASE_URL="<production url>" node scripts/export/catalog.mjs
//
// Writes export/catalog-<date>.json (git-ignored). Share that file.

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (or DIRECT_URL) first.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

const CATEGORIES = `
  SELECT c.id, c.name, c."nameAr", c.description, c.image, c."parentId",
         (SELECT count(*)::int FROM "Product" p WHERE p."categoryId" = c.id) AS "productCount",
         (SELECT count(*)::int FROM "Product" p WHERE p."categoryId" = c.id AND p."isActive") AS "activeCount"
  FROM "Category" c
  ORDER BY c.name`;

const PRODUCTS = `
  SELECT p.id, p.sku, p.name, p."nameEn", p."nameAr",
         p.description, p."descriptionEn", p."descriptionAr",
         p.unit, p."sellingPrice"::text AS "sellingPrice", p."countryOfOrigin",
         p.specs, p.highlights, p.images, p."isActive", (p.stock > 0) AS "inStock",
         p."categoryId", c.name AS "categoryName"
  FROM "Product" p
  JOIN "Category" c ON c.id = p."categoryId"
  ORDER BY c.name, p.name`;

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const categories = (await client.query(CATEGORIES)).rows;
    const products = (await client.query(PRODUCTS)).rows;
    await client.query("ROLLBACK");

    const date = new Date().toISOString().slice(0, 10);
    const outDir = path.resolve("export");
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `catalog-${date}.json`);
    fs.writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), categories, products }, null, 2));
    console.log(`${categories.length} categories, ${products.length} products → ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});
