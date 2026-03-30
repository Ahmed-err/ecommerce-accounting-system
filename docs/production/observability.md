# Observability & Incident Readiness

## Minimum Monitoring
- Application 5xx rate and p95 latency
- Database connection saturation and slow queries
- Checkout success/failure ratio
- Email/SMS sending failures
- Notification stream failure/reconnect rates

## Logging Requirements
- Include request id/correlation id for order and auth flows.
- Redact secrets and PII in logs.
- Keep actionable context: route, user role, action name, error class.

## Alerts
- 5xx > 2% over 10 minutes
- Checkout failures > 5% over 10 minutes
- DB connection pool > 85% for 5 minutes
- Health endpoint down for 2 checks

## Wiring
- Set `ERROR_TRACKING_WEBHOOK_URL` (or `SENTRY_WEBHOOK_URL`) for exception ingestion.
- Set `ALERT_WEBHOOK_URL` for alert delivery.
- Optional threshold overrides:
  - `ALERT_5XX_RATE_PCT` (default `2`)
  - `ALERT_CHECKOUT_FAILURE_RATE_PCT` (default `5`)
  - `ALERT_DB_SATURATION_PCT` (default `85`)

## Emitted Events
- `checkout_success` / `checkout_failure` from `src/app/actions/catalog.js`
- `pos_checkout_success` / `pos_checkout_failure` from `src/app/actions/pos.js`
- `healthcheck_failed` from `src/app/api/health/route.js`

## Incident Workflow
1. Acknowledge alert and assign owner.
2. Check `/api/health` and recent deploy diff.
3. If customer-impacting, rollback to last stable release.
4. Publish incident summary and follow-up fixes.
