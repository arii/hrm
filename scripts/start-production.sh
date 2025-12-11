#!/bin/bash
# scripts/start-production.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure the script is run from the project root
cd "$(dirname "$0")/.."

# Source production environment variables if the file exists
if [ -f .env.production ]; then
  echo "[start-production.sh] Sourcing .env.production"
  set -a
  source .env.production
  set +a
fi

# Execute the standalone server entry point
echo "[start-production.sh] Starting server with: node dist/server.mjs"
exec node dist/server.mjs
