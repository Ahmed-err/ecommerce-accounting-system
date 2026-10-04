# App Rebuild Roadmap — Design

Date: 2026-10-03
Status: Approved roadmap (conversation, 2026-10-03). Each part gets its own spec → plan → implementation cycle.
Progress tracker: [`docs/rebuild/PROGRESS.md`](../../rebuild/PROGRESS.md)

## Goal

Turn the electrical-supplies store + ERP (Next.js 16 App Router, Prisma 7, Postgres, Vercel; Arabic/English with RTL, Sudan locale) into a product ready for real daily use. Work one part at a time; each part is finished to a fixed definition of done (design, style, UI, UX, logic, performance, security, functionality, audit, fixes, tests) before the next starts.

Also in scope: restructure the category tree, put every product in the right subcategory, and improve product names, descriptions, specs, and images.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Rebuild approach | Incremental, in place, one PR per part | Store stays live; each part ships independently behind green CI. A parallel rewrite means months of no value and a risky cutover. |
| Priority | Storefront before ERP | User decision. |
| Visual direction | New brand identity | User decision. 2–3 directions presented in Phase 0; user picks one. |
| Production data | Never written by Claude | User decision ("don't touch my data"). See Data safety. |
| Catalog data before store pages | Phase 1 precedes Phase 2 | Store pages render categories/products; designing them on messy data wastes work. |

## Data safety rules

1. All development runs against a local Postgres seeded with realistic data. No session connects to the production database.
2. Reading real catalog data: Claude writes a read-only export script (SELECT only); the user runs it and hands over the output file.
3. Changing real catalog data: Claude produces a review file of every proposed change (taxonomy, product moves, names, descriptions, image fixes). After user approval, a separate apply script is run by the user, after taking a backup. The script is idempotent and logs what it changed.
4. Schema changes ship only as Prisma migrations that are safe on existing data (verified by replaying on a fresh DB and `prisma migrate diff` being empty).

## Phases and parts

Order is the execution order. IDs are used in PROGRESS.md, branch names (`rebuild/<id>-<slug>`), and notes files.

### Phase 0 — Foundation
- **P0.1 Local dev environment** — local DB, `.env.example`, realistic seed (categories, products with images, orders, users per role), one-command setup.
- **P0.2 Whole-app audit** — quick pass over every route and module; findings logged to `docs/rebuild/audit/` and assigned to parts. Baseline Lighthouse/perf numbers for key store pages.
- **P0.3 Brand identity + design system** — palette (light/dark), Arabic + English type pairing, spacing/radius/elevation tokens, iconography, imagery style; shared components (`src/components/ui`) rebuilt on the tokens. 2–3 directions presented for choice.
- **P0.4 App shell** — navbar, footer, page layouts, theme toggle, RTL/LTR correctness, language switch, loading/error/not-found states.

### Phase 1 — Catalog data
- **P1.1 Category taxonomy** — design a category/subcategory tree that fits the actual products; mapping of every product to a subcategory; migration path from current categories.
- **P1.2 Product content** — names, descriptions, specs/highlights in Arabic and English; consistent naming convention (brand, type, key spec).
- **P1.3 Product media** — image audit (ratio, resolution, background, duplicates); standard aspect ratio(s) and Cloudinary transform pipeline; rendering via `next/image` with correct sizes/placeholders.

### Phase 2 — Store
- **P2.1 Home** — hero, category strip, featured/showcase, offers, trust, newsletter.
- **P2.2 Listing & search** — category pages, product listing, filters, sort, pagination, global search.
- **P2.3 Product page** — gallery, details/specs, stock, reviews, related, compare.
- **P2.4 Cart & checkout** — cart, checkout, coupons, shipping zones, payment methods incl. bank-transfer proof, order confirmation.
- **P2.5 Auth** — login, register, forgot/reset password, phone verification.
- **P2.6 Customer account** — orders, order detail, track order, invoices, returns, wishlist, addresses, notifications, settings.
- **P2.7 Content, SEO, PWA** — about, contact, legal pages, metadata/sitemap/robots/structured data, service worker/offline.

### Phase 3 — ERP
- **P3.1 Admin shell & dashboard** — sidebar, layout, dashboard KPIs/charts, role permissions.
- **P3.2 Inventory** — products admin, categories admin, stock, barcodes, reports.
- **P3.3 Orders** — order management, returns, invoices.
- **P3.4 POS** — POS flow, thermal receipt printing.
- **P3.5 Accounting** — transactions, ledger, reports.
- **P3.6 Suppliers & purchases**.
- **P3.7 Employees & HR** — employees, attendance, salaries, leave.
- **P3.8 Engagement admin** — coupons, reviews, contacts, notifications.
- **P3.9 Settings & backups** — store settings, shipping/payment config, backup routes.

### Phase 4 — Launch
- **P4.1 Final audit & go-live** — full end-to-end audit, load/perf testing, security review, backup/restore drill, go-live checklist (`docs/production/`).

## Per-part workflow

1. **Audit** the part: design, UX, logic/correctness, performance, security, accessibility. Findings → `docs/rebuild/parts/<id>.md`.
2. **Design**: present the redesign/fix plan to the user; wait for approval. Larger parts get a spec in `docs/superpowers/specs/` and a plan in `docs/superpowers/plans/`.
3. **Build** on branch `rebuild/<id>-<slug>`. Split oversized files (several are 1,000–1,650 lines) into focused components and modules as they are touched; no unrelated refactors.
4. **Test**: unit/integration (Vitest) for logic, Playwright E2E for user flows in AR and EN, mobile and desktop viewports.
5. **Verify**: `npm run test:unit` locally; CI runs lint, build, client-bundle check, `audit:deps`, e2e and screenshots; perf numbers (perf-baseline workflow) recorded before/after for store pages.
6. **Ship**: PR to `main`, CI green, user merges. PROGRESS.md updated.

## Definition of done (per part)

- Matches the approved design in both languages, RTL and LTR, light and dark, phone through desktop.
- Every audit finding for the part is fixed or explicitly deferred with a reason in the part notes.
- Server-side authorization and input validation on every action/route the part owns.
- No console errors; loading, empty, and error states handled.
- Accessibility: keyboard reachable, labelled controls, sufficient contrast.
- Tests cover the part's main flows and the bugs fixed; all CI checks green.
- PROGRESS.md and part notes updated.

## Resuming after an interruption

- `docs/rebuild/PROGRESS.md` is the single source of truth: current part, current workflow step, last completed action, next action, open decisions. Updated after every workflow step and before any long-running task.
- Part notes (`docs/rebuild/parts/<id>.md`) hold audit findings and decisions.
- A Claude memory entry points to PROGRESS.md so new sessions load it.

## Out of scope (for now)

- Changing hosting (stays on Vercel) or core stack (Next.js, Prisma, Postgres).
- New business modules not already in the app, unless the user asks.
