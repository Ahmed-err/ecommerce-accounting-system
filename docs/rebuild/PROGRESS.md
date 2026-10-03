# Rebuild Progress

Single source of truth for where the rebuild stands. Update after every workflow step.
Roadmap: [`docs/superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md`](../superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md)

## Now

- **Current part:** P0.3 Brand identity + design system
- **Step:** 2 — design: brand sheet approved; spec written (`docs/superpowers/specs/2026-10-03-p0-3-brand-design-system-design.md`), awaiting user review
- **Last done:** P0.2 merged (#11); hotfixes #5, #6, #8, #9, #10 and deploy fixes #7, #12, #13 all live (prod deploys verified).
- **Brand sheet:** https://claude.ai/artifact/4RHEHcqGxih3z9BDEPAUuY (logo, colour tokens, type, components — today vs refined)
- **Decisions (user, 2026-10-03):** refine the current look, do not redesign; must not look AI-made. Name: **Himmat / همّت** leads; "عصام الدين نصر للأدوات الكهربائية" and "المدير العام: رياض همت" as small labels. Audience: trade pros and households equally.
- **Next:** user reviews spec → writing-plans → build on `rebuild/p0-3-brand`

## Open decisions

- Brand (P0.3): refine-not-redesign agreed; awaiting feedback on the brand sheet.
- Vercel `DIRECT_URL` was a localhost value; user replaced it with the Neon unpooled string (2026-10-03).
- Real catalog export (P1): user runs read-only export script when P1.1 starts.

## Parts

Status: `todo` · `audit` · `design` · `build` · `test` · `review` · `done`

| ID | Part | Status | Branch / PR | Notes |
|---|---|---|---|---|
| P0.1 | Local dev environment | done | #3 | |
| P0.2 | Whole-app audit | done | #11 | hotfixes #5, #6, #8, #9, #10; deploy #7, #12, #13 |
| P0.3 | Brand identity + design system | design | `rebuild/p0-3-brand` | refine, don't redesign |
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
- 2026-10-03 — P0.1 merged (#3) with dependency audit (#4). P0.2 started; two live bugs split out as hotfix PRs #5, #6.
- 2026-10-03 — Prod deploy of P0.1 failed (P1002, migrate via pooler) → #7. Audit complete: 45 findings, hotfixes #8 (inactive login), #9 (product delete history), #10 (JSON-LD XSS); Lighthouse baseline recorded.
- 2026-10-03 — All P0.2 PRs merged and deployed; build migrations made robust (#12 fallback, #13 no advisory lock via pooler). P0.3 started: brand sheet (before/after) shared.
