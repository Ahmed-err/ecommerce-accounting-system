# Launch Status Snapshot

## Completed
- Security headers and CSP hardened in `next.config.mjs`.
- Environment validation added via `src/lib/env.js`.
- Upload allowlist + checkout rate limiting in place.
- Notifications authz/user scoping implemented.
- Health endpoint added with DB timeout guard.
- CI workflow and smoke/perf scripts added.
- Auth/role route protection in `src/proxy.js` with structured request logging.
- External error/alert webhook integration added via `src/lib/monitoring.js` and wired into checkout/POS/health paths.
- Correlation-aware logging is active through `src/lib/logger.js` and request IDs in middleware/health route.
- Notifications migration fixed for idempotency and applied (`20260330120000_notifications_system`).

## Partially Completed
- Dependency remediation is now closed:
  - Upgraded `next` to `16.2.1`
  - Removed vulnerable `next-pwa` chain and replaced with custom service worker (`public/sw.js`)
  - `npm audit --audit-level=high` now reports `0 vulnerabilities`
- Build/smoke verification is still unstable on this local session due long-running runtime hangs and Turbopack runtime panics.

## Remaining Before Production
1. Run staging backup + restore drill and record evidence.
2. Set production webhook/provider values (`ERROR_TRACKING_WEBHOOK_URL`, `ALERT_WEBHOOK_URL`) and confirm event ingestion in external platform.
3. Execute full go-live rehearsal checklist with rollback simulation.
4. Complete stable build/smoke in clean environment and attach evidence.

## Immediate Go/No-Go
- **No-Go** until restore-drill evidence and clean build/smoke verification are closed in a stable runner.
