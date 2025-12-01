#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

# Only source the .env file if critical variables aren't already set
if [ -z "$NEXTAUTH_SECRET" ]; then
  if [ ! -f ".env.production" ]; then
    echo "[start-production] Warning: .env.production not found and NEXTAUTH_SECRET not set. Running without secrets." >&2
  else
    set -a
    source .env.production
    set +a
  fi
fi


if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-production] Build artifacts missing. Running pnpm run build..."
  pnpm run build && pnpm run build:server
fi

# Ensure AUTH_TRUST_HOST is set for NextAuth
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=true

exec node dist/server.mjs
