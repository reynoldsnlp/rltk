#!/usr/bin/env bash
set -euox pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/playwright ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

if [ ! -d "${HOME}/.cache/ms-playwright" ]; then
  npx playwright install --with-deps chromium
fi

./scripts/preflight-offscreen-resources.sh

# Kill any process left over from a previous interrupted run that is still
# holding port 19876 open. Without this, reuseExistingServer would silently
# reuse the hung process and all page.goto() calls would time out.
lsof -ti tcp:19876 | xargs kill 2>/dev/null || true

# Let playwright.config.js govern workers and retries (CI: 1 worker / 2 retries;
# local: 4 workers / 0 retries). Pass extra args through with "$@" so callers can
# still override, e.g. `npm run test -- --workers=2`.
if command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a npm exec playwright test -- "$@"
else
  npm exec playwright test -- "$@"
fi
