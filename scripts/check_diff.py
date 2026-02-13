import sys
import fnmatch
import os
import argparse

try:
    import unidiff
except ImportError:
    print("Error: unidiff module not found. Treating as meaningful changes to be safe.")
    sys.exit(0)

# Default exclusion patterns (can be overridden)
DEFAULT_EXCLUDED_PATTERNS = [
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

def should_skip(filepath, patterns):
    """Checks if the file should be skipped based on exclusion patterns."""
    filename = os.path.basename(filepath)
    for pattern in patterns:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False

def main():
    parser = argparse.ArgumentParser(description='Check if a unified diff contains meaningful changes.')
    parser.add_argument('diff_file', help='Path to the unified diff file (or - for stdin)')
    parser.add_argument('--exclude', nargs='*', default=None, help='List of file patterns to exclude (overrides defaults)')

    args = parser.parse_args()

    # Use default patterns if none provided, otherwise use provided list
    if args.exclude is not None:
        excluded_patterns = args.exclude
    else:
        excluded_patterns = DEFAULT_EXCLUDED_PATTERNS

    try:
        if args.diff_file == '-':
            # Reading from stdin requires creating a PatchSet from strings
            content = sys.stdin.read()
            patch_set = unidiff.PatchSet(content)
        else:
            if not os.path.exists(args.diff_file):
                print(f"Error: Diff file '{args.diff_file}' not found.")
                sys.exit(0)
            patch_set = unidiff.PatchSet.from_filename(args.diff_file)
    except Exception as e:
        print(f"Error parsing diff: {e}")
        # If parsing fails, we default to treating it as meaningful changes to be safe
        sys.exit(0)

    meaningful_changes = False

    for patched_file in patch_set:
        if should_skip(patched_file.path, excluded_patterns):
            continue

        # Check for metadata changes (rename, binary, mode change)
        if patched_file.is_rename or patched_file.is_binary_file:
             meaningful_changes = True
             break

        # Check if the file has actual added or removed lines that are non-whitespace
        has_content_changes = False
        for hunk in patched_file:
            for line in hunk:
                if line.is_added or line.is_removed:
                    # Strip whitespace to check for meaningful content
                    # Note: line.value contains the line content WITHOUT the +/- prefix
                    if line.value.strip():
                        has_content_changes = True
                        break
            if has_content_changes:
                break

        if has_content_changes:
            meaningful_changes = True
            break

    if meaningful_changes:
        print("Meaningful changes detected.")
        sys.exit(0)
    else:
        print("No meaningful changes detected (empty, whitespace-only, or excluded files only).")
        sys.exit(1)

if __name__ == "__main__":
    main()
