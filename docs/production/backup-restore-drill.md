# Backup & Restore Drill Evidence

## Objective
Prove that backups can be restored within agreed RTO/RPO before production go-live.

## Required Inputs
- `DATABASE_URL` for source database
- `STAGING_RESTORE_DATABASE_URL` for isolated restore target
- `pg_dump` and `pg_restore` binaries available in runner

## Drill Steps
1. Take logical backup:
   - `pg_dump --format=custom --file=backup.dump "$DATABASE_URL"`
2. Restore into staging target:
   - `pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$STAGING_RESTORE_DATABASE_URL" backup.dump`
3. Validate critical flows on restored DB:
   - login
   - product listing
   - checkout write path
   - admin orders
4. Record timing:
   - backup start/end
   - restore start/end
   - validation start/end

## Evidence Log
- Drill date:
- Operator:
- Backup duration:
- Restore duration:
- RTO met (Y/N):
- RPO met (Y/N):
- Validation result:
- Follow-up actions:
