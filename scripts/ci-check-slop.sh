#!/bin/bash
set -eo pipefail

LOG_DIR="logs"
SLOP_RAW_LOG="$LOG_DIR/slop-raw.log"
SLOP_OUTPUT_LOG="$LOG_DIR/slop-output.log"
DIFF_MAX_SIZE=100000

mkdir -p "$LOG_DIR"
touch "$SLOP_OUTPUT_LOG"

BASE_BRANCH="${GITHUB_BASE_REF:-leader}"
echo "Running Slop Check against base branch: $BASE_BRANCH"

# Fallback fetch logic if the base branch is missing locally (common in shallow clones)
if ! git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
  echo "Fetching base branch origin/$BASE_BRANCH..."
  # Use a deeper fetch depth (50) to ensure the merge-base is available for diff calculation
  git fetch origin "$BASE_BRANCH" --depth=50 || echo "Warning: Could not fetch base branch." >&2
fi

echo "Running automated slop detection..."
pnpm run lint:slop > "$SLOP_RAW_LOG" 2>&1 || SLOP_EXIT_CODE=$?
SLOP_EXIT_CODE=${SLOP_EXIT_CODE:-0}

if [ $SLOP_EXIT_CODE -eq 0 ]; then
  echo "✅ Automated slop check passed."
else
  echo "❌ Automated slop check failed."
fi

echo "Calculating LOC stats..."
LOC_STATS=""
DIFF_ERROR=""
DIFF_TARGET="origin/$BASE_BRANCH...HEAD"

# Try to get stats using merge-base diff (...)
if ! LOC_STATS=$(git diff --stat "$DIFF_TARGET" 2>&1); then
    DIFF_ERROR="$LOC_STATS"
    LOC_STATS="Unable to calculate stats. Error: $DIFF_ERROR"
    echo "$DIFF_ERROR" >&2
fi
echo "$LOC_STATS"


echo "Generating final report..."
{
  echo "### 🧹 AI Slop Detection Report"
  printf "#### Automated Detection Results\n\`\`\`\n"
  cat "$SLOP_RAW_LOG"
  printf "\`\`\`\n\n#### LOC Stats\n\`\`\`\n$LOC_STATS\n\`\`\`\n"
} > "$SLOP_OUTPUT_LOG"

echo "Report generated at $SLOP_OUTPUT_LOG"

exit $SLOP_EXIT_CODE
