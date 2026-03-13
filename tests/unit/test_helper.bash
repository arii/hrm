#!/bin/bash

# Mock gh command
gh() {
    if [[ "${MOCK_GH_FAIL:-false}" == "true" ]]; then
        echo "Mocked API failure" >&2
        return 1
    fi
    # For the refactored script, we primarily handle: gh pr view ... --json comments
    echo "{\"comments\": ${MOCK_GH_COMMENTS_JSON:-[]}, \"baseRefOid\": \"${MOCK_GH_BASE_REF:-}\", \"headRefOid\": \"${MOCK_GH_HEAD_REF:-}\"}"
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

    if [ -z "${BASE_SHA+x}" ]; then
        export BASE_SHA="base"
    fi
    if [ -z "${HEAD_SHA+x}" ]; then
        export HEAD_SHA="head"
    fi
    export PR_QUALITY_RESULT="${PR_QUALITY_RESULT:-success}"
    export MAX_COMMENTS="${MAX_COMMENTS:-60}"
    export REVIEW_THROTTLE_MINUTES="${REVIEW_THROTTLE_MINUTES:-30}"
    export BOT_USERNAME="${BOT_USERNAME:-test-bot}"
    export QUALITY_GATE_BOT_USERNAMES="${QUALITY_GATE_BOT_USERNAMES:-github-actions[bot]}"
    export MOCK_GH_COMMENTS_JSON="${MOCK_GH_COMMENTS_JSON:-[]}"

    # Only set defaults if they aren't explicitly exported, allowing empty strings via explicit unset or empty export
    if [ -z "${MOCK_GH_BASE_REF+x}" ]; then
        export MOCK_GH_BASE_REF="mock-base-sha"
    fi
    if [ -z "${MOCK_GH_HEAD_REF+x}" ]; then
        export MOCK_GH_HEAD_REF="mock-head-sha"
    fi

    # Get the directory of the test helper script itself
    local helper_dir
    helper_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local script_to_test="$helper_dir/../../scripts/decide-review-strategy.sh"

    run bash "$script_to_test"
}

# Teardown function to clean up
teardown() {
    rm -f "$GITHUB_OUTPUT" gh_error.log
}
