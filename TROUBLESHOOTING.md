# Troubleshooting Guide

This guide provides solutions to common issues encountered during development, testing, and deployment.

## General Fixes

### Corrupted `node_modules` or Lockfile Issues

If you encounter strange dependency-related errors, a full reinstall is often the best solution.

- **Symptom**: "Module not found" errors for packages that are clearly in `package.json`, or cryptic build failures.
- **Solution**:

  ```bash
  # 1. Remove all installed packages
  rm -rf node_modules

  # 2. Reinstall dependencies cleanly from the lockfile
  pnpm install --frozen-lockfile
  ```

## Git Hooks

### Commits are Failing Due to Lint Errors

The pre-commit hook is designed to prevent code that violates our quality standards from being committed.

- **Symptom**: `git commit` is aborted with a message from ESLint or Prettier.
- **Solution**:
  1.  Review the error messages in your terminal. They will pinpoint the exact files and lines with issues.
  2.  Fix the reported errors (e.g., unused variables, incorrect formatting). Many issues can be fixed automatically by running `pnpm run lint:fix`.
  3.  Stage the corrected files and try committing again.

### Pre-commit Hook is Broken or Not Running

If the Git hook isn't working as expected, it may need to be reinstalled.

- **Symptom**: You can commit code with obvious linting errors, or you see an error message like `command not found: husky`.
- **Solution**: Reinstall the Husky hooks:
  ```bash
  pnpm prepare
  ```
  This command re-runs the Husky installation process, which should repair the pre-commit hook.

## Deployment Issues

### `pnpm: command not found` on Server

If the deployment script fails because `pnpm` is not available on the production server.

- **Symptom**: The `deploy.sh` script fails with an error message indicating that the `pnpm` command cannot be found.
- **Solution**:
  1.  SSH into your production server.
  2.  Install `pnpm` globally using `npm`:
      ```bash
      npm install -g pnpm
      ```
  3.  Verify the installation with `pnpm --version`.
  4.  Re-run the deployment script.

### `deploy.sh` Fails with `pnpm install`

- **Symptom**: The deployment fails during the `pnpm install` step on the server.
- **Solution**: This can happen if the `pnpm-lock.yaml` file is out of sync or corrupted. Ensure the latest version of the lockfile is committed to the `leader` branch and that the server has the correct permissions to read it.
