#!/bin/bash

# Mock gh command
gh() {
    local args=("$@")
    local jq_filter=""

    for i in "${!args[@]}"; do
        if [[ "${args[$i]}" == "--jq" || "${args[$i]}" == "-q" ]]; then
            jq_filter="${args[$i+1]}"
            break
        fi
    done

    local full_json="{\"comments\": ${MOCK_GH_COMMENTS_JSON:-[]}}"

    if [[ -n "$jq_filter" ]]; then
        echo "$full_json" | jq -r "$jq_filter"
    else
        echo "$full_json"
    fi
}
export -f gh

# Function to run the script under test
run_script() {
    # Set sensible defaults
    export GITHUB_OUTPUT=$(mktemp)
    export TRIGGER_EVENT="${TRIGGER_EVENT:-pull_request}"
    export ACTION_TYPE="${ACTION_TYPE:-synchronize}"
    export COMMENT_BODY="${COMMENT_BODY:-}"
    export PR_NUMBER="${PR_NUMBER:-123}"
    export BASE_SHA="${BASE_SHA:-base}"
    export HEAD_SHA="${HEAD_SHA:-head}"
    export PR_QUALITY_RESULT="${PR_QUALITY_RESULT:-success}"
    export MAX_COMMENTS="${MAX_COMMENTS:-60}"
    export REVIEW_THROTTLE_MINUTES="${REVIEW_THROTTLE_MINUTES:-30}"
    export BOT_USERNAME="${BOT_USERNAME:-test-bot}"
    export QUALITY_GATE_BOT_USERNAMES="${QUALITY_GATE_BOT_USERNAMES:-github-actions[bot]}"
    export MOCK_GH_COMMENTS_JSON="${MOCK_GH_COMMENTS_JSON:-[]}"

    # Get the directory of the test helper script itself
    local helper_dir
    helper_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local script_to_test="$helper_dir/../../scripts/decide-review-strategy.sh"

    run bash "$script_to_test"
}

# Teardown function to clean up
teardown() {
    rm -f "$GITHUB_OUTPUT"
}
