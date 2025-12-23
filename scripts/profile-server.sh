#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
REPORTS_DIR="reports/performance"
URL="http://127.0.0.1:3000"
PROFILE_DURATION=15 # Duration in seconds for HTTP load

# --- Cleanup Function ---
# This runs automatically on EXIT (success or failure) or SIGINT (Ctrl+C)
cleanup() {
  echo ""
  echo "🧹 Cleaning up background processes..."
  # Ensure port 3000 is free
  echo "   - Ensuring port 3000 is released..."
  fuser -k 3000/tcp 2>/dev/null || true
}

# Register the cleanup trap
trap cleanup EXIT INT

# --- Setup ---
echo "📈 Starting Backend Performance Profiling..."
echo "------------------------------------------"

# 1. Create necessary directories
echo "   - Creating directories..."
mkdir -p "$REPORTS_DIR"

# 2. Build the server
echo "   - Building server for production..."

# Ensure NEXTAUTH_SECRET is set for production build/run
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "   - Generating temporary NEXTAUTH_SECRET for profiling..."
  export NEXTAUTH_SECRET=$(openssl rand -base64 32)
fi

# We need the production build so that Next.js doesn't interfere with profiling
NODE_ENV=production pnpm run build

echo "   - Server built successfully."

# --- Execution ---
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
  node dist/server.mjs

# --- Completion ---
echo "------------------------------------------"
echo "✅ Profiling Finished!"
echo "   - Clinic.js report saved to: $REPORTS_DIR/server-profile.html"
echo "------------------------------------------"
