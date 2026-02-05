#!/bin/bash
# Default configuration
WORDLIST="ai_slop_words.txt"
EXIT_ON_FAIL=1
SEARCH_DIR="."
EXCLUDE_DIRS="node_modules,.git,.next,dist,build,coverage,.vercel"
EXCLUDE_FILES="ai_slop_words.txt,find_slop.sh,*.svg,*.lock,pnpm-lock.yaml,*.png,*.ico,*.json,*.map"

# Function to display usage
usage() {
    echo "Usage: $0 [-w <wordlist>] [-d <search_dir>] [-x <exclude_dirs>] [-e <exclude_files>]"
    echo "  -w: Path to the wordlist file (default: $WORDLIST)"
    echo "  -d: Directory to search (default: $SEARCH_DIR)"
    echo "  -x: Comma-separated list of directories to exclude"
    echo "  -e: Comma-separated list of file patterns to exclude"
    exit 1
}

# Parse command-line options
while getopts ":w:d:x:e:" opt; do
    case ${opt} in
        w ) WORDLIST=$OPTARG ;;
        d ) SEARCH_DIR=$OPTARG ;;
        x ) EXCLUDE_DIRS=$(echo "$EXCLUDE_DIRS,$OPTARG" | sed 's/^,//') ;;
        e ) EXCLUDE_FILES=$(echo "$EXCLUDE_FILES,$OPTARG" | sed 's/^,//') ;;
        \? ) usage ;;
        : ) echo "Invalid option: $OPTARG requires an argument" 1>&2; usage ;;
    esac
done
shift $((OPTIND -1))

# Determine repo root to reliably find .slop-ignore
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
    echo -e "${YELLOW}Warning: Not a git repository. .slop-ignore will not be processed.${NC}"
else
    SLOP_IGNORE_PATH="$REPO_ROOT/.slop-ignore"
    if [ -f "$SLOP_IGNORE_PATH" ]; then
        while IFS= read -r pattern || [ -n "$pattern" ]; do
            # Remove carriage return if present (for DOS line endings)
            pattern=${pattern%$'\r'}
            # Remove comments and trim whitespace
            pattern=$(echo "$pattern" | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            if [ -n "$pattern" ]; then
                if [[ "$pattern" == */ ]]; then
                    # It's a directory
                    dir_pattern="${pattern%/}"
                    EXCLUDE_DIRS="$EXCLUDE_DIRS,$dir_pattern"
                else
                    EXCLUDE_FILES="$EXCLUDE_FILES,$pattern"
                fi
            fi
        done < "$SLOP_IGNORE_PATH"
    fi
fi

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
# Check if wordlist and search directory exist
if [ ! -f "$WORDLIST" ]; then
    echo -e "${RED}Error: Wordlist file '$WORDLIST' not found.${NC}"
    exit 1
fi
if [ ! -d "$SEARCH_DIR" ]; then
    echo -e "${RED}Error: Search directory '$SEARCH_DIR' not found.${NC}"
    exit 1
fi

# Determine search targets
if [ "$#" -eq 0 ]; then
    TARGETS=("$SEARCH_DIR")
else
    TARGETS=("$@")
fi

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   AI Slop Detection Report                             ${NC}"
echo -e "${BLUE}   Scanning for low-density, filler content...          ${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""

# Build base grep args
# -r: recursive
# -n: show line number
# -i: case insensitive
# -H: always print filename (needed when scanning a single file)
BASE_GREP_ARGS=(-rniH)

IFS=',' read -ra DIRS_TO_EXCLUDE <<< "$EXCLUDE_DIRS"
for dir in "${DIRS_TO_EXCLUDE[@]}"; do
    BASE_GREP_ARGS+=(--exclude-dir="$dir")
done

IFS=',' read -ra FILES_TO_EXCLUDE <<< "$EXCLUDE_FILES"
for file in "${FILES_TO_EXCLUDE[@]}"; do
    BASE_GREP_ARGS+=(--exclude="$file")
done

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
matches=$(grep "${BASE_GREP_ARGS[@]}" "$term" "${TARGETS[@]}")

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
    echo -e "${RED}FAILURE: AI Slop detected. Please refine documentation/comments for higher technical density.${NC}"
    exit 1
else
    echo -e "${GREEN}SUCCESS: No AI Slop patterns detected.${NC}"
    exit 0
fi
