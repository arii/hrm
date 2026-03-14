BODY="Hello @gemini-bot, please review"
CMD=$(echo "$BODY" | grep -oiE "(^|[[:space:]])@(gemini-bot|pr-squash|conflict-resolve|gemini-triage|gemini-coder|create-review-issues|gemini-help)" | head -n1 | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//')
echo "CMD='$CMD'"

BODY="  @pr-squash"
CMD=$(echo "$BODY" | grep -oiE "(^|[[:space:]])@(gemini-bot|pr-squash|conflict-resolve|gemini-triage|gemini-coder|create-review-issues|gemini-help)" | head -n1 | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//')
echo "CMD='$CMD'"
