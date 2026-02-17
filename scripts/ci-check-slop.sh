#!/bin/bash
set -eo pipefail

LOG_DIR="logs"
SLOP_RAW_LOG="$LOG_DIR/slop-raw.log"
SLOP_OUTPUT_LOG="$LOG_DIR/slop-output.log"
GEMINI_SLOP_LOG="$LOG_DIR/gemini-slop.md"
TASK_FILE="$LOG_DIR/slop-task.txt"
DIFF_FILE="$LOG_DIR/pr.diff"
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

echo "Requesting Gemini feedback..."

# Generate Diff (limit size to 100KB to be safe)
if [ -z "$DIFF_ERROR" ]; then
    # Capture diff to file, respecting size limit
    if ! git diff "$DIFF_TARGET" | head -c "$DIFF_MAX_SIZE" > "$DIFF_FILE"; then
         echo "Diff generation failed." > "$DIFF_FILE"
    else
         # Check if we hit the limit
         ACTUAL_SIZE=$(wc -c < "$DIFF_FILE")
         if [ "$ACTUAL_SIZE" -ge "$DIFF_MAX_SIZE" ]; then
             echo "⚠️  Warning: Diff truncated to ${DIFF_MAX_SIZE} bytes." >&2
             echo "... (Diff truncated at ${DIFF_MAX_SIZE} bytes) ..." >> "$DIFF_FILE"
         fi
    fi
else
    echo "Diff generation skipped due to previous error: $DIFF_ERROR" > "$DIFF_FILE"
fi

cat > "$TASK_FILE" <<EOF
Review the following code changes for "slop" (low-quality, repetitive, or filler content).
We have already run a regex-based detector.

Here is the output of the regex detector:
\`\`\`
$(cat "$SLOP_RAW_LOG")
\`\`\`

Here are the Lines of Code (LOC) statistics:
\`\`\`
$LOC_STATS
\`\`\`

Please provide a concise assessment of the changes.
1. If the regex detector found issues, verify if they are genuine slop or false positives.
2. If the LOC count is very high (e.g. > 500 lines) with little substance, flag it.
3. Provide a brief summary of the code quality regarding "slop".

Keep your response short and focused on quality/slop.
EOF

if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️ GEMINI_API_KEY not set. Skipping Gemini feedback." >&2
  echo "Gemini feedback skipped (missing API key)." > "$GEMINI_SLOP_LOG"
else
  echo "Invoking Gemini client..."
  GEMINI_EXIT_CODE=0
  pnpm tsx scripts/gemini-client.ts \
    --task-file "$TASK_FILE" \
    --context "$DIFF_FILE" \
    --output "$GEMINI_SLOP_LOG" || GEMINI_EXIT_CODE=$?

  if [ $GEMINI_EXIT_CODE -ne 0 ]; then
    echo "⚠️ Gemini client failed. Continuing with available reports." >&2
    echo "Gemini feedback unavailable (client failed)." > "$GEMINI_SLOP_LOG"
  fi
fi

echo "Generating final report..."
{
  echo "### 🧹 AI Slop Detection Report"
  printf "#### Automated Detection Results\n\`\`\`\n"
  cat "$SLOP_RAW_LOG"
  printf "\`\`\`\n\n#### Gemini Analysis\n"
  [ -f "$GEMINI_SLOP_LOG" ] && cat "$GEMINI_SLOP_LOG" || echo "No Gemini analysis available."
  printf "\n#### LOC Stats\n\`\`\`\n$LOC_STATS\n\`\`\`\n"
} > "$SLOP_OUTPUT_LOG"

echo "Report generated at $SLOP_OUTPUT_LOG"

exit $SLOP_EXIT_CODE
