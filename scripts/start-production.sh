#!/bin/bash
# Used by PM2 or Docker entrypoints

# Set working directory to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Initialize NVM if it exists (for systems where Node is managed by NVM)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

# Load environment variables (order matters)
# 1. Preserve PORT if it's already set in the environment
PRESERVED_PORT=$PORT

# 2. Load production overrides
if [ -f .env.production ]; then
  echo "Loading .env.production..."
  set -a
  source .env.production
  set +a
fi

# Explicitly run the compiled server entry point
# Ensure your build:server script outputs to dist/server.mjs or dist/server.js
exec node dist/server.js
