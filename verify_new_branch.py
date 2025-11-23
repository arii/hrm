#!/usr/bin/env python3
import argparse
import os
import shutil
import subprocess
import sys

DEFAULT_BRANCH = "new-feature-branch"


def run(cmd, cwd=None, check=True):
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, check=check)
    return result


def cleanup(branch_name):
    print(f"Cleaning up worktree and folder for branch: {branch_name}")
    if os.path.isdir(branch_name):
        shutil.rmtree(branch_name)
        print(f"Removed folder: {branch_name}")
    else:
        print(f"Folder {branch_name} does not exist.")
    run(["git", "worktree", "prune"])
    print("Worktree pruned.")


def main(branch_name):
    # Fetch latest changes
    run(["git", "fetch"])

    if os.path.isdir(branch_name):
        print(f"Worktree for {branch_name} already exists. Resetting to latest remote.")
        run(["git", "reset", "--hard", f"origin/{branch_name}"], cwd=branch_name)
        os.chdir(branch_name)
    else:
        print(f"Adding worktree for branch: {branch_name}")
        run(["git", "worktree", "add", branch_name, branch_name])
        os.chdir(branch_name)

    print("Rebasing onto origin/leader")
    run(["git", "rebase", "-i", "origin/leader"])

    # Run setup script
    setup_script = os.path.join("..", "scripts", "setup.sh")
    if os.path.isfile(setup_script) and os.access(setup_script, os.X_OK):
        run([setup_script])
    else:
        print("setup.sh not found or not executable")

    # Build and test
    run(["npm", "run", "build"])
    run(["npm", "run", "test"])
    run(["npm", "run", "test:visual"])

    # Copy production env file
    repo_root = os.path.abspath(os.path.join(os.getcwd(), *(branch_name.split(os.sep)[:-(branch_name.count(os.sep)+1)])))
    env_file = os.path.join(repo_root, ".env.production")
    if os.path.isfile(env_file):
        shutil.copy(env_file, os.path.join(os.getcwd(), ".env.production"))
        print("Copied .env.production")
    else:
        print(f".env.production not found in {repo_root}")

    # Start production
    prod_script = "./start-production.sh"
    if os.path.isfile(prod_script) and os.access(prod_script, os.X_OK):
        run([prod_script])
    else:
        print("start-production.sh not found or not executable")

    print("Manual testing as needed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify new branch workflow.")
    parser.add_argument("branch", nargs="?", default=DEFAULT_BRANCH, help="Branch name")
    parser.add_argument("--cleanup", action="store_true", help="Cleanup branch folder and prune worktree")
    args = parser.parse_args()

    if args.cleanup:
        cleanup(args.branch)
    else:
        main(args.branch)
