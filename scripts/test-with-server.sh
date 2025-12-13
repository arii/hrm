#!/bin/bash
# scripts/test-with-server.sh
# Handles starting the server, waiting for it, running tests, and cleaning up.
# Ensures exit codes are propagated correctly.

set -e

# Configuration
PORT=$(node scripts/get-available-port.mjs)
export PORT
TIMEOUT=90000
SERVER_LOG="/tmp/hrm-server.log"
PID_FILE="/tmp/hrm-server.pid"
HEALTH_CHECK_URL="http://127.0.0.1:${PORT}/api/debug/ping"

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
            log "--- Server Startup Logs (Tail 50 lines) ---"
            tail -n 50 "$SERVER_LOG" >&2
            log "-------------------------------------------"
        else
            log "No server startup log found at $SERVER_LOG"
        fi

        log "--- PM2 Application Logs (Tail 100 lines) ---"
        # Try to show logs from the specific app, fallback to all if name fails
        # Using direct file access is more reliable if PM2 daemon is dead,
        # but PM2 command is better if alive. We try PM2 command first.
        pnpm pm2 logs hrm-server --lines 100 --nostream >&2 || tail -n 100 ~/.pm2/logs/*.log >&2 2>/dev/null || echo "Could not retrieve PM2 logs" >&2
        log "---------------------------------------------"
    fi
    exit $EXIT_CODE
}

# Trap signals for cleanup
trap cleanup EXIT INT TERM

# Export environment variable for testing
export TESTING=true
export NEXTAUTH_SECRET="test-secret-for-ci"
export NEXTAUTH_URL="http://127.0.0.1:${PORT}"

# Ensure build exists
if [ ! -f "dist/server.mjs" ]; then
    log "📦 Build artifact not found. Building server..."
    pnpm run build:server
fi

# Clean up any stale PM2 processes
log "🧹 Cleaning up any old PM2 processes..."
pnpm pm2 kill || true


log "🚀 Starting server with PM2 on port ${PORT}..."
# Start server with `pnpm start`, which uses PM2
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
