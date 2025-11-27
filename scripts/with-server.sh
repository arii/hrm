#!/bin/bash
# scripts/with-server.sh

# 1. Start the server in production mode in the background
# We assume start-production.sh is in the root, so we go up one level if running from scripts/
# or assume this script is run from project root. Let's assume project root execution.
echo "🚀 Starting production server..."
bash start-production.sh > /tmp/hrm-server.log 2>&1 &
SERVER_PID=$!
echo "📝 Server PID: $SERVER_PID"

# 2. Define a cleanup function to kill the server when this script exits
cleanup() {
  echo "🛑 Stopping server (PID: $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
}
# Trap exit signals (EXIT, INT, TERM) to ensure cleanup happens
trap cleanup EXIT INT TERM

# 3. Wait for the server to be ready (Poll /api/debug/ping)
echo "⏳ Waiting for server to be ready..."
MAX_RETRIES=30
count=0
until curl -s http://127.0.0.1:3000/api/debug/ping > /dev/null; do
  sleep 1
  count=$((count+1))
  if [ $count -ge $MAX_RETRIES ]; then
    echo "❌ Server failed to start within $MAX_RETRIES seconds."
    cat /tmp/hrm-server.log
    exit 1
  fi
done

echo "✅ Server is up! Running command: $@"
echo "----------------------------------------"

# 4. Run the command passed as arguments to this script
"$@"
EXIT_CODE=$?

echo "----------------------------------------"
echo "🏁 Command finished with exit code $EXIT_CODE"
exit $EXIT_CODE
