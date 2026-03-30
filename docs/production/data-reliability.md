# Data Reliability Runbook

## Migration Safety
- Run migrations in staging first:
  - `npx prisma migrate deploy`
- Verify all critical tables and indexes exist after deploy.
- Keep rollback SQL per release for destructive schema changes.

## Backup Policy
- Full backup daily, incremental every 15 minutes.
- Retention: 30 days hot, 90 days cold.
- Encrypt backups at rest and in transit.

## Restore Drill
- Restore latest backup to staging once per week.
- Validate:
  - user login
  - product catalog load
  - checkout write path
  - admin order view

## Concurrency Checks
- Order placement and stock updates must remain transaction-safe.
- Re-run load tests after any inventory/order logic changes.
