#!/bin/bash
# scripts/test-with-server.sh
# Handles starting the server, waiting for it, running tests, and cleaning up.
# Ensures exit codes are propagated correctly.

set -e

# Configuration
TIMEOUT=120000 # Increased timeout for slower CI environments
SERVER_LOG="/tmp/hrm-server.log"
HEALTH_CHECK_URL_TEMPLATE="http://127.0.0.1:{{PORT}}/api/debug/ping"

# Helper for logging to stderr (so it doesn't interfere with stdout piping)
log() {
    echo "[test-with-server] $@" >&2
}

cleanup() {
    EXIT_CODE=$?
    log "🛑 Shutting down server..."
    
    if [ $EXIT_CODE -ne 0 ]; then
        log "❌ Failure detected (Exit Code: $EXIT_CODE)."
        if [ -f "$SERVER_LOG" ]; then
            log "--- Server Logs (Tail 50 lines) ---"
            tail -n 50 "$SERVER_LOG" >&2
            log "-----------------------------------"
        else
            log "No server log found at $SERVER_LOG"
        fi
    fi
    
    pnpm pm2 kill || true
    exit $EXIT_CODE
}

# Trap signals for cleanup
trap cleanup EXIT INT TERM

# Use pre-configured port or dynamically find an available one
if [ -z "$PORT" ]; then
  log "🔎 Finding an available port..."
  PORT=$(node scripts/get-available-port.mjs)
  if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
      log "❌ Failed to get a valid port. Exiting."
      exit 1
  fi
  log "✅ Found available port: $PORT"
else
  log "✅ Using pre-configured port: $PORT"
fi

# Export environment variables for testing
export PORT
export NEXTAUTH_SECRET="test-secret-for-ci"
export NEXTAUTH_URL="http://127.0.0.1:$PORT"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL_TEMPLATE/\{\{PORT\}\}/$PORT}"

# Clean up any stale PM2 processes
log "🧹 Cleaning up any old PM2 processes..."
pnpm pm2 kill || true

log "🛠️ Building the application..."
pnpm run build
export TESTING=true

log "🚀 Starting server with PM2 on port $PORT..."
# Start server with `pnpm start`, which uses PM2
# The PORT variable is passed via ecosystem.config.cjs
pnpm start > "$SERVER_LOG" 2>&1 &
log "✅ Server process started via PM2."

log "⏳ Waiting up to ${TIMEOUT}ms for $HEALTH_CHECK_URL..."
if ! npx wait-on "$HEALTH_CHECK_URL" --timeout $TIMEOUT; then
    log "❌ Server failed to respond within timeout."
    exit 1
fi

log "✅ Server is ready. Executing test command: $@"
log "---------------------------------------------------"

# Execute the passed command
log "🎯 Executing command: $*"
"$@"
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  log "⚠️ Test command failed with exit code: $TEST_EXIT_CODE"
  log "📋 Last 20 lines of test output may be in stdout above"
else
  log "✅ Test command completed successfully"
fi

exit $TEST_EXIT_CODE
