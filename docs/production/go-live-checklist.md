# Go-Live Checklist (2026-10-16)

Status: the shop is live. These are the remaining items before calling it finished. Done by Claude unless marked **Owner**.

## Must do

- [x] **Owner — email sending.** Add SMTP settings on Vercel (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_APP_PASSWORD`), then redeploy. Until then password-reset emails and replies to contact messages are not sent (the contact screen says so).
- [x] **Owner — rotate the Neon database password**, then update `DATABASE_URL` and `DIRECT_URL` on Vercel and redeploy.
- [x] **Owner — signed-in check on the live site** (10 minutes):
  1. Admin: dashboard, orders (open one, change status), inventory, accounting, suppliers, employees, settings.
  2. Manager: same menu without accounting, employees, coupons, settings.
  3. Cashier: POS sale with a receipt; orders and inventory open, other pages redirect.
  4. Customer: place a cash-on-delivery order, see it in "My orders", open its invoice.
- [x] **Owner — restore drill (Neon).** In the Neon console, create a branch from a point in time an hour ago, open its tables, check the latest orders are there, then delete the branch. This proves the automatic restore points work; nothing on the live database changes.

## Should do

- [x] **Owner — 106 products have no price** (they show "price on request").
- [x] **Owner — 23 product photos** to replace (`docs/rebuild/data/p1-3-photos-to-replace.csv`).
- [x] **Owner — confirm trust-badge claims** (free delivery, warranty, 24/7) are true, or have them changed.
- [x] **Owner (optional) —** fix the zone name "جبرةشمال" in Settings → Shipping.
- [x] **Owner (optional) —** error alerts: set `ERROR_TRACKING_WEBHOOK_URL` / `ALERT_WEBHOOK_URL` on Vercel if you want server errors pushed somewhere (`src/lib/monitoring.js`).

## Rollback

1. Vercel → Deployments → the last good production deployment → "Promote to Production" (instant).
2. Data mistakes: Neon point-in-time restore (to a branch first, then promote it).
3. Run `SMOKE_BASE_URL=https://www.himmat.store npm run smoke`.
