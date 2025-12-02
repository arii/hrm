#!/bin/bash
# scripts/test-json-with-server.sh
# Runs tests with JSON reporter and provides better output visibility

set -e

echo "🧪 Running Playwright tests with JSON reporter..."

# Run the tests, keeping server logs on stderr and JSON on stdout
scripts/test-with-server.sh npx playwright test --reporter=json > playwright-report.json
TEST_EXIT_CODE=$?

echo "📄 JSON report written to playwright-report.json"

# Show test summary
if command -v jq >/dev/null 2>&1 && [ -s playwright-report.json ]; then
  echo "📊 Test Summary:"
  jq -r '.stats // .summary // "No summary found"' playwright-report.json || echo "Could not parse summary"
  
  if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "🚨 Failed test titles:"
    jq -r '.suites[]?.specs[]? | select(.tests[]?.results[]?.status == "failed" or .tests[]?.results[]?.status == "timedOut") | .title' playwright-report.json 2>/dev/null || echo "Could not parse failures"
  fi
else
  echo "⚠️ Could not parse JSON report or file is empty"
  if [ -f playwright-report.json ]; then
    echo "First 10 lines of report:"
    head -10 playwright-report.json
  fi
fi

exit $TEST_EXIT_CODE