#!/bin/bash
# scripts/test-with-server.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PORT="${PORT:-3000}"
SERVER_URL="http://127.0.0.1:$PORT"
WAIT_ON_URL="$SERVER_URL/api/debug/ping"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120000}" # 120 seconds
TEST_COMMAND="$@"

# --- Helper Functions ---
cleanup() {
  echo "🛑 Shutting down server..."
  pnpm exec pm2 delete all || true
  pnpm exec pm2 kill || true
  echo "✅ Server shut down."
}

# Trap EXIT signal to run cleanup function
trap cleanup EXIT

# --- Main Script ---
echo "[test-with-server] 🔎 Finding an available port..."
# No need to find port, we use the one specified.
echo "[test-with-server] ✅ Using specified port: $PORT"

echo "[test-with-server] 🧹 Cleaning up any old PM2 processes..."
pnpm exec pm2 delete all || true
pnpm exec pm2 kill || true

echo "[test-with-server] 🚀 Starting server with PM2 on port $PORT..."
PORT=$PORT pnpm exec pm2 start ecosystem.config.cjs --env production
echo "[test-with-server] ✅ Server process started via PM2."

echo "[test-with-server] ⏳ Waiting up to ${WAIT_TIMEOUT}ms for $WAIT_ON_URL..."
pnpm exec wait-on "$WAIT_ON_URL" --timeout "$WAIT_TIMEOUT"

echo "[test-with-server] ✅ Server is ready. Executing test command: $TEST_COMMAND"
echo "[test-with-server] ---------------------------------------------------"
echo "[test-with-server] 🎯 Executing command: $TEST_COMMAND"

# Execute the test command
if ! $TEST_COMMAND; then
  echo "[test-with-server] ❌ Failure detected (Exit Code: $?)."
  echo "[test-with-server] --- Server Logs ---"
  pnpm exec pm2 logs --nostream
  echo "[test-with-server] -----------------------------------"
  exit 1
fi

echo "[test-with-server] ✅ Tests passed."
