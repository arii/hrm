#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables (order matters)
# 1. Load production overrides
if [ -f .env.production ]; then
  echo "Loading .env.production..."
  set -a
  source .env.production
  set +a
fi

# 2. Check for required secrets
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "❌ Error: NEXTAUTH_SECRET is not set!"
  exit 1
fi

echo "🚀 Starting HRM Production Server..."

# Exec ensures the node process replaces the shell
# allowing signals (SIGINT/SIGTERM) to reach the app
exec node dist/server.mjs
