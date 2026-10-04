// P1.1: build the two-level category tree and move products into subcategories.
//
// Take a database backup first. Then:
//   DATABASE_URL="<url>" node scripts/apply/p1-1-categories.mjs            # preview only, writes nothing
//   DATABASE_URL="<url>" node scripts/apply/p1-1-categories.mjs --apply    # make the changes
//   DATABASE_URL="<url>" node scripts/apply/p1-1-categories.mjs --cleanup  # later: delete old categories left empty
//
// Inputs: scripts/apply/p1-1-tree.json and docs/rebuild/data/p1-1-category-moves.csv (reviewed).
// Safe to re-run: a second --apply finds nothing to do. Aborts without writing if any SKU or
// subcategory is unknown. Every write happens in one transaction and is logged to export/.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { emptyOldCategories, planCategoryChanges } from "./category-plan.mjs";

const mode = process.argv.includes("--cleanup") ? "cleanup" : process.argv.includes("--apply") ? "apply" : "preview";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

function readCsv(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const tree = JSON.parse(fs.readFileSync("scripts/apply/p1-1-tree.json", "utf8"));
const movesArg = process.argv.indexOf("--moves");
const moves = readCsv(movesArg > 0 ? process.argv[movesArg + 1] : "docs/rebuild/data/p1-1-category-moves.csv");
const client = new pg.Client({ connectionString: url });
console.log(`Database: ${new URL(url).hostname}${new URL(url).pathname}`);

async function load() {
  const categories = (await client.query(`SELECT id, name, "nameAr", "parentId" FROM "Category"`)).rows;
  const products = (await client.query(`SELECT id, sku, "categoryId" FROM "Product"`)).rows;
  return { categories, products };
}

function writeLog(entry) {
  fs.mkdirSync("export", { recursive: true });
  const file = path.join("export", `p1-1-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(entry, null, 2));
  return file;
}

async function runApply() {
  const { categories, products } = await load();
  const ops = planCategoryChanges({ tree, moves, categories, products });
  console.log(`Plan: create ${ops.createCategories.length} categories, update ${ops.updateCategories.length}, move ${ops.moveProducts.length} products.`);
  if (ops.errors.length) {
    console.error("Stopped, nothing written:\n  " + ops.errors.join("\n  "));
    process.exitCode = 1;
    return;
  }
  for (const c of ops.createCategories) console.log(`  + ${c.parentName ? `${c.parentName} › ` : ""}${c.name} (${c.nameAr})`);
  for (const c of ops.updateCategories) console.log(`  ~ ${c.name}: parent → ${c.parentName ?? "none"}, Arabic → ${c.nameAr}`);
  if (!ops.createCategories.length && !ops.updateCategories.length && !ops.moveProducts.length) {
    console.log("Nothing to do: the tree is already in place.");
    return;
  }
  if (mode === "preview") {
    console.log("Preview only. Re-run with --apply after a backup.");
    return;
  }

  await client.query("BEGIN");
  try {
    const idByName = new Map(categories.map((c) => [c.name, c.id]));
    const created = [];
    for (const c of ops.createCategories) {
      const id = randomUUID();
      await client.query(
        `INSERT INTO "Category" (id, name, "nameAr", "parentId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())`,
        [id, c.name, c.nameAr, c.parentName ? idByName.get(c.parentName) : null]
      );
      idByName.set(c.name, id);
      created.push({ id, name: c.name });
    }
    for (const c of ops.updateCategories) {
      await client.query(`UPDATE "Category" SET "nameAr" = $2, "parentId" = $3, "updatedAt" = now() WHERE id = $1`, [
        c.id,
        c.nameAr,
        c.parentName ? idByName.get(c.parentName) : null,
      ]);
    }
    for (const m of ops.moveProducts) {
      await client.query(`UPDATE "Product" SET "categoryId" = $2, "updatedAt" = now() WHERE id = $1`, [m.id, idByName.get(m.to)]);
    }
    await client.query("COMMIT");
    const log = writeLog({ created, updated: ops.updateCategories, moved: ops.moveProducts });
    console.log(`Done. Log (keeps the old values for rollback): ${log}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function runCleanup() {
  const { categories } = await load();
  const counts = new Map(
    (await client.query(`SELECT "categoryId" AS id, count(*)::int AS n FROM "Product" GROUP BY "categoryId"`)).rows.map((r) => [r.id, r.n])
  );
  const empty = emptyOldCategories({ tree, categories, productCounts: counts });
  const stillUsed = categories.filter((c) => !empty.includes(c) && counts.get(c.id) > 0 && !tree.some((t) => t.name === c.name || t.children.some((k) => k.name === c.name)));
  if (stillUsed.length) console.log("Old categories that still have products (kept): " + stillUsed.map((c) => c.name).join(", "));
  if (!empty.length) {
    console.log("Nothing to delete.");
    return;
  }
  console.log("Deleting empty old categories: " + empty.map((c) => c.name).join(", "));
  await client.query("BEGIN");
  try {
    await client.query(`DELETE FROM "Category" WHERE id = ANY($1) AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."categoryId" = "Category".id)`, [empty.map((c) => c.id)]);
    await client.query("COMMIT");
    console.log(`Done. Log: ${writeLog({ deleted: empty })}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

try {
  await client.connect();
  await (mode === "cleanup" ? runCleanup() : runApply());
} catch (err) {
  console.error("Failed, nothing written:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
