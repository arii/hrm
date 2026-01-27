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
# Use absolute paths for clarity in error messages
if [ ! -f "$PROJECT_ROOT/dist/server.js" ]; then
  echo "❌ ERROR: dist/server.js not found"
  echo "   Expected: $PROJECT_ROOT/dist/server.js"
  echo "   Current dir: $(pwd)"
  echo "   Directory listing:"
  ls -la "$PROJECT_ROOT" | head -20
  exit 1
fi

if [ ! -d "$PROJECT_ROOT/.next_prod" ]; then
  echo "❌ ERROR: .next_prod directory not found"
  echo "   Expected: $PROJECT_ROOT/.next_prod"
  echo "   Current dir: $(pwd)"
  echo "   Directory listing:"
  ls -la "$PROJECT_ROOT" | grep -E "^\." | head -20
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/.next_prod/BUILD_ID" ]; then
  echo "❌ ERROR: .next_prod/BUILD_ID not found"
  echo "   Expected: $PROJECT_ROOT/.next_prod/BUILD_ID"
  echo "   .next_prod directory contents:"
  ls -la "$PROJECT_ROOT/.next_prod" 2>/dev/null || echo "   .next_prod directory does not exist"
  exit 1
fi

echo "✅ All critical files verified"
echo "🎯 Next.js Build ID: $(cat "$PROJECT_ROOT/.next_prod/BUILD_ID")"

# Explicitly run the compiled server entry point from project root
# The dist/server.js file expects to find .next in the same directory
exec node "$PROJECT_ROOT/dist/server.js"
