#!/bin/bash
# scripts/run-visual-tests.sh
# Test runner for Playwright visual regression tests.
# This script handles server setup, execution, and teardown.

set -e

# Default host and port if not set externally
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-3000}"
WAIT_URL="http://${HOST}:${PORT}/api/debug/ping"

echo "Running visual tests against ${WAIT_URL}"

# 1. Clean up previous runs
echo "Cleaning up old processes..."
bash "$(dirname "$0")/kill-all.sh"

# 2. Start the server in the background
echo "Starting server..."
# Ensure TESTING env var is set for the server
pnpm exec cross-env TESTING=true bash start-production.sh > /tmp/hrm-server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: ${SERVER_PID}"

# Create a file to store the PID for later cleanup
echo "${SERVER_PID}" > /tmp/hrm-server.pid

# 3. Wait for the server to be ready
echo "Waiting for server to be ready at ${WAIT_URL}..."
npx wait-on "${WAIT_URL}" --timeout 20000

# 4. Run Playwright tests
# The '|| true' ensures that the script continues to the cleanup step even if tests fail
echo "Running Playwright tests..."
playwright test "$@" || true

# 5. Clean up the server process
echo "Cleaning up server process..."
kill "${SERVER_PID}" 2>/dev/null || true
rm /tmp/hrm-server.pid 2>/dev/null || true

echo "Test run complete."
