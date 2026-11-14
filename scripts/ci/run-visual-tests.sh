#!/bin/bash
set -eo pipefail

echo "🧪 Running visual tests..."
mkdir -p logs test-results

# Sharding: CI sets SHARD_INDEX/SHARD_TOTAL (e.g. 2/4) to split test files across
# runners; each runner still runs its own local webServer with workers:1, so the
# WebSocket cross-talk constraint applies within a runner only. Defaults (1/1) run
# everything locally, unchanged.
SHARD_INDEX="${SHARD_INDEX:-1}"
SHARD_TOTAL="${SHARD_TOTAL:-1}"

SKIP_BUILD=true pnpm run test:visual --shard="${SHARD_INDEX}/${SHARD_TOTAL}" 2>&1 | tee logs/visual-output.log
