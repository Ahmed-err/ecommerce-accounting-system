## E-Commerce Accounting System

Electrical supplies e-commerce platform with ERP modules, built with Next.js (App Router), Prisma, and PostgreSQL.

## Documentation

- Training guide (AR/EN): `docs/TRAINING_GUIDE_AR_EN.md`
- Full system reference (AR/EN): `docs/SYSTEM_REFERENCE_AR_EN.md`
- Agent coding guidelines: `AGENTS.md`

## Getting Started

See [`docs/development.md`](docs/development.md): `npm ci --legacy-peer-deps && npm run setup:local && npm run dev`.

## Quality & Production Commands

```bash
npm run lint
npm run build -- --webpack
npm run audit:deps
SMOKE_BASE_URL="https://your-domain.com" npm run smoke
PERF_BASE_URL="https://your-domain.com" npm run perf:baseline
```

## Production Readiness Docs

- `docs/production/security-audit.md`
- `docs/production/performance-audit.md`
- `docs/production/performance-report-template.md`
- `docs/production/go-live-checklist.md`
- `docs/production/observability.md`
- `docs/production/data-reliability.md`
- `docs/production/auth-audit-matrix.md`
- `docs/production/launch-status.md`
- `docs/production/backup-restore-drill.md`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
