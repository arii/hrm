#!/bin/bash
# Configuration
WORDLIST="ai_slop_words.txt"
SEARCH_DIR="."
EXIT_ON_FAIL=1
# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
# Check if wordlist exists
if [ ! -f "$WORDLIST" ]; then
echo -e "${RED}Error: Wordlist file '$WORDLIST' not found.${NC}"
exit 1
fi
echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   AI Slop Detection Report                             ${NC}"
echo -e "${BLUE}   Scanning for low-density, filler content...          ${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""
# Counter for total matches
total_matches=0
files_with_slop=()
# Loop through each line in the wordlist
while IFS= read -r term || [ -n "$term" ]; do
# Remove carriage return if present (for DOS line endings) - ensures cross-platform compatibility
term=${term%$'\r'}
# Skip empty lines and comments
if [[ -z "$term" ]] || [[ ${term:0:1} == "#" ]]; then
continue
fi
# Perform grep search
# -r: recursive
# -n: show line number
# -i: case insensitive
# Exclude node_modules, .git, and common binary/lock files
matches=$(grep -rni "$term" "$SEARCH_DIR" \
    --exclude-dir={node_modules,.git,.next,dist,build,coverage,.vercel} \
    --exclude={"ai_slop_words.txt","find_slop.sh","*.svg","*.lock","pnpm-lock.yaml","*.png","*.ico","*.json","*.map"} \
)

if [ -n "$matches" ]; then
    count=$(echo "$matches" | wc -l)
    total_matches=$((total_matches + count))

    echo -e "${YELLOW}🚨 Pattern: '$term' ($count matches)${NC}"

    # Read matches line by line to format them
    while IFS= read -r match; do
        file=$(echo "$match" | cut -d: -f1)
        line=$(echo "$match" | cut -d: -f2)
        content=$(echo "$match" | cut -d: -f3-)

        # Trim whitespace from content
        content="${content#"${content%%[![:space:]]*}"}"

        echo -e "  ${RED}FAIL${NC} $file:$line -> \"$content\""
        files_with_slop+=("$file")
    done <<< "$matches"
    echo ""
fi

done < "$WORDLIST"
# Deduplicate files list
sorted_unique_files=($(echo "${files_with_slop[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))
echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   Scan Complete.${NC}"
echo -e "   Total 'Slop' Patterns Found: ${RED}$total_matches${NC}"
echo -e "   Files Impacted: ${#sorted_unique_files[@]}"
echo -e "${BLUE}========================================================${NC}"
if [ $total_matches -gt 0 ]; then
if [ "$EXIT_ON_FAIL" -eq 1 ]; then
echo -e "${RED}FAILURE: AI Slop detected. Please refine documentation/comments for higher technical density.${NC}"
exit 1
else
echo -e "${YELLOW}WARNING: AI Slop detected. Review recommended.${NC}"
exit 0
fi
else
echo -e "${GREEN}SUCCESS: No AI Slop patterns detected.${NC}"
exit 0
fi
