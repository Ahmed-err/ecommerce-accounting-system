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
