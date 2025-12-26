#!/bin/bash
# Used by PM2 or Docker entrypoints

# Set working directory to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

export NODE_ENV=production

# Load secrets strictly for the process scope
if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
fi

# Explicitly run the compiled server entry point
# Ensure your build:server script outputs to dist/server.mjs or dist/server.js
exec node dist/server.js
