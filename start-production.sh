#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

# 3. Restore PORT if it was preserved
if [ -n "$PRESERVED_PORT" ]; then
  export PORT=$PRESERVED_PORT
fi

# 2. Set production mode
export NODE_ENV=production

# 3. Check for required secrets
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "❌ Error: NEXTAUTH_SECRET is not set!"
  exit 1
fi

echo "🚀 Starting HRM Production Server..."

# Exec ensures the node process replaces the shell
# allowing signals (SIGINT/SIGTERM) to reach the app
exec node -r tsconfig-paths/register dist/server.mjs
