#!/usr/bin/env python3
import sys
import argparse
import fnmatch
from unidiff import PatchSet

def is_excluded(filename, exclude_patterns):
    if not exclude_patterns:
        return False
    for pattern in exclude_patterns:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False

def main():
    parser = argparse.ArgumentParser(description='Check if a diff contains meaningful changes.')
    parser.add_argument('diff_file', help='Path to the diff file')
    parser.add_argument('--exclude', nargs='*', help='List of glob patterns to exclude', default=[])
    args = parser.parse_args()

    try:
        patch = PatchSet.from_filename(args.diff_file)
    except Exception as e:
        print(f"Error parsing diff file: {e}", file=sys.stderr)
        # Exit with 1 (error) to ensure fail-safe behavior in CI
        sys.exit(1)

    meaningful_changes = False

    for file in patch:
        filename = file.path

        if is_excluded(filename, args.exclude):
            print(f"Ignoring excluded file: {filename}")
            continue

        # Check for meaningful changes:
        # 1. Binary files
        # 2. Content changes (hunks)
        # 3. Added/Removed files
        # 4. Renamed files

        if file.is_binary_file:
             print(f"Found meaningful change (binary file): {filename}")
             meaningful_changes = True
             break

        if len(file) > 0:
            print(f"Found meaningful change in: {filename}")
            meaningful_changes = True
            break

        if file.is_added_file or file.is_removed_file:
            print(f"Found meaningful change (added/removed file): {filename}")
            meaningful_changes = True
            break

        if file.is_rename:
            print(f"Found meaningful change (rename): {filename}")
            meaningful_changes = True
            break

        print(f"Skipping file with no content changes (likely metadata only or empty): {filename}")

    if meaningful_changes:
        print("Meaningful changes detected.")
        sys.exit(0)
    else:
        print("No meaningful changes detected.")
        # Use exit code 2 for "no meaningful changes" to distinguish from error (1)
        sys.exit(2)

if __name__ == '__main__':
    main()
