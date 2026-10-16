# Backup & Restore Drill

The database is on Neon, which keeps automatic restore points (point-in-time restore). That is the recovery path; the "download backup" button in Settings → Backup is an extra copy.

## Drill (owner, ~10 minutes, live data untouched)

1. Neon console → the project → **Branches** → **Create branch**, choose **Past data / point in time**, about one hour ago.
2. Open the new branch's **Tables**: check `Order` and `Product` have recent rows.
3. Delete the branch.

## Real restore

1. Create the branch at the moment before the mistake (as above) and check its data.
2. Either promote it to be the main branch in Neon, or point `DATABASE_URL` / `DIRECT_URL` on Vercel at it and redeploy.
3. Run `SMOKE_BASE_URL=https://www.himmat.store npm run smoke`.

## Evidence

- Drill date:
- By:
- Point restored:
- Rows checked:

## The app's download (Settings → Backup)

Choose **SQL**. To load it back (developer task):

1. A database with the current schema: an empty Neon branch, then `DATABASE_URL=<branch url> npx prisma migrate deploy`.
2. `psql "<branch url>" -v ON_ERROR_STOP=1 -f db-backup-<date>.sql` (one transaction: it empties every table, then reloads them; on any error nothing changes).
3. Check the data, then point the site at it as above.

JSON is a readable copy only; there is no loader for it.

### Drill 2026-10-16 (Claude, local copy of the shop)

- First run **failed**: tables were written alphabetically, so `NotificationConfig` loaded before `Store` and the foreign key stopped the restore. Every SQL download before this fix could not be loaded back.
- Also found: dates were shifted by the server's time zone (3 h on a Cairo-time machine; production runs in UTC so live files were not shifted).
- Fixed in `src/lib/backup.js`: tables in dependency order, sub-categories after their parents, dates copied as stored.
- Re-run: backup → empty database → restore, and again over existing data: **42 tables, all rows identical** (per-table content hash).
- Guarded by `tests/integration/prisma/backup-restore.test.ts` (runs in CI on a real database) and `tests/unit/lib/backup-order.test.ts`.
