#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

if [ -f ".env.production" ]; then
  echo "[start-production] Loading .env.production"
  set -a
  source .env.production
  set +a
elif [ -f ".env.local" ]; then
  echo "[start-production] Warning: .env.production not found. Loading .env.local as fallback."
  set -a
  source .env.local
  set +a
else
  echo "[start-production] Warning: No env file found. Running without secrets." >&2
fi

# Debug: Show critical env vars
echo "Environment: NODE_ENV=$NODE_ENV"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
if [ -n "$SPOTIFY_CALLBACK_URL" ]; then
  echo "SPOTIFY_CALLBACK_URL: $SPOTIFY_CALLBACK_URL"
fi
echo "AUTH_TRUST_HOST: $AUTH_TRUST_HOST"
echo "Hostname: ${HOST:-0.0.0.0}, Port: ${PORT:-3000}"

if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-production] Build artifacts missing. Running pnpm run build..."
  pnpm run build && pnpm run build:server
fi

# Ensure AUTH_TRUST_HOST is set for NextAuth
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=true

exec node dist/server.mjs