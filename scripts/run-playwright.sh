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

if command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a npm exec playwright test -- --workers=1 --retries=1
else
  npm exec playwright test -- --workers=1 --retries=1
fi
