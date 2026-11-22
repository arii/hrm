# AI Slop Finder (`find_slop.sh`)

This script scans a directory for "AI slop" - low-density, filler content often found in AI-generated text. It uses a configurable wordlist to identify potential slop in documentation and comments.

## Usage

```bash
./scripts/find_slop.sh [OPTIONS]
```

### Options

- `-w <wordlist>`: Specifies the path to the wordlist file.
  - **Default**: `ai_slop_words.txt`
- `-d <search_dir>`: The directory to scan for slop.
  - **Default**: `.` (the current directory)
- `-x <exclude_dirs>`: A comma-separated list of directory names to exclude from the scan.
  - **Default**: `node_modules,.git,.next,dist,build,coverage,.vercel`
- `-e <exclude_files>`: A comma-separated list of file patterns to exclude from the scan.
  - **Default**: `ai_slop_words.txt,find_slop.sh,*.svg,*.lock,pnpm-lock.yaml,*.png,*.ico,*.json,*.map`

### Ignoring Files and Directories

You can create a `.slop-ignore` file in the root of the repository to specify additional files and directories to exclude from the scan. Each line in the file should be a pattern to ignore. Comments are supported using the `#` character.

Example `.slop-ignore` file:

```
# Ignore all files in the vendor directory
vendor/

# Ignore a specific file
src/legacy/code.js
```

## Other Manual Tools

- `audit-vrt-changes.sh`: Uses `gh` and `jq` to audit visual regression test file changes across pull requests.
- `check-pr-conflicts.sh`: Lists open pull requests with a `DIRTY` mergeable status (requires authenticated `gh`).
- `cleanup-branches.sh`: Runs `git push --delete` on every remote branch older than `DAYS_OLD` (default 1 day) that has no open pull request. The deletion is immediate and cannot be undone by the script.
- `npm-to-pnpm.sh`: Wrapper that runs the equivalent `pnpm` command for common `npm` commands (install, ci, run, start, test, build, dev).
- `vacuum-system-journal.sh`: Vacuums the systemd journal to free disk space (run with `sudo`).
- `verify-isolated.sh`: Starts or stops an isolated dev server in a disposable worktree on its own port (default 3100) for verification.
- `verify-setup.sh`: Verifies the NGINX configuration and helps set up the `.env` file.
