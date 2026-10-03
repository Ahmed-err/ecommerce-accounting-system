# P0.2 Whole-app audit — findings

Quick pass over every route and module. Each finding is assigned to the rebuild part that owns it; that part fixes it or defers it with a reason in its notes. Findings marked **hotfix** were too risky to leave live until their part and were fixed straight away.

Method: static review of the source on `main` at `60f7c10` (the dev machine has 3.2 GB RAM, so `next dev` cannot run long enough for a full click-through; runtime smoke findings from P0.1 are folded in). Production was never accessed.

Severity: **Critical** (exploitable now / data loss) · **High** (broken flow for real users, money or stock wrong) · **Medium** (wrong in edge cases, security hardening) · **Low** (polish, dead code).

## Summary

45 findings: 1 Critical, 11 High, 21 Medium, 12 Low. Performance numbers: [`perf-baseline.md`](perf-baseline.md).

**Fixed straight away (hotfix PRs):** A-01 unauthenticated admin categories API (#5) · A-02 checkout errors thrown instead of shown (#6) · A-31 production migrations through the DB pooler (#7) · A-21 deactivated users could log in / stale roles (#8) · A-20 deleting a product erased order history (#9) · A-32 stored XSS via JSON-LD (#10).

**Biggest themes for the rebuild:**
1. *Money and stock integrity* — revenue booked at order time, refunds/returns/account-closure paths that skip stock or ledger, purchases and payroll missing from accounting (A-05, A-23–A-26, A-29, A-35). Owned by P3.3/P3.5, with checkout parts in P2.4.
2. *Permissions are role lists in code*; the admin permission matrix is decorative (A-12, A-13).
3. *Store speed*: LCP 3.7–5.0 s on mobile from a heavy shared client bundle, not the server (A-44); admin dashboard query fan-out (A-43).
4. *RTL and i18n debt*: 693 physical direction classes, 594 inline translations (A-39, A-40) — handled as each part is rebuilt on the P0.3 design system.
5. *Tests*: 1.3% unit coverage, server actions not measured (A-38) — every part adds tests for what it touches.

## Findings

| ID | Sev | Area | Finding | Where | Part |
|---|---|---|---|---|---|
| A-01 | Critical | Security | `/api/admin/categories` (GET, POST) and `/[id]` (GET, PUT, DELETE) had no auth; the proxy matcher only covers `/admin` pages. Anyone could create categories. Unused by the app. **Hotfix #5:** routes deleted, test requires `await auth()` in every `/api/admin` handler. | `src/app/api/admin/categories/` | hotfix |
| A-02 | High | Checkout | `placeOrder` catch block read `effectiveUserId`, a `let` scoped to the `try` → every failed checkout threw `ReferenceError`; customers saw a generic error instead of the reason (e.g. out of stock) and the `checkout_failure` alert never fired. **Hotfix #6.** | `src/app/actions/catalog.js` `placeOrder` | hotfix |
| A-03 | High | Checkout | Guests are offered Bank transfer, which requires a proof upload, but `/api/upload` returns 401 without a session → guests cannot complete a bank-transfer order. | `CheckoutClient.js` ~963, `src/app/api/upload/route.js` | P2.4 |
| A-04 | Medium | Invoices | Every store invoice QR embeds a hard-coded `VAT: 310123456700003` (a Saudi-format sample number) — a fake tax ID on customer invoices. | `catalog.js` `placeOrder` QR block | P3.3 |
| A-05 | Medium | Accounting | `placeOrder` books an `INCOMING` "Sales" transaction at order creation, while the order is still `PENDING` (incl. cash on delivery). Revenue is recognised before payment; check that cancel/return reverses it. | `catalog.js` `placeOrder` | P3.5 |
| A-06 | Medium | Checkout | Invoice number is `INV-<last 6 digits of ms>-<0..999>`; collisions hit the unique constraint and fail the order. | `catalog.js` `placeOrder` | P2.4 |
| A-07 | Low | Checkout | Staff roles using the storefront checkout skip address/phone validation and pay 0 shipping (`isCustomerCheckout` false). | `catalog.js` `placeOrder` | P2.4 |
| A-08 | Low | Checkout | `guest.name/email/address/phoneAlt` have no length limits or email format check; the raw `transferScreenshotUrl` (not the sanitised one) is written into the accounting transaction description. | `catalog.js` `placeOrder` | P2.4 |
| A-09 | Low | Checkout | Payment proof URL accepts any `*.cloudinary.com` host, not only this store's cloud name. | `catalog.js` `sanitizePaymentProofUrl` | P2.4 |
| A-10 | Medium | Account | Guest order tracking matches order id and phone with `contains` (min 3 / 6 chars), so a partial id + partial phone can return another customer's order status. Should be exact match on normalised values. | `src/app/actions/user-orders.js` `trackGuestOrderAction` | P2.6 |
| A-11 | Medium | Checkout | Order confirmation page loads the order only for logged-in owners (`getMyOrderConfirmation`), so guests see an empty confirmation after a successful order. | `order-confirmation/[id]`, `catalog.js` | P2.4 |
| A-12 | Medium | Permissions | Admin "role permissions" UI stores per-module create/edit/delete capabilities, but `roleHasModuleCapability` is never called; actions only check hard-coded role lists. Toggling a capability has no effect, and revoking a module's view hides the page but not its server actions. | `src/lib/permissions-policy.js`, `src/app/actions/*` | P3.1 |
| A-13 | Low | Permissions | Proxy restricts `/admin/accounting` to ADMIN, but accounting actions accept MANAGER — page and API disagree on who is allowed. | `src/proxy.js`, `actions/accounting.js` | P3.1 |
| A-14 | Medium | Uploads | Any logged-in customer can upload to any folder (`products`, `store`, `employees`, …), 30/hour; folder should depend on role. | `src/app/api/upload/route.js` | P0.4 |
| A-15 | Low | Uploads | `bannerImage` maps to folder `banners`, which `/api/upload` rejects; unused. UI says "up to 4MB", server allows 5MB. | `src/lib/uploader.js` | P0.4 |
| A-16 | Low | Settings | Two backup endpoints doing the same job (`/api/backup` and `/api/admin/backup/database`). | `src/app/api/` | P3.9 |
| A-17 | Medium | Store | `/about` (and pages rendering shipping zones) crash in dev: Prisma `Decimal` `shippingCost` passed to a Client Component. (P0.1 smoke) | `ShippingZone` → client | P2.7 |
| A-18 | Medium | Store | `/_next/image` returns 500 for `images.unsplash.com` seed images; one 404 asset on `/` and `/products`. (P0.1 smoke; seed images only, check prod hosts in P1.3) | `next.config.mjs` images | P1.3 |
| A-31 | High | Deploy | Production `prisma migrate deploy` ran over the Neon pooled URL; advisory lock times out at random (P1002) → deploy of `60f7c10` failed. **Fix #7:** CLI prefers `DIRECT_URL`. | `prisma.config.ts` | hotfix |
| A-19 | High | Admin | `/admin` hit "Router action dispatched before initialization" and the root error boundary in dev; `/admin` took 2.1 min and `/admin/inventory` 3.2 min with pg pool timeouts. (P0.1 smoke) | `src/app/admin` | P3.1 |
| A-20 | High | Inventory | Deleting a product (single or bulk) first **deletes its lines from every past order, purchase and return** (`deleteProductsInTx`). Historic orders lose items, invoices no longer match totals; unrecoverable. Products with history should be archived (hidden), not deleted. Force-deleting a category did the same for all its products. **Hotfix #9:** refuse when history exists; bulk skips. Proper archive flow stays in P3.2. | `src/app/actions/inventory.js` `deleteProductsInTx` | hotfix |
| A-21 | High | Auth | Login never checks `isActive`, so a deactivated employee (`employees.js` sets `isActive: false`) can still sign in. Role is stored in the JWT at login and never re-read (default 30-day expiry), so demotion/deactivation does not take effect on existing sessions. **Hotfix #8:** refuse inactive at login (credentials + Google), re-check role/active every 5 min in the JWT callback. | `src/auth.js` `authorize`, `src/auth.config.js` `jwt` | hotfix |
| A-22 | Medium | Account | Account settings list and "revoke" DB sessions, but auth uses the JWT strategy, so revoking does not sign anything out. | `actions/user.js` `revokeSessionToken`, `revokeAllOtherSessions` | P2.6 |
| A-23 | High | Orders | Closing an account cancels its PENDING orders with a raw `updateMany`: stock is not restored and the sales transaction is not reversed (bypasses `updateOrderStatus`). | `actions/user.js` `deleteMyAccount` | P2.6 |
| A-24 | High | Orders | `processRefund` (any staff incl. CASHIER): no cumulative cap (repeat refunds can exceed the order total); `items` to restock are taken from the client and not checked against the order, so any product's stock can be incremented. | `actions/order-management.js` | P3.3 |
| A-25 | Medium | Orders | Returns: each request is checked against ordered qty, not against earlier approved returns; approving restocks but books no refund; cancelling an order after a return restocks again. | `actions/orders.js` `approveOrderReturn`, `catalog.js` `updateOrderStatus` | P3.3 |
| A-26 | Medium | Orders | No status transition rules: any staff role can move any order to any status (e.g. CASHIER cancels a DELIVERED order → stock and revenue reversed). | `catalog.js` `updateOrderStatus` | P3.3 |
| A-27 | Medium | POS | Discount and tax come from the client: any cashier can discount up to 100% with no limit/approval; `taxAmount` is printed on the receipt but not added to the total; `paymentMethod` and discount type are not validated. | `actions/pos.js` `createPOSOrder` | P3.4 |
| A-28 | Low | Inventory | Stock history is incomplete: store checkout, manual `updateStockQuantity`, product edit (`stock` set directly), cancellations and returns write no `StockMovement`; only POS and receive/issue do. | `actions/inventory.js`, `catalog.js` | P3.2 |
| A-29 | Medium | Accounting | Single-entry cash ledger: "net profit" = all INCOMING − all OUTGOING, so unpaid COD orders count as income and there is no cost of goods. Order-generated sales rows can be edited/deleted (hard delete) like manual ones; MANAGER can edit an INCOMING row's type. | `actions/accounting.js` | P3.5 |
| A-30 | Low | Auth | Password reset tokens are stored in plain text (should be hashed); reset lookup by email is case-sensitive while the rate-limit key is lower-cased. | `actions/reset-password.js` | P2.5 |
| A-32 | High | Security | Stored XSS: product-page JSON-LD inlined `JSON.stringify` output (no `<` escaping) incl. approved reviews' reviewer names, which are the customer's own unrestricted first/last name; CSP allows `'unsafe-inline'`. **Hotfix #10:** `jsonLdHtml()` escaping at all 5 call sites + guard test. | `src/app/products/[slug]/page.js` and 3 more | hotfix |
| A-33 | Medium | Security | CSP `script-src` relies on `'unsafe-inline'` in production, so any HTML injection becomes script execution. Move to nonces. | `next.config.mjs` | P4.1 |
| A-34 | Low | Security | Names (register/profile) accept any characters; restrict to letters, spaces, `.-'` (AR + EN). | `actions/register.js`, `actions/user.js` | P2.5 |
| A-35 | Medium | Accounting | Supplier payments (`recordPurchasePaymentAction`) and salary payments (`markSalaryPaid`) write nothing to the transaction ledger, and accounting reports read only `Transaction` — purchases and payroll are invisible to profit unless re-entered by hand. | `actions/suppliers.js`, `actions/employees.js`, `lib/accounting.js` | P3.5 |
| A-36 | Medium | Suppliers | Force-deleting a supplier (ADMIN) deletes all its purchases (items cascade) without reversing received stock — purchase history lost. | `actions/suppliers.js` `deleteSupplierAction` | P3.6 |
| A-37 | Low | Employees | `createEmployee`/`updateEmployee` take `salary` via `parseFloat` with no schema (NaN/negative accepted). | `actions/employees.js` | P3.7 |
| A-38 | Medium | Tests | Unit coverage is 1.3% of measured code, and coverage `include` omits `src/app/actions/**`, where most business logic lives. 7 Playwright specs exist; e2e in CI runs against `next dev`, not a production build. | `vitest.config.ts`, `.github/workflows/test.yml` | P0.4 (then every part) |
| A-39 | Low | i18n | Translation keys are in parity (1,230 AR/EN), but 594 inline `lang === "ar" ? … : …` strings in 58 files bypass the dictionary. | `src/components/**` | each part as touched |
| A-40 | Medium | RTL | 693 physical direction classes (`ml-/mr-/pl-/pr-/left-/right-/text-left/right`) vs 136 logical ones (`ms-/me-/ps-/pe-/start-/end-`); layouts flip incorrectly in Arabic wherever physical ones are used for direction-dependent spacing. | `src/components/**` | P0.3/P0.4, then each part |
| A-41 | Low | CI | CI and tests run Node 20 (end of life on Vercel since 2026-10-01; Vercel default is 24); `engines` is `>=20`. | `.github/workflows/*.yml`, `package.json` | P0.4 |
| A-42 | Medium | Perf | Rate limiter runs 3 DB queries per check (delete expired, count, insert) on every guarded action; count-then-insert races under bursts; expired rows are only cleaned per key, so the table grows. | `src/lib/rate-limit.js` | P4.1 |
| A-43 | High | Perf | Admin dashboard fires ~15 queries at once (pg `Pool` default max 10 → queueing/timeouts), then up to 12 sequential per-month `findMany` loading every order of each month for the chart, and loads every active product to count low stock in JS. Matches the P0.1 smoke (`/admin` 2.1 min, pool timeouts). Use grouped SQL (`date_trunc`), a raw `stock <= "minStock"` count, and bounded concurrency. | `src/lib/dashboard.js` | P3.1 |
| A-44 | High | Perf | Mobile LCP 3.7–5.0 s on all key store pages (target < 2.5 s) with TTFB < 30 ms: 450–614 KB transferred even on `/login` (heavy shared client bundle) and 160–180 KB HTML on `/` and `/products`. See `perf-baseline.md`. | store pages, root layout | P0.4 (shared bundle), P2.1–P2.3 |
| A-45 | Medium | A11y | Lighthouse accessibility 79 (`/`), 82 (`/products`), 88 (product page); fix per page to ≥ 95. | store pages | P0.3/P0.4, P2.x |

## Checked, no finding

- Server-action role guards: every staff action file has a local `ensure*` helper with a role list; public actions (catalog reads, contact, register, reset password, coupon preview, newsletter, stock alert) are intentionally open and rate-limited where they write.
- Owner checks on `/orders/[id]/invoice`, `/api/orders/[id]/invoice`, `/account/orders/[id]`, `/api/notifications/[id]/read`.
- Async `params`/`searchParams` (Next 16): all pages and routes await them (the only sync use was in the deleted A-01 routes).
- Backup routes are ADMIN-only; upload route checks MIME type and size.
- Checkout and POS price every line from the DB, never from the client, and decrement stock with a `stock >= qty` guard inside the transaction.
- Login: rate-limited (fail closed), bcrypt only, deleted accounts refused. Register: rate-limited, role forced to CUSTOMER. Reset: per-email and per-IP limits, no account enumeration, 1-hour expiry.

## Coverage

| Area | Status |
|---|---|
| API routes (auth, ownership) | done |
| Server-action authorization | done |
| Checkout / order placement | done |
| Uploads | done |
| POS sale flow | done |
| Order status changes, returns, stock restore | done |
| Accounting logic | done (actions; reports in P3.5) |
| Inventory actions | done |
| Suppliers, employees actions | done |
| Auth flows (login, register, reset) | done |
| Security headers, rate limiting, env/secrets | done |
| Performance (queries, bundle, images) and Lighthouse baseline | done — `perf-baseline.md` |
| UI/UX, i18n/RTL, accessibility (static) | done (counts; visual review per part) |
| Lint, build, test coverage health | done |
