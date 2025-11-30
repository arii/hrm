#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Variables are now injected by PM2 from ecosystem.config.js.
# This script's responsibility is now just to build and execute the server.

# Set a default NODE_ENV if it's not already set by PM2
export NODE_ENV="${NODE_ENV:-production}"

echo "[start-production] Starting server..."
echo "Environment: NODE_ENV=$NODE_ENV"
echo "Port: $PORT"
echo "NextAuth URL: $NEXTAUTH_URL"

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-production] Build artifacts missing. Running pnpm run build..."
  pnpm run build && pnpm run build:server
fi

# Ensure AUTH_TRUST_HOST is set for NextAuth
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=true

exec node dist/server.mjs