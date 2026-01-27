#!/bin/bash
set -eo pipefail

TEST_ENV=$1

if [[ "$TEST_ENV" != "dev" && "$TEST_ENV" != "prod" ]]; then
  echo "Usage: $0 <dev|prod>"
  exit 1
fi

echo "🧪 Running infrastructure tests for $TEST_ENV environment..."
mkdir -p logs test-results

JUNIT_OUTPUT_NAME="test-results/infra-${TEST_ENV}-results.xml"
LOG_OUTPUT_NAME="logs/infra-${TEST_ENV}-output.log"
TEST_COMMAND="test:infra:${TEST_ENV}"

PLAYWRIGHT_JUNIT_OUTPUT_NAME=$JUNIT_OUTPUT_NAME pnpm run $TEST_COMMAND --reporter=junit 2>&1 | tee $LOG_OUTPUT_NAME
