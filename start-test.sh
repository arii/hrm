#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=${NODE_ENV:-test}
echo "[DEBUG] start-test.sh: NODE_ENV is ${NODE_ENV}"

# Check for .env.test and load it if it exists
if [ -f ".env.test" ]; then
  echo "[start-test] Loading .env.test"
  set -a
  source .env.test
  set +a
else
  echo "[start-test] Warning: .env.test not found. Running without secrets (Spotify features disabled)."
fi

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-test] Build artifacts missing. Running npm run build..."
  npm run build && npm run build:server
fi

echo "[DEBUG] start-test.sh: launching server with NODE_ENV=${NODE_ENV}"
exec node dist/server.mjs
