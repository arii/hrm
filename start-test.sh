
#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=test
echo "[DEBUG] start-test.sh: NODE_ENV is $NODE_ENV"

if [ ! -f ".env.test" ]; then
  echo "[start-test] Warning: .env.test not found. Running without secrets (Spotify features disabled)." >&2
else
  # Export all variables defined in .env.test to child processes
  set -a
  source .env.test
  set +a
fi

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-test] Build artifacts missing. Running npm run build..."
  npm run build && npm run build:server
fi

echo "[DEBUG] start-test.sh: launching server with NODE_ENV=test"
NODE_ENV=test exec node dist/server.mjs
