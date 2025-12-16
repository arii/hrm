#!/bin/bash
# scripts/start-test.sh
# This script is designed to be called by Playwright's webServer config.
# It prepares and runs the HRM server in a test-ready state.

set -e # Exit immediately if a command exits with a non-zero status.

# Set the working directory to the project root
cd "$(dirname "$0")/.."

# --- Environment Setup ---
# Set default testing environment variables. These can be overridden by the CI environment.
export NODE_ENV=${NODE_ENV:-production}
export TESTING=${TESTING:-true}
export PORT=${PORT:-3000}
export NEXTAUTH_URL=${NEXTAUTH_URL:-http://127.0.0.1:$PORT}

# Set a default secret if not provided, to prevent server startup errors.
export NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-"default-test-secret-from-script"}

echo "[start-test.sh] Starting server with the following settings:"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - TESTING: $TESTING"
echo "  - PORT: $PORT"
echo "  - NEXTAUTH_URL: $NEXTAUTH_URL"
echo "  - NEXTAUTH_SECRET: $(if [ -n "$NEXTAUTH_SECRET" ]; then echo "is set"; else echo "is NOT set"; fi)"
echo "---------------------------------------------------"

# --- Build & Start ---
echo "[start-test.sh] Building server and client..."
# We need to run the full build which includes both the custom server and the Next.js client.
pnpm run build

echo "[start-test.sh] Starting server directly with Node..."
# Execute the server's main JavaScript file.
# Using `exec` replaces the shell process with the Node.js process,
# which is a best practice for process management and signal handling.
exec node dist/server.mjs
