#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=production

# Load test environment variables
if [ -f "scripts/.env.test" ]; then
  set -a
  source "scripts/.env.test"
  set +a
else
  echo "[start-test] Error: scripts/.env.test not found!" >&2
  exit 1
fi

# Ensure build artifacts exist
if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
  echo "[start-test] Build artifacts missing. Running npm run build..."
  npm run build
fi

# Ensure AUTH_TRUST_HOST is set for NextAuth
export AUTH_TRUST_HOST=true
export NEXTAUTH_TRUST_HOST=true

exec node dist/server.mjs
