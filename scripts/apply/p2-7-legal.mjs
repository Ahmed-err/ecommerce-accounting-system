// P2.7: bring the stored terms/privacy text in line with the owner-approved wording.
// - Terms §6 (returns): the 14-day, unused, original-packaging policy (owner, 2026-10-09).
// - Privacy §8: drop "the date appears above" when the page had no date (it now shows one).
//
//   DATABASE_URL="<url>" node scripts/apply/p2-7-legal.mjs           # preview only, writes nothing
//   DATABASE_URL="<url>" node scripts/apply/p2-7-legal.mjs --apply   # make the changes
//
// Only the returns section / changes section is replaced, and only in rows that exist; the
// rest of any text the store edited stays as it is. Safe to re-run: a second --apply finds
// nothing to do. Old values are logged to export/ before writing, in one transaction.

import fs from "node:fs";
import pg from "pg";
import {
  DEFAULT_TERMS_AR,
  DEFAULT_TERMS_EN,
  DEFAULT_PRIVACY_AR,
  DEFAULT_PRIVACY_EN,
} from "../../src/lib/legal-defaults.js";

const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

// The <h2 id="…">…</h2><p>…</p> block for one section.
const sectionRe = (id) => new RegExp(`<h2 id="${id}">[\\s\\S]*?</h2>\\s*<p>[\\s\\S]*?</p>`);
const section = (html, id) => html.match(sectionRe(id))?.[0] || null;

const PLAN = [
  { type: "TERMS", id: "terms-returns", ar: section(DEFAULT_TERMS_AR, "terms-returns"), en: section(DEFAULT_TERMS_EN, "terms-returns") },
  { type: "PRIVACY", id: "privacy-changes", ar: section(DEFAULT_PRIVACY_AR, "privacy-changes"), en: section(DEFAULT_PRIVACY_EN, "privacy-changes") },
];

const client = new pg.Client({ connectionString: url });
console.log(`Database: ${new URL(url).hostname}${new URL(url).pathname}`);
await client.connect();
try {
  const rows = (await client.query(`SELECT type, "contentAr", "contentEn", "updatedAt" FROM "LegalPage"`)).rows;
  const changes = [];
  for (const p of PLAN) {
    const row = rows.find((r) => r.type === p.type);
    if (!row) {
      console.log(`${p.type}: no stored row; the page uses the built-in text (already updated). Nothing to do.`);
      continue;
    }
    const next = {};
    for (const [col, want] of [["contentAr", p.ar], ["contentEn", p.en]]) {
      const have = section(row[col] || "", p.id);
      if (!have) console.log(`${p.type}.${col}: section "${p.id}" not found; left as is (check by hand).`);
      else if (have === want) console.log(`${p.type}.${col}: already up to date.`);
      else {
        console.log(`${p.type}.${col}:\n  - ${have}\n  + ${want}`);
        next[col] = row[col].replace(have, want);
      }
    }
    if (Object.keys(next).length) changes.push({ type: p.type, old: row, next });
  }

  if (!changes.length) console.log("\nNothing to change.");
  else if (!apply) console.log(`\nPreview only: ${changes.length} row(s) would change. Re-run with --apply.`);
  else {
    fs.mkdirSync("export", { recursive: true });
    const log = `export/p2-7-legal-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    fs.writeFileSync(log, JSON.stringify(changes.map((c) => c.old), null, 2));
    await client.query("BEGIN");
    for (const c of changes) {
      const cols = Object.keys(c.next);
      const sets = cols.map((col, i) => `"${col}" = $${i + 2}`).join(", ");
      await client.query(`UPDATE "LegalPage" SET ${sets}, "updatedAt" = now() WHERE type = $1`, [c.type, ...cols.map((col) => c.next[col])]);
    }
    await client.query("COMMIT");
    console.log(`\nApplied ${changes.length} row(s). Old values: ${log}`);
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}
