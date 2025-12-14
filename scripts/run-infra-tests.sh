#!/bin/bash
# scripts/run-infra-tests.sh
# Executes Playwright infrastructure tests and ensures server logs are dumped on failure.

# Exit immediately if a command exits with a non-zero status.
set -e

# Run the playwright test command, passing along all script arguments (e.g., --reporter)
# The `||` construct is problematic with how npm appends arguments, so we use a subshell
# and an explicit exit code check to avoid syntax errors.
(cross-env TESTING=true playwright test tests/playwright/infrastructure.spec.ts "$@")
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ Infrastructure tests failed with exit code $EXIT_CODE."
  # The infrastructure tests pipe stdout/stderr to the test report,
  # but we check for a fallback log file just in case.
  LOG_FILE="/tmp/hrm-server.log"
  if [ -f "$LOG_FILE" ]; then
    echo "--- Server Logs from $LOG_FILE ---"
    cat "$LOG_FILE"
    echo "-----------------------------------"
  fi
  exit $EXIT_CODE
fi

echo "✅ Infrastructure tests passed."
exit 0
