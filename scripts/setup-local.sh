#!/usr/bin/env sh
# One-command local setup: database, .env, migrations, seed.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

sh scripts/dev-db.sh start

if [ -f .env ]; then
  echo "setup: keeping existing .env"
else
  secret=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))")
  sed "s|replace-with-random-secret|$secret|" .env.example > .env
  echo "setup: created .env from .env.example"
fi

npx prisma migrate deploy
npx prisma db seed
echo "setup: done. Run 'npm run dev' and open http://localhost:3000"
