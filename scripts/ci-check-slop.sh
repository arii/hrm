#!/bin/bash
set -e
set -o pipefail

# Configuration
LOG_DIR="logs"
SLOP_RAW_LOG="$LOG_DIR/slop-raw.log"
SLOP_OUTPUT_LOG="$LOG_DIR/slop-output.log"
GEMINI_SLOP_LOG="$LOG_DIR/gemini-slop.md"
TASK_FILE="$LOG_DIR/slop-task.txt"
DIFF_FILE="$LOG_DIR/pr.diff"

# Ensure log directory exists and initialize logs
mkdir -p "$LOG_DIR"
touch "$SLOP_OUTPUT_LOG"

# Error Handler
handle_error() {
  echo "❌ Error: Script failed unexpectedly."
  echo "### ❌ Slop Check Error" > "$SLOP_OUTPUT_LOG"
  echo "The script failed unexpectedly. See raw logs for details." >> "$SLOP_OUTPUT_LOG"
}
trap 'handle_error' ERR

# Determine Base Branch (default to 'leader' if not set)
BASE_BRANCH="${GITHUB_BASE_REF:-leader}"
echo "Running Slop Check against base branch: $BASE_BRANCH"

# Fetch Base Branch if needed (in case of shallow clone or missing ref)
if ! git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
  echo "Fetching base branch origin/$BASE_BRANCH..."
  git fetch origin "$BASE_BRANCH" --depth=1 || echo "Warning: Could not fetch base branch."
fi

# 1. Automated Slop Detection
echo "Running automated slop detection..."
# Run lint:slop and capture output.
# We use '|| true' to prevent script exit on failure, capturing exit code.
set +e
pnpm run lint:slop > "$SLOP_RAW_LOG" 2>&1
SLOP_EXIT_CODE=$?
set -e

if [ $SLOP_EXIT_CODE -eq 0 ]; then
  echo "✅ Automated slop check passed."
else
  echo "❌ Automated slop check failed."
fi

# 2. LOC Stats
echo "Calculating LOC stats..."
LOC_STATS=""
if git diff --stat "origin/$BASE_BRANCH...HEAD" > /dev/null 2>&1; then
  LOC_STATS=$(git diff --stat "origin/$BASE_BRANCH...HEAD")
else
  LOC_STATS="Unable to calculate stats (git diff failed)."
fi

if [ -z "$LOC_STATS" ]; then
  LOC_STATS="No changes detected."
fi
echo "$LOC_STATS"

# 3. Gemini Feedback
echo "Requesting Gemini feedback..."

# Generate Diff (limit size to 100KB to be safe)
if git diff "origin/$BASE_BRANCH...HEAD" > /dev/null 2>&1; then
  git diff "origin/$BASE_BRANCH...HEAD" | head -c 100000 > "$DIFF_FILE"
else
  echo "Diff generation failed." > "$DIFF_FILE"
fi

# Prepare Task Prompt
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

# Run Gemini Client
# We check if GEMINI_API_KEY is set. If not, skip Gemini part but warn.
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️ GEMINI_API_KEY not set. Skipping Gemini feedback."
  echo "Gemini feedback skipped (missing API key)." > "$GEMINI_SLOP_LOG"
else
  echo "Invoking Gemini client..."
  # Use tsx to run the typescript script
  # We use generic task mode.
  # We pass the diff file as context.
  set +e
  pnpm tsx scripts/gemini-client.ts \
    --task-file "$TASK_FILE" \
    --context "$DIFF_FILE" \
    --output "$GEMINI_SLOP_LOG"
  GEMINI_EXIT_CODE=$?
  set -e

  if [ $GEMINI_EXIT_CODE -ne 0 ]; then
    echo "⚠️ Gemini client failed. Continuing with available reports."
    echo "Gemini feedback unavailable (client failed)." > "$GEMINI_SLOP_LOG"
  fi
fi

# 4. Combine Reports
echo "Generating final report..."
{
  echo "### 🧹 AI Slop Detection Report"

  echo "#### Automated Detection Results"
  echo "\`\`\`"
  cat "$SLOP_RAW_LOG"
  echo "\`\`\`"

  echo "#### Gemini Analysis"
  if [ -f "$GEMINI_SLOP_LOG" ]; then
    cat "$GEMINI_SLOP_LOG"
  else
    echo "No Gemini analysis available."
  fi

  echo ""
  echo "#### LOC Stats"
  echo "\`\`\`"
  echo "$LOC_STATS"
  echo "\`\`\`"
} > "$SLOP_OUTPUT_LOG"

echo "Report generated at $SLOP_OUTPUT_LOG"

# Remove trap so normal exit doesn't trigger error handler
trap - ERR

# Exit with the status of the automated check
exit $SLOP_EXIT_CODE
