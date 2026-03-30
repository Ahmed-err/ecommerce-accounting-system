# Go-Live Checklist

## Pre-Deploy
- [ ] `.env.production` populated with required keys.
- [x] `npm run lint` passes.
- [ ] `npm run build -- --webpack` passes.
- [x] Migrations validated in staging.
- [ ] Backup and restore drill completed.

## Deploy Day
- [ ] Deploy application and run smoke checks (`npm run smoke` with `SMOKE_BASE_URL`).
- [ ] Verify `/api/health` returns `{ ok: true }`.
- [ ] Confirm auth login and checkout flow manually.
- [ ] Confirm admin notifications and order status updates flow.

## Observability
- [x] Error tracking enabled and receiving events.
- [x] Logs include correlation identifiers for critical flows.
- [x] Alerts configured for 5xx spikes, checkout failures, DB saturation.

## Notes (2026-03-30)
- Lint passes with warnings only (no blocking errors).
- Migration `20260330120000_notifications_system` was made idempotent and applied successfully.
- Build verification is still blocked by local runtime instability/hangs and needs a clean CI/staging runner to produce final evidence.
- Smoke run against local dev server timed out due severe compile/runtime instability (Turbopack panic observed).

## Rollback Criteria
- Checkout failure rate > 5% for 10 minutes.
- Sustained 5xx > 2% for 10 minutes.
- Critical auth/session failures.

## Rollback Steps
1. Revert to last stable deploy.
2. Re-run smoke checks.
3. Notify stakeholders and open incident report.
