#!/bin/bash
# scripts/test-json-with-server.sh
# Runs targeted Playwright tests with server startup and report merging support

set -e

# Capture any arguments passed to the script (e.g., specific test files or flags)
TEST_ARGS="$@"
if [ -z "$TEST_ARGS" ]; then
  # Default to targeted visual test files if no args provided
  TEST_ARGS="tests/playwright/visual-regression.spec.ts tests/playwright/remote-capabilities.spec.ts tests/playwright/simple-smoke.spec.ts tests/playwright/debug.spec.ts"
fi

echo "🧪 Running Playwright tests with blob reporter for merging..."
echo "📋 Test files/args: $TEST_ARGS"

# Run the tests with blob reporter for report merging
scripts/test-with-server.sh npx playwright test $TEST_ARGS --reporter=blob
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Test command completed successfully"
else
  echo "⚠️ Test command failed with exit code: $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE