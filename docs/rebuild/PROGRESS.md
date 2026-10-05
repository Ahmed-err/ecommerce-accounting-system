# Rebuild Progress

Single source of truth for where the rebuild stands. Update after every workflow step.
Roadmap: [`docs/superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md`](../superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md)

## Now

- **Current part:** P1.3 Product media
- **Step:** 6 — audit + build done in one pass (code only); PR open; screenshots review
- **Last done:** P1.2 done — #20 merged and deployed; content applied on production 2026-10-05 (136 updated, duplicate hidden, 0 skipped); live verified (names, brand in structured data, specs).
- **Next:** user merges the P1.3 PR → I verify live → P2.1 Home. Owner: replace the 68 photos in `docs/rebuild/data/p1-3-photos-to-replace.csv`; fill the 106 zero prices; rotate the Neon DB password. P2.3 note: hidden/unknown product URL returns 200 (soft 404)
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
| P1.3 | Product media | review | `rebuild/p1-3-media` | |
| P2.1 | Home | todo | | |
| P2.2 | Listing & search | todo | | |
| P2.3 | Product page | todo | | |
| P2.4 | Cart & checkout | todo | | |
| P2.5 | Auth | todo | | |
| P2.6 | Customer account | todo | | |
| P2.7 | Content, SEO, PWA | todo | | |
| P3.1 | Admin shell & dashboard | todo | | |
| P3.2 | Inventory | todo | | |
| P3.3 | Orders | todo | | |
| P3.4 | POS | todo | | |
| P3.5 | Accounting | todo | | |
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
