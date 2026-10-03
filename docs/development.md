# Local development

## First run

Requirements: Node 20+, PostgreSQL server binaries (`sudo apt install postgresql` on Debian/Kali; no service needs to run).

    npm ci --legacy-peer-deps
    npm run setup:local
    npm run dev

`setup:local` starts a private Postgres in `.dev/pg` on port 55432, creates `.env` from `.env.example` (with a random `AUTH_SECRET`), applies migrations, and seeds demo data. Running it again is safe.

## Logins (local only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@powerstore.com | admin123 |
| Manager | manager@powerstore.com | manager123 |
| Cashier | cashier@powerstore.com | cashier123 |
| Customer | customer@example.com | customer123 |

## Database commands

    npm run db:local -- start | stop | status | reset
    npx prisma db seed        # wipe and reseed (local databases only)

The seed refuses to run against any non-local host, in production, or on Vercel. To seed a disposable remote database, list its host in `SEED_ALLOWED_HOSTS`.

## Tests

    npx vitest run            # unit + integration (uses DATABASE_TEST_URL → store_test)
    npm run test:e2e          # Playwright; needs `npm run dev` running
