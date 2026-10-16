import { describe, expect, it } from "vitest";
import pg from "pg";
import { writeBackup } from "@/lib/backup";

// Backup → wipe → restore on a real, migrated database (CI's test database). Destructive, so it
// only runs where DATABASE_TEST_URL is set.
const url = process.env.DATABASE_TEST_URL;

const snapshot = async (c: pg.Client) => {
  const { rows } = await c.query(`
    SELECT 'Store' t, md5(string_agg(x::text, '|' ORDER BY x::text)) h FROM "Store" x
    UNION ALL SELECT 'NotificationConfig', md5(string_agg(x::text, '|' ORDER BY x::text)) FROM "NotificationConfig" x
    UNION ALL SELECT 'Category', md5(string_agg(x::text, '|' ORDER BY x::text)) FROM "Category" x`);
  return rows;
};

describe.skipIf(!url)("database backup", () => {
  it("restores into an identical database (linked tables, sub-categories, exact times)", async () => {
    const c = new pg.Client({ connectionString: url!.replace(/\?.*$/, "") });
    await c.connect();
    try {
      // Rows whose alphabetical table order is the wrong load order, a child category, a fixed time.
      await c.query(`INSERT INTO "Store" (id, "nameAr", "nameEn", "updatedAt") VALUES ('zz-store', 'متجر', 'Store', '2026-01-02 03:04:05.678') ON CONFLICT DO NOTHING`);
      await c.query(`INSERT INTO "NotificationConfig" (id, "storeId", "updatedAt") VALUES ('aa-config', 'zz-store', now()) ON CONFLICT DO NOTHING`);
      await c.query(`INSERT INTO "Category" (id, name, "parentId", "updatedAt") VALUES ('zz-parent', 'Backup parent', NULL, now()) ON CONFLICT DO NOTHING`);
      await c.query(`INSERT INTO "Category" (id, name, "parentId", "updatedAt") VALUES ('aa-child', 'Backup child', 'zz-parent', now()) ON CONFLICT DO NOTHING`);
      const before = await snapshot(c);

      let sql = "";
      await writeBackup(c, "sql", async (t: string) => {
        sql += t;
      });
      expect(sql).toContain('"updatedAt":"2026-01-02 03:04:05.678"');

      await c.query(`TRUNCATE "Category", "NotificationConfig", "Store" CASCADE`);
      await c.query(sql);
      expect(await snapshot(c)).toEqual(before);
    } finally {
      await c.end();
    }
  });
});
