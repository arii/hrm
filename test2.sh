BODY="Hello @gemini-bot, please review"
CMD=$(echo "$BODY" | grep -oiE "(^|[[:space:]])@(gemini-bot|pr-squash|conflict-resolve|gemini-triage|gemini-coder|create-review-issues|gemini-help)" | head -n1 | tr '[:upper:]' '[:lower:]' | xargs)
case "$CMD" in
  "@gemini-bot")          echo "is_review=true" ;;
  "@pr-squash")           echo "is_squash=true" ;;
  "@conflict-resolve")    echo "is_resolve=true" ;;
  "@gemini-triage")       echo "is_triage=true" ;;
  "@gemini-coder")        echo "is_coder=true" ;;
  "@create-review-issues")echo "is_review_issues=true" ;;
  "@gemini-help")         echo "is_help=true" ;;
esac
