# [Audit] Test Suite Robustness & Coverage

## Summary

This audit of the QA and automation suite reveals significant risks to test stability, maintainability, and CI/CD reliability. The core issues stem from a lack of server management within the test runner, an overly restrictive serial execution model, and inconsistent test practices. While the suite shows an effort to cover visual aspects of the application, its current implementation is brittle and inefficient.

## Flakiness Report

| File / Area                 | Issue                                                                                                                                         | Impact                                                                                                                                                                             | Recommended Fix                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`      | **Missing `webServer` Configuration**: The test runner does not manage the application server. Tests run against a manually started instance. | **High Flakiness / CI Failure**: Tests will fail in CI or locally if the server isn't started correctly. This is the most likely cause of `net::ERR_CONNECTION_REFUSED` errors.    | Implement the `webServer` block in `playwright.config.ts` to have Playwright manage the application lifecycle, ensuring the server is ready before tests run.   |
| `playwright.config.ts`      | **Disabled Parallelism**: `fullyParallel` is set to `false` and `workers` is hardcoded to `1`.                                                | **Slow Execution / Hidden Bugs**: Tests run extremely slowly. This also masks state pollution issues where one test might affect another, which would be exposed by parallel runs. | Enable parallelism (`fullyParallel: true`) and set `workers` to a reasonable number for CI (e.g., `2`). Refactor tests to be fully isolated and stateless.      |
| `visual-regression.spec.ts` | **Manual Page Management in `beforeAll`**: The `beforeAll` hook manually creates and navigates multiple pages.                                | **Prone to Timeouts & Race Conditions**: This complex, manual setup is fragile. If one page fails to load, the entire test file fails. It's also hard to debug.                    | Use Playwright's test isolation. Each `test()` should be self-contained, responsible for navigating to the page it needs. Remove the complex `beforeAll` setup. |
| `visual-regression.spec.ts` | **Commented-out / Skipped Flaky Test**: The 'Control Panel' test is explicitly commented out with the reason "skipping flakey test".          | **Reduced Coverage**: A critical user interface is not being tested, indicating a known but unresolved stability issue.                                                            | Fix the underlying cause of the flakiness (likely a timing or state issue) and re-enable the test.                                                              |
| `visual-regression.spec.ts` | **High `maxDiffPixelRatio` Thresholds**: Snapshot tests use high tolerance thresholds (up to `0.05`).                                         | **Masks Real Regressions**: While intended to reduce flakiness, high thresholds can cause the test to miss genuine visual bugs and rendering errors.                               | Lower the thresholds to a stricter value (e.g., `0.01`). Use precise element masking to handle dynamic content instead of using a blanket high tolerance.       |

## Coverage Gaps

Based on the file structure and `FEATURES.md` (from memory), the following critical user flows lack dedicated end-to-end tests:

1.  **Authentication Flow**: There is no `.spec.ts` file that robustly covers the Spotify login and callback process. While some tests are conditionally ignored, a dedicated test using mocked OAuth responses is necessary to validate the flow independently of live credentials.
2.  **WebSocket Reconnection Logic**: No test simulates a WebSocket disconnection and verifies that the client-side logic successfully reconnects and restores state. This is a critical resilience feature.
3.  **Error States and Boundaries**: There are no tests that intentionally trigger an error state (e.g., by mocking a 500 API response) to verify that the `ErrorBoundary` components render correctly.

## Mocking Strategy Improvements

The current strategy relies on a running backend and does not effectively isolate the frontend for testing.

- **External Services**: The Google Docs iframe is handled with a `try...catch` block around a helper that attempts to manipulate the DOM. This is not true mocking and is inherently flaky.
  - **Recommendation**: Use `page.route()` to intercept the network request for the Google Docs URL and return a static, predictable HTML response. This guarantees a stable DOM for screenshots and removes the external dependency.
- **WebSocket Stream**: Tests currently depend on a live WebSocket server. This makes it difficult to test specific edge cases (e.g., signal drop alerts, rapid state changes).
  - **Recommendation**: Implement a mock WebSocket provider at the test level. Use `page.addInitScript()` to inject a script that overrides the browser's `WebSocket` object, allowing the test to directly push predefined state messages to the application and assert UI changes deterministically.

## Recommended Playwright Config Changes

```typescript
// playwright.config.ts

export default defineConfig({
  // ... other settings

  // CRITICAL: Add webServer block to manage the application
  webServer: {
    command: 'npm run start:test', // A dedicated script to run the server for tests
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Enable parallelism for faster, more robust testing
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // ... other settings
})
```
