# Rebuild Progress

Single source of truth for where the rebuild stands. Update after every workflow step.
Roadmap: [`docs/superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md`](../superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md)

## Now

- **Current part:** P0.1 Local dev environment
- **Step:** 6 — PR open, waiting for CI
- **Last done:** P0.1 built on `rebuild/p0-1-local-dev` (plan: `docs/superpowers/plans/2026-10-03-p0-1-local-dev-environment.md`)
- **Next:** merge P0.1 → start P0.2 whole-app audit (smoke findings in `docs/rebuild/parts/P0.1.md`)

## Open decisions

- Brand direction (P0.3): user to pick from 2–3 directions.
- Real catalog export (P1): user runs read-only export script when P1.1 starts.

## Parts

Status: `todo` · `audit` · `design` · `build` · `test` · `review` · `done`

| ID | Part | Status | Branch / PR | Notes |
|---|---|---|---|---|
| P0.1 | Local dev environment | review | `rebuild/p0-1-local-dev` | |
| P0.2 | Whole-app audit | todo | | |
| P0.3 | Brand identity + design system | todo | | |
| P0.4 | App shell | todo | | |
| P1.1 | Category taxonomy | todo | | |
| P1.2 | Product content | todo | | |
| P1.3 | Product media | todo | | |
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
