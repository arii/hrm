# HRM Testing Guide

This guide provides a comprehensive overview of the testing commands, structure, and best practices for the HRM application.

## Primary Test Commands

These are the most frequently used commands for testing and code quality checks.

| Command                       | Description                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm run test:visual`        | Runs the core visual regression test suite in a headless browser. Use this before committing any UI changes. |
| `pnpm run test:visual:update` | Updates the visual snapshots after intentional UI changes have been made.                                    |
| `pnpm run test:unit`          | Executes the Jest unit test suite for testing individual components and business logic.                      |
| `pnpm run lint`               | Runs ESLint to check for code quality and style issues.                                                      |
| `pnpm run format`             | Formats the entire codebase using Prettier to ensure consistent styling.                                     |

---

## All Test Commands

### Visual & E2E Testing

- **`pnpm run test:visual`**: Runs the visual regression and smoke specs (chromium and tablet-canvas projects).
- **`pnpm run test:visual:headed`**: Runs the chromium visual tests with a visible browser.
- **`pnpm run test:visual:ui`**: Opens the Playwright UI runner.
- **`pnpm run test:visual:update`**: Updates the visual test snapshots.
- **`pnpm run test:visual:report`**: Opens the HTML report of the last Playwright run.
- **`pnpm run test:vrt:check-orphans`**: Reports snapshot files that no spec uses.
- **`pnpm run test:perf`**: Runs the `perf-*.spec.ts` specs.

### Unit and Component Testing

- **`pnpm run test:unit`**: Runs all Jest unit tests in `tests/unit` with coverage.
- **`pnpm run test:unit:watch`**: Runs unit tests in watch mode.
- **`pnpm run test:components`**: Runs the component tests (`jest.config.components.cjs`).
- **`pnpm run test:integration`**: Builds, then runs the Jest integration config.

### Process Management

- **`pnpm run kill-all`**: Finds and kills running Node.js processes for the application, useful for clearing a stuck server.
- **`pnpm run pm2:logs`**: Shows PM2 logs when the application runs in production mode.

### Code Quality

- **`pnpm run lint`**: Lints the codebase.
- **`pnpm run lint:fix`**: Automatically fixes fixable linting errors.
- **`pnpm run format`**: Formats all code with Prettier.
- **`pnpm run format:check`**: Checks for formatting issues without modifying files.
- **`pnpm run lint:slop`**: Scans for words listed in `ai_slop_words.txt`.

---

## Test Structure

The project uses a combination of Jest for unit tests and Playwright for end-to-end (E2E) and visual regression testing.

### Unit and Component Tests (`tests/unit`, `tests/components`)

- **Purpose**: To test individual functions, components, and services in isolation.
- **Framework**: Jest with `@testing-library/react`.
- **Configuration**: `jest.config.cjs` (unit), `jest.config.components.cjs` (components).

### E2E and Visual Tests (`tests/playwright`)

- **Purpose**: To verify complete user workflows and ensure the UI remains consistent.
- **Framework**: Playwright (`playwright.config.ts`, one worker, because the WebSocket server is stateful).
- **Key Files**:
  - `vrt-*.spec.ts`: screenshot-based visual regression specs.
  - `simple-smoke.spec.ts`: basic smoke test.
  - `workflow-assessment.spec.ts`: longer user journeys.
  - `realtime-resilience.spec.ts`, `timer-ui-sync.spec.ts`: WebSocket and timer behavior.
- **Snapshots**: Visual snapshots are stored in a `*-snapshots` directory alongside each spec.

## Visual Regression Testing (VRT) Workflow

Visual Regression Testing is a critical part of our quality assurance process. It helps us prevent unintended UI changes from reaching production.

### Running VRT

To run the visual regression tests, use the following command:

```bash
pnpm run test:visual
```

This command will run Playwright in headless mode and compare the latest screenshots with the snapshots stored in the repository. If there are any visual differences, the tests will fail.

### Running VRT Locally (basePath gotcha)

Playwright builds a production server and probes root paths (`/api/health/simple`, `/client/...`), exactly like CI. A local `.env.local` with `NEXT_PUBLIC_BASE_PATH=/hrm` breaks this twice: the value is baked into the client bundle at build time, and the custom server re-reads `next.config.js` at startup so routing shifts to `/hrm` too — every root probe then 404s and the run times out in `config.webServer` (an empty `NEXT_PUBLIC_BASE_PATH=` override does NOT win over `.env.local`).

For a CI-equivalent local run, move `.env.local` aside for both the build and the test, then restore it:

```bash
mv .env.local /tmp/.env.local.vrt-keep
# Build with the same env Playwright/CI uses (build env is baked into the bundle):
PORT=3000 TESTING=true NEXT_PUBLIC_TESTING=true \
  NEXTAUTH_SECRET='a-super-long-and-secure-secret-for-ci-tests' \
  NEXTAUTH_URL=http://127.0.0.1:3000 \
  SPOTIFY_CLIENT_ID=test_client_id SPOTIFY_CLIENT_SECRET=test_client_secret \
  ALLOW_DEBUG_RESET=true \
  GOOGLE_DOC_WORKOUT_URL=https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit \
  WEBSOCKET_WATCHDOG_INTERVAL=5000 \
  pnpm run build
SKIP_BUILD=true pnpm exec playwright test --project=chromium tests/playwright/vrt-connect-page.spec.ts
mv /tmp/.env.local.vrt-keep .env.local
```

(`SKIP_BUILD=true` reuses the build because a full build exceeds Playwright's 120s `webServer` budget on this box.) Expect Spotify `invalid_client` noise in the server log — the on-disk `logs/spotify_tokens.json` fails refresh against the test client ID, but it is non-fatal and the server still becomes ready. Never delete or commit the real token file.

### Updating Snapshots

If you've made intentional changes to the UI, you'll need to update the snapshots. To do this, run the following command:

```bash
pnpm run test:visual:update
```

This will generate new snapshots. Be sure to review the changes in the generated diffs to ensure they are intended.

## `data-testid` Usage Guidelines

To ensure that our tests are resilient to code refactoring and style changes, we use `data-testid` attributes to target elements in our tests.

### Best Practices

- **Use `data-testid` for elements that are not uniquely identifiable by other means**: For example, buttons, icons, and other interactive elements.
- **Be specific and consistent with naming**: Use a consistent naming convention for `data-testid` attributes. For example, `[component-name]-[element-name]`.
- **Avoid using `data-testid` for everything**: If an element can be uniquely identified by its text content, role, or other accessible attributes, use those instead.

## CI/CD Integration

In our GitHub Actions workflows, we use `pnpm install --frozen-lockfile` to ensure that the exact versions of dependencies specified in `pnpm-lock.yaml` are installed. This guarantees a consistent and reproducible build environment for all test runs.

## Test Artifacts

Test artifacts are files generated by a test run: Playwright screenshots, videos and HTML reports (`test-results/`, `playwright-report/`), Jest coverage (`coverage/`), and logs. They must never be committed. They bloat the repository, add noise to history, and cannot be merged. `.gitignore` already lists these directories; if you add a new testing tool, add its output directory too.

When a CI run fails, the workflow uploads the artifacts. Open the **Actions** tab, select the failed run, and download the zip from the **Artifacts** section.

`pnpm run clean` removes local build and test outputs (see [Environment Cleanup](./DEVELOPMENT.md#environment-cleanup)).

## Paths in Tests

Do not hardcode absolute paths such as `/Users/arii/hrm/test-screenshots`. Use paths relative to the project root, or read them from environment variables, so the suite runs on any machine and in CI.

## Writing Tests

- **Reliable**: Fix or remove flaky tests.
- **Clear**: The test name and structure should state the intent.
- **Isolated**: One test's failure must not affect another.
- Avoid fixed delays (`waitForTimeout`) in Playwright specs. Wait for a DOM element, a network response, or a connection state instead.
