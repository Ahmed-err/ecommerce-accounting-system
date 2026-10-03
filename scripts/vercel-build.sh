#!/usr/bin/env sh
# Vercel build: apply Prisma migrations on Production only, then Next.js build.
# Required in Vercel: Settings → Environment Variables → DATABASE_URL (Neon pooled connection string, used by the app).
# Recommended: DIRECT_URL (Neon unpooled string) — prisma.config.ts uses it for migrations, which fail
# intermittently with P1002 (advisory lock timeout) through the pooler.

set -e

MIGRATE_ATTEMPTS="${MIGRATE_ATTEMPTS:-3}"
MIGRATE_RETRY_DELAY="${MIGRATE_RETRY_DELAY:-10}"

# Retries cover Neon cold starts and pooler lock timeouts (P1002).
migrate_with_retries() {
  attempt=1
  while [ "$attempt" -le "$MIGRATE_ATTEMPTS" ]; do
    if npx prisma migrate deploy; then return 0; fi
    echo "vercel-build.sh: migrate deploy failed (attempt $attempt/$MIGRATE_ATTEMPTS)."
    attempt=$((attempt + 1))
    [ "$attempt" -le "$MIGRATE_ATTEMPTS" ] && sleep "$MIGRATE_RETRY_DELAY"
  done
  return 1
}

# prisma.config.ts prefers DIRECT_URL. If it is missing, wrong or unreachable, fall back
# to the pooled DATABASE_URL so a bad DIRECT_URL cannot block every deploy.
migrate_with_fallback() {
  if [ -n "$DIRECT_URL" ]; then
    echo "vercel-build.sh: prisma migrate deploy over DIRECT_URL…"
    if migrate_with_retries; then return 0; fi
    echo "vercel-build.sh: DIRECT_URL failed; check it is Neon's unpooled string. Falling back to DATABASE_URL…"
  fi
  (DIRECT_URL="" && export DIRECT_URL && migrate_with_retries)
}

if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "vercel-build.sh: DATABASE_URL is missing for Production."
    echo "  Vercel → Project → Settings → Environment Variables"
    echo "  Add DATABASE_URL from Neon → your branch → Connection string (use the pooled URI for the app)."
    echo ""
    exit 1
  fi
  if ! migrate_with_fallback; then
    echo "vercel-build.sh: prisma migrate deploy failed over every connection; aborting build."
    exit 1
  fi
else
  echo "vercel-build.sh: skipping migrate (VERCEL_ENV=${VERCEL_ENV:-unset}; only production runs migrations)."
fi

exec npm run build
