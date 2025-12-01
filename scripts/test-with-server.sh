#!/bin/bash
# scripts/test-with-server.sh
# Handles starting the server, waiting for it, running tests, and cleaning up.
# Ensures exit codes are propagated correctly.

set -e

# Configuration
TIMEOUT=60000
SERVER_LOG="/tmp/hrm-server.log"
PID_FILE="/tmp/hrm-server.pid"
HEALTH_CHECK_URL="http://127.0.0.1:3000/api/debug/ping"

# Helper for logging to stderr (so it doesn't interfere with stdout piping)
log() {
    echo "[test-with-server] $@" >&2
}

cleanup() {
    EXIT_CODE=$?
    log "🛑 Shutting down server (PID: $SERVER_PID)..."
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    rm "$PID_FILE" 2>/dev/null || true

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

# Ensure all previous processes are killed
bash "$(dirname "$0")/kill-all.sh"

# Export environment variable for testing
export TESTING=true

# Clean up any stale processes
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
        log "⚠️  Killing existing server (PID: $PID)..."
        kill $PID 2>/dev/null || true
    fi
    rm "$PID_FILE"
fi

log "🚀 Starting server..."
# Start server in background, redirecting output to log file
bash start-production.sh > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"
log "✅ Server process started (PID: $SERVER_PID)"

log "⏳ Waiting up to ${TIMEOUT}ms for $HEALTH_CHECK_URL..."
if ! npx wait-on "$HEALTH_CHECK_URL" --timeout $TIMEOUT; then
    log "❌ Server failed to respond within timeout."
    exit 1
fi

log "✅ Server is ready. Executing test command: $@"
log "---------------------------------------------------"

# Execute the passed command
"$@"
