#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PERF_TEST_FILE="tests/playwright/performance.spec.ts"
SERVER_LOG="logs/frontend-perf-server.log"
PORT="${PORT:-3000}"

# --- Cleanup Function ---
cleanup() {
  echo ""
  echo "🧹 Cleaning up Frontend Profiling environment..."
  echo "   - Stopping PM2 server..."
  pnpm run pm2:stop 2>/dev/null || true
  pnpm run pm2:delete 2>/dev/null || true
}

# Register the cleanup trap
trap cleanup EXIT INT

# --- Setup ---
echo "📈 Starting Frontend Performance Profiling..."
echo "------------------------------------------"

# 1. Create log directory
mkdir -p $(dirname "$SERVER_LOG")
rm -f "$SERVER_LOG"

# 2. Build for production
echo "   - Building application for production..."

# Ensure NEXTAUTH_SECRET is set for production build/run
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "   - Generating temporary NEXTAUTH_SECRET for profiling..."
  export NEXTAUTH_SECRET=$(openssl rand -base64 32)
fi

NODE_ENV=production pnpm run build

# 3. Start the server in the background
echo "   - Starting production server in the background..."
# Use pnpm start which uses pm2
# Ensure PORT is exported for PM2 to pick it up (via ecosystem.config.cjs)
export PORT
pnpm start > "$SERVER_LOG" 2>&1 &
# We don't need to track PID for PM2, we use pm2 commands to stop it

echo "   - Server running..."

# Wait for the server to be ready
echo "   - Waiting for server to become available at http://127.0.0.1:${PORT}..."
pnpm exec wait-on "http://127.0.0.1:${PORT}" -t 30000 # 30-second timeout

# --- Execution ---
echo "   - Running Playwright performance test..."
pnpm exec playwright test "$PERF_TEST_FILE"

# --- Completion ---
echo "------------------------------------------"
echo "✅ Frontend Profiling Finished!"
echo "   - Server logs can be found in: $SERVER_LOG"
echo "------------------------------------------"
