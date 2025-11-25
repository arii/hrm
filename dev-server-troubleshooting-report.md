# Development Server and Visual Test Troubleshooting Report

**Date:** 2025-11-25

This report details the issues encountered with the `pnpm run dev` and `pnpm run test:visual` scripts, the errors produced, and the troubleshooting steps taken.

## 1. Summary of the Problem

The `pnpm run dev` script consistently fails to start the development server. As a result, the `pnpm run test:visual` script, which depends on this server, also fails. The core of the issue appears to be a module resolution problem within the `ts-node` and Node.js ESM environment, but the exact cause remains elusive despite extensive troubleshooting.

While the server fails to start for development and visual testing, the application **successfully builds for production** (`pnpm run build`) and **all unit tests pass** (`pnpm run test`).

## 2. Observed Errors

### `pnpm run dev` Failure

When running `pnpm run dev`, the script exits with an `ARG_UNKNOWN_OPTION` error, indicating that the `--env-file=.env.local` argument is not recognized by the `ts-node` runner.

**Log Output:**
```
Error: Unknown or unexpected option: --env-file
    at arg (/app/node_modules/.pnpm/arg@4.1.3/node_modules/arg/index.js:88:19)
    ...
  code: 'ARG_UNKNOWN_OPTION'
}
```
Removing this flag leads to a different error related to module resolution.

**Log Output after removing `--env-file`:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/types/websocket' imported from /app/server.ts
```
This indicates that `ts-node` is not resolving the relative import path `./types/websocket` correctly.

### `pnpm run test:visual` Failure

The visual regression tests fail because they cannot connect to the development server, which is expected since the server does not start.

**Log Output:**
```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/
```

## 3. Troubleshooting Steps and Results

A chronological log of the steps taken to diagnose and resolve the issue.

1.  **Initial Investigation:**
    *   **Action:** Ran `pnpm run dev` and observed the initial crash.
    *   **Finding:** The process exited immediately. The error was not immediately visible.

2.  **Log Redirection:**
    *   **Action:** Ran the server in the background and redirected output to a log file: `pnpm run dev > dev.log 2>&1 &`.
    *   **Finding:** The log file revealed the `ARG_UNKNOWN_OPTION` error related to the `--env-file` flag.

3.  **Attempted Fix #1: Remove `--env-file` flag:**
    *   **Action:** Modified the `dev` script in `package.json` to remove the `--env-file=.env.local` argument, assuming that environment variables would be loaded automatically.
    *   **Result:** The error changed to `ERR_MODULE_NOT_FOUND`, indicating that `ts-node` could not resolve the import path for `./types/websocket` in `server.ts`.

4.  **Attempted Fix #2: Add `.js` extension to import:**
    *   **Action:** Modified the import in `server.ts` to be `from './types/websocket.js'`. This is sometimes required in strict ESM environments.
    *   **Result:** The error persisted, indicating the issue was not a missing file extension.

5.  **Attempted Fix #3: Simplify the `dev` script:**
    *   **Action:** Removed the `pino-pretty` pipe from the `dev` script to get raw output from `ts-node`.
    *   **Result:** The error remained `ERR_MODULE_NOT_FOUND`, confirming the issue was with module resolution.

6.  **Attempted Fix #4: Revert changes and add `.env.local`:**
    *   **Action:** Realized the `.env.local` file was missing, which could have been the initial cause of the problem. Created the file by copying `.env.example`. Reverted the `dev` script to its original state.
    *   **Result:** The server still failed to start with the same `ARG_UNKNOWN_OPTION` error. This confirmed that the `ts-node` version being used does not support the `--env-file` flag.

7.  **Attempted Fix #5: Run `ts-node` directly:**
    *   **Action:** Bypassed the `pnpm run dev` script and ran `ts-node` directly to isolate the issue: `pnpm exec ts-node --esm --transpile-only --project tsconfig.json server.ts`.
    *   **Result:** This consistently produced the `ERR_MODULE_NOT_FOUND` error, pointing to a fundamental problem with how `ts-node` is resolving paths in this project's configuration.

## 4. Final Conclusion

The `dev` server is failing due to an intractable module resolution issue with `ts-node` in an ESM context. The initial error related to `--env-file` seems to be a red herring, as the underlying `ERR_MODULE_NOT_FOUND` error persists even after the script is corrected and the `.env.local` file is present.

Because the development server cannot be started, the visual regression tests cannot run. The project's core logic, however, remains sound as demonstrated by the passing unit tests and successful production build.
