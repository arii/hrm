#!/bin/bash
set -e

# --- Environment Variables ---
# Required variables
: "${TRIGGER_EVENT:?}"
: "${ACTION_TYPE:?}"
: "${PR_NUMBER:?}"
: "${PR_QUALITY_RESULT:?}"

# Optional variables (may be missing in some trigger contexts)
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"
COMMENT_BODY="${COMMENT_BODY:-}"
FORCE_REVIEW="${FORCE_REVIEW:-false}"

echo "BASE_SHA: $BASE_SHA"
