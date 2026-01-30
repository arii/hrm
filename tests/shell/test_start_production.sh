#!/bin/bash
set -e

echo "🧪 Running tests for scripts/start-production.sh..."

# --- Test Setup ---
# Create dummy files that the script expects to exist, so we can isolate the env var check.
mkdir -p dist
touch dist/server.js
mkdir -p .next_prod
touch .next_prod/BUILD_ID

# Cleanup function to remove dummy files on script exit
cleanup() {
  echo "🧹 Cleaning up dummy files..."
  rm -rf dist .next_prod
}
trap cleanup EXIT

# --- Test Cases ---

# Test 1: Should fail if SPOTIFY_CLIENT_ID is missing
echo -n "  - Test 1: Should fail if SPOTIFY_CLIENT_ID is missing... "
# We run the script in a subshell `()` to isolate the `unset`.
# The `if` condition checks the exit code. We expect it to be non-zero (failure).
if (unset SPOTIFY_CLIENT_ID; export SPOTIFY_CLIENT_SECRET="test"; bash scripts/start-production.sh >/dev/null 2>&1); then
  echo "❌ FAILED: Script succeeded unexpectedly."
  exit 1
else
  echo "✅ PASSED"
fi

# Test 2: Should fail if SPOTIFY_CLIENT_SECRET is missing
echo -n "  - Test 2: Should fail if SPOTIFY_CLIENT_SECRET is missing... "
if (export SPOTIFY_CLIENT_ID="test"; unset SPOTIFY_CLIENT_SECRET; bash scripts/start-production.sh >/dev/null 2>&1); then
  echo "❌ FAILED: Script succeeded unexpectedly."
  exit 1
else
  echo "✅ PASSED"
fi

# Test 3: Should pass validation if both variables are present
# The script will eventually fail when it tries to 'exec node', as we are not in a real build.
# We use `|| true` to prevent the test script from exiting due to this expected failure.
# We capture the output to verify that our validation check passed.
echo -n "  - Test 3: Should pass validation when both variables are present... "
output=$(export SPOTIFY_CLIENT_ID="test"; export SPOTIFY_CLIENT_SECRET="test"; bash scripts/start-production.sh 2>&1 || true)

if echo "$output" | grep -q "✅ Critical environment variables are present."; then
  echo "✅ PASSED"
else
  echo "❌ FAILED: Validation message not found in the output."
  echo "--- SCRIPT OUTPUT ---"
  echo "$output"
  echo "---------------------"
  exit 1
fi

echo "🎉 All shell script tests passed!"
