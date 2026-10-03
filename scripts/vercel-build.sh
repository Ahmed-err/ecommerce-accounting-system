#!/usr/bin/env sh
# Vercel build: apply Prisma migrations on Production only, then Next.js build.
# Required in Vercel: Settings → Environment Variables → DATABASE_URL (Neon pooled connection string, used by the app).
# Recommended: DIRECT_URL (Neon unpooled string) — prisma.config.ts uses it for migrations, which fail
# intermittently with P1002 (advisory lock timeout) through the pooler.

set -e

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "vercel-build.sh: DATABASE_URL is missing for Production."
    echo "  Vercel → Project → Settings → Environment Variables"
    echo "  Add DATABASE_URL from Neon → your branch → Connection string (use the pooled URI for the app)."
    echo ""
    exit 1
  fi
  echo "vercel-build.sh: prisma migrate deploy (production)…"
  npx prisma migrate deploy
else
  echo "vercel-build.sh: skipping migrate (VERCEL_ENV=${VERCEL_ENV:-unset}; only production runs migrations)."
fi

exec npm run build
