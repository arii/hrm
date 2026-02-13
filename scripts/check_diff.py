import sys
import fnmatch
import os

try:
    import unidiff
except ImportError:
    print("Error: unidiff module not found. Treating as meaningful changes to be safe.")
    sys.exit(0)

EXCLUDED_PATTERNS = [
    '*.lock',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    '*.svg',
    '*.png',
    '*.ico',
    '*.map',
    'find_slop.sh'
]

def should_skip(filepath):
    """Checks if the file should be skipped based on exclusion patterns."""
    filename = os.path.basename(filepath)
    for pattern in EXCLUDED_PATTERNS:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 check_diff.py <diff_file>")
        sys.exit(0)

    diff_file = sys.argv[1]

    try:
        if diff_file == '-':
            patch_set = unidiff.PatchSet(sys.stdin)
        else:
            if not os.path.exists(diff_file):
                print(f"Error: Diff file '{diff_file}' not found.")
                sys.exit(0)
            patch_set = unidiff.PatchSet.from_filename(diff_file)
    except Exception as e:
        print(f"Error parsing diff: {e}")
        # If parsing fails, we default to treating it as meaningful changes to be safe
        sys.exit(0)

    meaningful_changes = False

    for patched_file in patch_set:
        if should_skip(patched_file.path):
            continue

        # Check if the file has actual added or removed lines
        if patched_file.added == 0 and patched_file.removed == 0:
            continue

        meaningful_changes = True
        break

    if meaningful_changes:
        print("Meaningful changes detected.")
        sys.exit(0)
    else:
        print("No meaningful changes detected (empty or excluded files only).")
        sys.exit(1)

if __name__ == "__main__":
    main()
