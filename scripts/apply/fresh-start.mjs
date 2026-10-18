// Fresh start: clear all trading and customer data, keep the catalog and store settings.
//
//   DATABASE_URL="<url>" node scripts/apply/fresh-start.mjs --keep <admin-email>           # preview only
//   DATABASE_URL="<url>" node scripts/apply/fresh-start.mjs --keep <admin-email> --apply   # delete
//
// Kept: products (with their current stock), categories, store settings, shipping zones,
// payment methods, legal pages, about/team content, coupons, banners, offers, FAQ,
// permissions, notification settings, and the one admin account given by --keep.
// Deleted: orders, invoices, returns, POS sales, accounting entries, stock history,
// suppliers and purchases, reviews, wishlists, stock alerts, contact messages,
// newsletter sign-ups, notifications, audit log, HR records and every other account.
//
// Download a backup first (Admin → Settings → Backup). Everything runs in one
// transaction: if any step fails, nothing is deleted.

import pg from "pg";

const apply = process.argv.includes("--apply");
const keepArg = process.argv.indexOf("--keep");
const keepEmail = keepArg > 0 ? process.argv[keepArg + 1]?.toLowerCase() : null;
const url = process.env.DATABASE_URL;
if (!url || !keepEmail) {
  console.error("Usage: DATABASE_URL=<url> node scripts/apply/fresh-start.mjs --keep <admin-email> [--apply]");
  process.exit(1);
}

// Children before parents, so no foreign key blocks a delete.
const STEPS = [
  ["ReviewHelpfulVote"],
  ["Review"],
  ["WishlistItem"],
  ["ProductStockAlert"],
  ["OrderReturnItem"],
  ["OrderReturn"],
  ["Invoice"],
  ["LedgerInvoice"],
  ["Transaction"],
  ["StockMovement"],
  ["OrderItem"],
  ["Order"],
  ["PurchaseItem"],
  ["Purchase"],
  ["Supplier", `UPDATE "Product" SET "supplierId" = NULL WHERE "supplierId" IS NOT NULL`],
  ["ContactMessage"],
  ["Newsletter"],
  ["Notification"],
  ["AuditLog"],
  ["RateLimit"],
  ["Attendance"],
  ["SalaryRecord"],
  ["LeaveRequest"],
  ["UserAddress"],
  ["Session"],
  ["VerificationToken"],
  ["Account", null, `"userId" <> $1`],
  ["User", null, `id <> $1`],
];

const client = new pg.Client({ connectionString: url });
console.log(`Database: ${new URL(url).hostname}${new URL(url).pathname}`);
await client.connect();
try {
  const admin = (await client.query(`SELECT id, email, role FROM "User" WHERE lower(email) = $1`, [keepEmail])).rows[0];
  if (!admin) throw new Error(`No account with email ${keepEmail}.`);
  if (admin.role !== "ADMIN") throw new Error(`${keepEmail} is ${admin.role}, not ADMIN; refusing so you are not locked out.`);
  console.log(`Keeping admin: ${admin.email}\n`);

  await client.query("BEGIN");
  let total = 0;
  for (const [table, before, where] of STEPS) {
    const cond = where ? ` WHERE ${where}` : "";
    const params = where ? [admin.id] : [];
    if (before) await client.query(before);
    const { rowCount } = await client.query(`DELETE FROM "${table}"${cond}`, params);
    total += rowCount;
    console.log(`${table.padEnd(20)} ${rowCount}`);
  }
  const kept = (await client.query(`SELECT (SELECT count(*) FROM "Product") AS products, (SELECT count(*) FROM "Category") AS categories`)).rows[0];
  console.log(`\n${total} rows ${apply ? "deleted" : "would be deleted"}. Kept ${kept.products} products, ${kept.categories} categories.`);
  if (apply) {
    await client.query("COMMIT");
    console.log("Done.");
  } else {
    await client.query("ROLLBACK");
    console.log("Preview only, nothing changed. Add --apply to delete.");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Stopped, nothing changed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
