#!/usr/bin/env python3
import os
import sys

# 1. Secure location (RECOMMENDED: Create this dir and move your .env files here)
# 2. Fallback location (Your current repo root)
SEARCH_PATHS = [
    "/home/ari/workspace/secrets/hrm",
    "/home/ari/workspace/leader",
]

# Files to provision
REQUIRED_FILES = [".env.production", ".env.local"]


def find_secret_file(filename):
    """Searches for the secret file in the configured paths."""
    for path in SEARCH_PATHS:
        full_path = os.path.join(path, filename)
        if os.path.exists(full_path):
            return full_path
    return None


def provision_secrets(target_worktree):
    """
    Symlinks env files from the secure source to the target worktree.
    Symlinking is preferred over copying to ensure consistency.
    """
    print(f"[SECRETS] Provisioning secrets for: {target_worktree}")
    success = True

    for fname in REQUIRED_FILES:
        source = find_secret_file(fname)
        if not source:
            print(f"[WARN] Secret file '{fname}' not found in search paths.")
            # Don't fail hard, just warn, as some envs might not need both
            continue

        dest = os.path.join(target_worktree, fname)

        # Remove existing file/link if it exists to prevent collisions
        if os.path.lexists(dest):
            try:
                os.remove(dest)
            except OSError as e:
                print(f"[ERROR] Could not remove existing {fname}: {e}")
                success = False
                continue

        # Create symlink
        try:
            os.symlink(source, dest)
            print(f"[OK] Linked {fname} -> {source}")
        except Exception as e:
            print(f"[ERROR] Failed to link {fname}: {e}")
            success = False

    return success


if __name__ == "__main__":
    # Allow running standalone to fix current directory
    import argparse

    parser = argparse.ArgumentParser(description="Provision .env secrets")
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="Target directory (default: current)",
    )
    args = parser.parse_args()

    if not provision_secrets(args.target):
        sys.exit(1)
