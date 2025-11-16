#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

if [ ! -f ".env.production" ]; then
  echo "[start-production] Error: .env.production not found. Create it before running npm start." >&2
  exit 1
fi

# Export all variables defined in .env.production to child processes
set -a
source .env.production
set +a

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-production] Build artifacts missing. Running npm run build..."
  npm run build
fi

exec node dist/server.mjs