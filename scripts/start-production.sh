#!/bin/bash
# Production server startup script
# Used by PM2, Docker, or manual deployment
# Ensures the process runs from the project root regardless of where script is called from

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Resolve project root as an absolute path (script is in /scripts, parent is root)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT" || {
  echo "❌ Failed to change to project root: $PROJECT_ROOT"
  exit 1
}

echo "🚀 Starting production server from $(pwd)..."

export NODE_ENV=production

# Load secrets strictly for the process scope
if [ -f .env.production ]; then
  echo "📄 Loading .env.production..."
  set -a
  source .env.production
  set +a
fi

# Verify critical files exist before starting
if [ ! -f "$PROJECT_ROOT/server.js" ]; then
  echo "❌ ERROR: server.js not found"
  echo "   Expected: $PROJECT_ROOT/server.js"
  echo "   Current dir: $(pwd)"
  echo "   Directory listing:"
  ls -la "$PROJECT_ROOT" | head -20
  exit 1
fi

echo "✅ All critical files verified"

# Explicitly run the compiled server entry point from project root
exec node "$PROJECT_ROOT/server.js"
