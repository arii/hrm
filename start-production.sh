#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

if [ ! -f ".env.production" ]; then
  echo "[start-production] Warning: .env.production not found. Running without secrets (Spotify features disabled)." >&2
else
  # Export all variables defined in .env.production to child processes
  set -a
  source .env.production
  set +a
fi

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-production] Build artifacts missing. Running npm run build..."
  npm run build && npm run build:server
fi

exec node dist/server.mjs