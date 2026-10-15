# Rebuild Progress

Single source of truth for where the rebuild stands. Update after every workflow step.
Roadmap: [`docs/superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md`](../superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md)

## Now

- **Current part:** P3.6 Suppliers & purchases (branch `rebuild/p3-6-suppliers`)
- **Step:** 1 — audit
- **Last done:** P2.7 done — #29 merged, deployed 2026-10-11; legal text applied (2 rows, old values in export/); live robots, sitemap (170 URLs, no auth pages), manifest, share image, terms, track-order noindex checked.
- **Built (2026-10-14, P3.3):** `src/lib/order-workflow.js` status rules per role + cancel/reinstate effects (A-23/A-25/A-26); returns priced from the order and capped by earlier returns; approving books the refund; `Order.deliveredAt` migration (return window); store credit removed; sales = not cancelled everywhere; dead `order-management.js` (A-24) removed. Still `ar-EG` digits in accounting, employees, reviews (their parts).
- **Built (2026-10-14, P3.2):** one stock helper `src/lib/stock.js` records every stock change (checkout, cancel, return, refund, POS, receive/issue, +/−, create/edit; A-28); edit applies only the user\'s change; hide/restore (A-20); summary in SQL; Select labels fixed app-wide (Base UI `items`); cashiers can open inventory and receive only; import-tax table → printout.
- **Built (2026-10-13):** dashboard from orders (no cancelled) + grouped SQL chart + real period change, Arabic labels; one role map `src/lib/staff-access.js` for proxy/pages/sidebar (checked locally: admin, manager, cashier menus + cashier redirects); read-only access table replaces the permission matrix; Himmat lockup + page title in admin header. Local `/pos` load hung in dev (low memory); CI e2e `pos-cashier` decides.
- **Done:** P3.5 — #34 merged, deployed 2026-10-15 (`ledger_sources` migration ran); live `/admin/accounting` sends signed-out visitors to login. Signed-in checks not done live.
- **Done:** P3.4 — #33 merged, deployed 2026-10-15; live `/pos` sends signed-out visitors to login, store pages 200. Signed-in checks not done live.
- **Done:** P3.3 — #32 merged, deployed 2026-10-15 (`deliveredAt` migration ran); live `/admin/orders` sends signed-out visitors to login, `/account/orders` redirects to login, store pages 200. Signed-in checks not done live.
- **Done:** P3.2 — #31 merged, deployed 2026-10-14; live `/admin/inventory` sends signed-out visitors to login, store pages 200. Signed-in checks not done live. Production counts for the audit were not read (permission blocked).
- **Review of P3.1–P3.3 (2026-10-15, in PR #33):** returns refunded the list price, not what was paid (coupon/POS discount); staff could open returns on undelivered orders; an approved return could be rejected, which freed its items for a second refund; cashier receipts could set a unit cost; stock search ignored Arabic names. All fixed with tests. Carried to P3.5/P3.7: managers can call the read-only accounting (`ensureAccountingView`) and employee list actions, although those pages are admin-only.
- **Next:** P3.6 Suppliers & purchases audit (carries: force-deleting a paid purchase leaves its cash rows; purchase receive writes stock directly, not via `changeStock`). Decided (owner "do what you recommend", 2026-10-15): managers keep recording supplier payments; each cash row names who recorded it. Owner (optional): log in as a customer on the live site and open an order + its invoice to confirm P2.6. Owner: **set up email sending (SMTP on Vercel) — reminder requested 2026-10-08, password-reset emails need it**; (optional) fix zone name "جبرةشمال" in admin; Owner: confirm trust-badge claims (free delivery, warranty, 24/7); 23 photos in `docs/rebuild/data/p1-3-photos-to-replace.csv` (17 missing; Hafab cooker + Unionaire AC originals likely deleted from Cloudinary); fill 106 zero prices; rotate the Neon DB password.
- **Decisions (user, 2026-10-03):** refine, don't redesign; must not look AI-made. Name: **Himmat / همّت** leads; shop name + "المدير العام: رياض همت" as small labels. Defaults Arabic + light. Footer credit "تطوير: Sarmadax" → sarmadax.com.

## Open decisions

- Brand (P0.3): refine-not-redesign agreed; awaiting feedback on the brand sheet.
- Vercel `DIRECT_URL` was a localhost value; user replaced it with the Neon unpooled string (2026-10-03).
- Real catalog: read from the live public pages instead (snapshot `export/catalog-live-2026-10-04.json`); DB export script kept for P1.2 if needed.

## Parts

Status: `todo` · `audit` · `design` · `build` · `test` · `review` · `done`

| ID | Part | Status | Branch / PR | Notes |
|---|---|---|---|---|
| P0.1 | Local dev environment | done | #3 | |
| P0.2 | Whole-app audit | done | #11 | hotfixes #5, #6, #8, #9, #10; deploy #7, #12, #13 |
| P0.3 | Brand identity + design system | done | #14 | refine, don't redesign; a11y target deferred to P0.4/P2 |
| P0.4 | App shell | done | #16 | shell + lighter pages |
| P1.1 | Category taxonomy | done | #18 | hotfix #17 |
| P1.2 | Product content | done | `rebuild/p1-2-content` | |
| P1.3 | Product media | done | `rebuild/p1-3-media` | |
| P2.1 | Home | done | `rebuild/p2-1-home` | #22 |
| P2.2 | Listing & search | done | `rebuild/p2-2-listing` | #24 |
| P2.3 | Product page | done | `rebuild/p2-3-product` | #25 |
| P2.4 | Cart & checkout | done | `rebuild/p2-4-checkout` | #26 |
| P2.5 | Auth | done | `rebuild/p2-5-auth` | #27 |
| P2.6 | Customer account | done | `rebuild/p2-6-account` | #28 |
| P2.7 | Content, SEO, PWA | done | `rebuild/p2-7-content` | parts/P2.7.md |
| P3.1 | Admin shell & dashboard | done | #30 | parts/P3.1.md |
| P3.2 | Inventory | done | #31 | parts/P3.2.md |
| P3.3 | Orders | done | #32 | parts/P3.3.md |
| P3.4 | POS | done | #33 | parts/P3.4.md; also P3.1–P3.3 review fixes |
| P3.5 | Accounting | done | #34 | parts/P3.5.md |
| P3.6 | Suppliers & purchases | todo | | |
| P3.7 | Employees & HR | todo | | |
| P3.8 | Engagement admin | todo | | |
| P3.9 | Settings & backups | todo | | |
| P4.1 | Final audit & go-live | todo | | |

## Log

- 2026-10-03 — CI fixed (PR #2 merged: baseline migration, test suite). Roadmap agreed; spec written.
- 2026-10-03 — P0.1 built: local DB script, guarded modular seed, CI seeds fresh DB.
- 2026-10-03 — P0.1 merged (#3) with dependency audit (#4). P0.2 started; two live bugs split out as hotfix PRs #5, #6.
- 2026-10-03 — Prod deploy of P0.1 failed (P1002, migrate via pooler) → #7. Audit complete: 45 findings, hotfixes #8 (inactive login), #9 (product delete history), #10 (JSON-LD XSS); Lighthouse baseline recorded.
- 2026-10-03 — All P0.2 PRs merged and deployed; build migrations made robust (#12 fallback, #13 no advisory lock via pooler). P0.3 started: brand sheet (before/after) shared.
- 2026-10-04 — P0.3 built and reviewed (fresh reviewer: 4 Important + 3 re-graded fixed with tests); PR opened.
- 2026-10-04 — P0.3 merged (#14) and deployed to production.
- 2026-10-04 — P0.4 built (10 tasks), final review fixed, PR #16 ready for merge.
- 2026-10-04 — P0.4 merged (#16) and deployed; P1.1 started, read-only catalog export script written.
- 2026-10-05 — P1.1 merged (#18) + cost hotfix (#17); tree applied on production; site briefly 500 after a Vercel env change (`NEXT_PUBLIC_URL` required) → validateEnv now accepts either site URL name.
- 2026-10-05 — P1.2 merged (#20) and content applied on production; brand field live.
- 2026-10-05 — P1.3 merged (#21); 45 photos cleaned and applied. Claude may now merge PRs and run reviewed `scripts/apply/*` (user permission rules in `.claude/settings.local.json`; secrets in git-ignored `.env.photos`).
- 2026-10-14 — P3.2 Inventory merged (#31): stock movements for every change, hide/restore, SQL summary, Select labels app-wide, cashier receive view.
- 2026-10-15 — P3.3 Orders merged (#32): status rules per role, returns priced from the order and capped, refunds booked on approval, `deliveredAt` return window, sales exclude cancelled.
- 2026-10-15 — P3.4 POS merged (#33): server-set totals, no tax, 10% cashier discount cap, cash/card/Bankak, phone cart sheet; plus review fixes for P3.2/P3.3 (refund = amount paid, returns only on delivered orders, approved returns can't be rejected).
- 2026-10-15 — P3.5 Accounting merged (#34): profit from orders (net sales, item cost, running costs), cash book of real money in/out (store orders on delivery; supplier, salary, refund, debt payments), POS pay-later as receivables, accounting admin-only.
