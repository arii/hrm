# Playwright Test Suite Issues

This document outlines the current issues with the Playwright test suite and the steps that have been taken to debug them.

## Current Status

The Playwright test suite is currently timing out, preventing any of the tests from running to completion. This issue persists even when running a single, isolated test case.

## Symptoms

-   Running `npx playwright test` (or any of the npm scripts that run Playwright) results in a timeout.
-   The timeouts occur even when running a single test file or a single test case.
-   The development server logs show a high rate of WebSocket connections and disconnections during the test run, which may be a contributing factor.

## Debugging Steps Taken

1.  **Isolated a Single Test:** A simple "smoke test" was created (`tests/playwright/simple-smoke.spec.ts`) to verify the basic test setup. This test passed successfully, indicating that the core Playwright configuration is working.

2.  **Analyzed Server Logs:** The `dev.log` file was examined, and it revealed a high rate of WebSocket churn during the test runs. This is likely causing the server to become overloaded, leading to the timeouts.

3.  **Optimized Test Setup:** The `tests/playwright/test-helpers.ts` file was modified to reduce the number of WebSocket connections created during the tests. The `setupVisualRegressionTest` function was identified as a source of the churn, and a more efficient `setupMinimalVisualRegressionTest` function was created.

4.  **Optimized Client-Side Code:** The `app/page.tsx` file was modified to remove a 2-second timeout that was delaying the `__TEST_READY__` flag. This flag is used by the tests to determine when the page is ready, and the timeout was a likely source of the timeouts.

5.  **Optimized Server-Side Code:** The `server.ts` file was modified to debounce the `broadcastState` function, which is responsible for sending WebSocket messages to the clients. This was done to reduce the number of messages sent during the tests and prevent the server from being overloaded.

## Next Steps

The timeouts persist even after the optimizations listed above. This suggests that there is a deeper issue at play that has not yet been identified. Further investigation is needed to determine the root cause of the timeouts.
