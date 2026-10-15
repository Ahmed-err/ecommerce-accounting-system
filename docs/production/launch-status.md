# Launch Status (2026-10-16)

The rebuild (P0–P3) is merged and live on **www.himmat.store**. This replaces the March 2026 snapshot.

## Checked (P4.1, 2026-10-16)

- **Live, signed out:** home, products, product, cart, checkout, login, about, contact, terms, privacy, sitemap, robots: 200 in 0.4–1.0 s. `/api/health` → `{ ok: true }`. `npm run smoke` against production passes. Admin pages and `/pos` redirect to login; `/api/backup` → 401.
- **Headers:** HSTS (2 years), CSP, `X-Frame-Options: SAMEORIGIN`, `nosniff`, referrer and permissions policies. `X-Powered-By` removed.
- **Server actions:** every exported action checks the caller unless it is on the explicit public list (catalog reads, contact form, sign-up, password reset, order tracking, coupon preview, review submit); enforced by `tests/unit/security/server-actions-auth.test.ts`. Fixed: notification helpers were public endpoints (#39).
- **Browser bundles** can't import the database (`tests/unit/security/client-imports.test.ts`).
- **Public product data** never includes cost price or supplier.
- **CI on every PR:** lint, build, bundle check, dependency audit, unit (641 tests), e2e, screenshots.

## Known, accepted

- A missing product URL answers 200 with a "not found" page marked `noindex` (the loading screen starts the response before the page knows). Search engines drop it.
- Pages are rendered per request (language cookie); response times above are without a CDN cache.

## Needs the owner

See `go-live-checklist.md`.
