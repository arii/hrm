#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PERF_TEST_FILE="tests/playwright/performance.spec.ts"
SERVER_LOG="logs/frontend-perf-server.log"
SERVER_PID=""

# --- Cleanup Function ---
cleanup() {
  echo ""
  echo "🧹 Cleaning up Frontend Profiling environment..."
  if [ -n "$SERVER_PID" ]; then
    echo "   - Stopping background server (PID: $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
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
NODE_ENV=production pnpm run build

# 3. Start the server in the background
echo "   - Starting production server in the background..."
# Bypass PM2 and run the start script directly
bash ./start-production.sh > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "   - Server running with PID: $SERVER_PID"

# Wait for the server to be ready
echo "   - Waiting for server to become available..."
pnpm exec wait-on http://127.0.0.1:3000 -t 30000 # 30-second timeout

# --- Execution ---
echo "   - Running Playwright performance test..."
pnpm exec playwright test "$PERF_TEST_FILE"

# --- Completion ---
echo "------------------------------------------"
echo "✅ Frontend Profiling Finished!"
echo "   - Server logs can be found in: $SERVER_LOG"
echo "------------------------------------------"
