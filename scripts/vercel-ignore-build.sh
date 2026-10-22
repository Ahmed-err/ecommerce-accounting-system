#!/usr/bin/env sh
# Vercel "Ignored Build Step": exit 0 skips the deployment, exit 1 builds it.
# Skips commits that only touch docs, tests, CI config or Markdown, which cannot change the
# deployed site, to save build minutes. Production (main) always builds.

if [ "$VERCEL_ENV" = "production" ]; then
  echo "vercel-ignore-build: production deploy, building."
  exit 1
fi

# No previous commit to compare with (first deploy or a very shallow clone): build.
if ! git rev-parse --verify --quiet HEAD^ >/dev/null; then
  echo "vercel-ignore-build: no parent commit, building."
  exit 1
fi

if git diff --quiet HEAD^ HEAD -- . ':(exclude)docs' ':(exclude)tests' ':(exclude).github' ':(exclude)*.md' ':(exclude)perf-report-after-fix.json'; then
  echo "vercel-ignore-build: only docs, tests or CI files changed, skipping this preview."
  exit 0
fi

echo "vercel-ignore-build: app files changed, building."
exit 1
