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
    pnpm pm2 kill || true

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
export TESTING=true
export NEXTAUTH_SECRET="test-secret-for-ci"
export NEXTAUTH_URL="http://127.0.0.1:$PORT"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL_TEMPLATE/\{\{PORT\}\}/$PORT}"

log "🚀 Starting server on port $PORT..."
# Start server with `pnpm start`
pnpm start > "$SERVER_LOG" 2>&1 &
log "✅ Server process started."

log "⏳ Waiting up to ${TIMEOUT}ms for $HEALTH_CHECK_URL..."
if ! npx wait-on "$HEALTH_CHECK_URL" --timeout $TIMEOUT; then
    log "❌ Server failed to respond within timeout."
    exit 1
fi

log "✅ Server is ready. Waiting an additional 30 seconds for services to initialize..."
sleep 30

log "✅ Executing test command: $@"
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
