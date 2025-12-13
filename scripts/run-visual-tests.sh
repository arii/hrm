#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

PORT="${PORT:-3000}"

# Check if server is already running on the configured port
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Server already running on port ${PORT}, using existing instance"
    SERVER_WAS_RUNNING=true
else
    echo "🚀 Starting production server for tests on port ${PORT}..."
    SERVER_WAS_RUNNING=false
    
    # Build if needed
    if [ ! -f "dist/server.mjs" ] || [ ! -d ".next" ]; then
        echo "📦 Building application..."
        pnpm run build:server
    fi
    
    # Start server in background
    # Export PORT so start-production.sh (or node) picks it up
    export PORT
    bash start-production.sh > /tmp/hrm-server-test.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > /tmp/hrm-server-test.pid
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "✅ Server is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Server failed to start within 30 seconds"
            cat /tmp/hrm-server-test.log
            exit 1
        fi
        sleep 1
    done
fi

# Run Playwright tests
echo "🧪 Running visual regression tests..."
npx playwright test "$@"
TEST_EXIT_CODE=$?

# Cleanup: Only kill server if we started it
if [ "$SERVER_WAS_RUNNING" = false ]; then
    echo "🧹 Stopping test server..."
    if [ -f /tmp/hrm-server-test.pid ]; then
        kill $(cat /tmp/hrm-server-test.pid) 2>/dev/null || true
        rm /tmp/hrm-server-test.pid
    fi
fi

exit $TEST_EXIT_CODE
