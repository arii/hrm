#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
REPORTS_DIR="reports/performance"
SERVER_ENTRY_POINT="dist/server.js"
STRESS_CLIENT_SCRIPT="scripts/ws-stress-client.ts"
LOG_FILE="logs/ws-stress-client.log"
URL="http://127.0.0.1:3000"
PROFILE_DURATION=15 # Duration in seconds for both HTTP and WS load

# --- Setup ---
echo "📈 Starting Backend Performance Profiling..."
echo "------------------------------------------"

# 1. Create necessary directories
echo "   - Creating directories..."
mkdir -p $(dirname "$LOG_FILE")
mkdir -p "$REPORTS_DIR"
rm -f "$LOG_FILE" # Clean up old log file

# 2. Build the server
echo "   - Building server for production..."
# We need the production build so that Next.js doesn't interfere with profiling
NODE_ENV=production pnpm run build

echo "   - Server built successfully."

# --- Execution ---
echo "   - Starting WebSocket stress client in the background..."
# Run the stress client with ts-node and redirect output to a log file
pnpm exec ts-node "$STRESS_CLIENT_SCRIPT" --duration=$PROFILE_DURATION > "$LOG_FILE" 2>&1 &
STRESS_CLIENT_PID=$!
echo "   - Stress client running with PID: $STRESS_CLIENT_PID"

# Allow a moment for the stress client to be ready (though it starts trying immediately)
sleep 2

# 3. Run Clinic.js Doctor
echo "   - Starting Clinic.js Doctor with autocannon..."
echo "   - Profiling will run for $PROFILE_DURATION seconds."

# Use `clinic doctor` to profile the server.
# The `--on` flag triggers `autocannon` to generate HTTP load.
# The server itself is the final command.
pnpm exec clinic doctor \
  --dest "$REPORTS_DIR/server-profile.html" \
  --on "pnpm exec autocannon -d $PROFILE_DURATION -c 100 \"$URL\"" \
  -- \
  node "$SERVER_ENTRY_POINT"

# --- Cleanup ---
echo "   - Profiling complete. Cleaning up..."

# Stop the WebSocket stress client
echo "   - Stopping WebSocket stress client (PID: $STRESS_CLIENT_PID)..."
kill "$STRESS_CLIENT_PID" 2>/dev/null || echo "   - Stress client was already stopped."

# --- Completion ---
echo "------------------------------------------"
echo "✅ Profiling Finished!"
echo "   - Clinic.js report saved to: $REPORTS_DIR/server-profile.html"
echo "   - WebSocket stress client logs are in: $LOG_FILE"
echo "------------------------------------------"
