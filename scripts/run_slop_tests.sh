#!/bin/bash
set -e
# Test runner for find_slop.sh
# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
echo "Running find_slop.sh tests..."
# Test 1: Should find slop and ignore specified files
echo "Test 1: Should find slop and ignore specified files..."
exit_code=0
# We expect this command to fail, so we catch the exit code without letting set -e terminate the script.
output=$(./scripts/find_slop.sh -w scripts/test_data/test_slop_words.txt -d scripts/test_data) || exit_code=$?
if [ $exit_code -eq 0 ]; then
    echo -e "${RED}Test 1 Failed: Expected a non-zero exit code, but got 0.${NC}"
    exit 1
fi
if echo "$output" | grep -q "should_be_ignored.txt"; then
    echo -e "${RED}Test 1 Failed: Found slop in the ignored file.${NC}"
    exit 1
fi
echo -e "${GREEN}Test 1 Passed.${NC}"

# Test 2: Should not find slop when the directory is excluded and exit with a zero status code
echo "Test 2: Should not find slop when the directory is excluded..."
if ./scripts/find_slop.sh -w scripts/test_data/test_slop_words.txt -d scripts/test_data -x "another_dir" -e "test_slop_words.txt"; then
    echo -e "${GREEN}Test 2 Passed.${NC}"
else
    echo -e "${RED}Test 2 Failed: Expected a zero exit code, but got a non-zero exit code.${NC}"
    exit 1
fi
echo -e "${GREEN}All tests passed.${NC}"
exit 0
