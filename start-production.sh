#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

# Store original environment variables that might be overridden
ORIGINAL_PORT="$PORT"
ORIGINAL_HOST="$HOST"
ORIGINAL_NODE_ENV="$NODE_ENV"
ORIGINAL_NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

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

# Restore critical production values
export NODE_ENV=production

# Restore original PORT and HOST if they were set
if [ -n "$ORIGINAL_PORT" ]; then
  export PORT="$ORIGINAL_PORT"
  echo "[start-production] Using PORT=$PORT from environment"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "[start-production] ENCRYPTION_KEY not set. Generating a temporary one."
  export ENCRYPTION_KEY=$(openssl rand -hex 32)
fi

if [ -n "$ORIGINAL_HOST" ]; then
  export HOST="$ORIGINAL_HOST"
  echo "[start-production] Using HOST=$HOST from environment"
fi

if [ -n "$ORIGINAL_NEXTAUTH_SECRET" ]; then
  export NEXTAUTH_SECRET="$ORIGINAL_NEXTAUTH_SECRET"
  echo "[start-production] Using NEXTAUTH_SECRET from environment"
fi

# Debug: Show critical env vars
echo "Environment: NODE_ENV=$NODE_ENV"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
if [ -n "$SPOTIFY_CALLBACK_URL" ]; then
  echo "SPOTIFY_CALLBACK_URL: $SPOTIFY_CALLBACK_URL"
fi
echo "AUTH_TRUST_HOST: $AUTH_TRUST_HOST"
echo "Hostname: ${HOST:-0.0.0.0}, Port: ${PORT:-3000}"

if [ ! -f "dist/server.mjs" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo "[start-production] Build artifacts missing. Running pnpm run build..."
  pnpm run build && pnpm run build:server
fi

# Ensure AUTH_TRUST_HOST is set for NextAuth
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=true

exec node dist/server.mjs