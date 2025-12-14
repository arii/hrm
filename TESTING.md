# HRM Testing Guide

This guide provides a comprehensive overview of the testing commands, structure, and best practices for the HRM application.

## Primary Test Commands

These are the most frequently used commands for testing and code quality checks.

| Command                      | Description                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run test:visual`        | Runs the core visual regression test suite in a headless browser. Use this before committing any UI changes. |
| `npm run test:visual:update` | Updates the visual snapshots after intentional UI changes have been made.                                    |
| `npm run test:unit`          | Executes the Jest unit test suite for testing individual components and business logic.                      |
| `npm run lint`               | Runs ESLint to check for code quality and style issues.                                                      |
| `npm run format`             | Formats the entire codebase using Prettier to ensure consistent styling.                                     |

---

## All Test Commands

### Visual & E2E Testing

- **`npm run test:visual`**: Runs the main visual regression test suite.
- **`npm run test:visual:headed`**: Runs the visual tests with a visible browser for debugging.
- **`npm run test:visual:update`**: Updates the visual test snapshots.
- **`npm run test:comprehensive`**: Runs a longer, more detailed E2E test suite covering full user journeys.
- **`npm run test:visual:report`**: Opens a detailed web report of the last Playwright test run.

### Unit Testing

- **`npm run test:unit`**: Runs all Jest unit tests.
- **`npm run test:unit:coverage`**: Runs unit tests and generates a code coverage report.

### Server & Process Management

- **`npm run test:clean`**: Shuts down any running server instances, starts a fresh server, and runs the visual tests.
- **`npm run kill-all`**: A utility script to find and kill all running Node.js processes related to the application, useful for clearing a stuck server.
- **`npm run pm2:logs`**: Displays the logs from the PM2 process manager when the application is running in production mode.

### Code Quality

- **`npm run lint`**: Lints the codebase.
- **`npm run lint:fix`**: Automatically fixes fixable linting errors.
- **`npm run format`**: Formats all code with Prettier.
- **`npm run format:check`**: Checks for formatting issues without modifying files.

---

## Test Structure

The project uses a combination of Jest for unit tests and Playwright for end-to-end (E2E) and visual regression testing.

### Unit Tests (`tests/unit`)

- **Purpose**: To test individual functions, components, and services in isolation.
- **Framework**: Jest with `@testing-library/react`.
- **Location**: `tests/unit/`
- **Configuration**: `jest.config.cjs`

### E2E and Visual Tests (`tests/playwright`)

- **Purpose**: To verify complete user workflows and ensure the UI remains consistent.
- **Framework**: Playwright.
- **Location**: `tests/playwright/`
- **Key Files**:
  - `visual-regression.spec.ts`: The primary suite for screenshot-based testing of core UI components.
  - `comprehensive-assessment.spec.ts`: Tests longer, more complex user journeys.
  - `mobile-assessment.spec.ts`: Contains tests specifically for mobile viewports.
- **Snapshots**: Visual snapshots are stored in a `*-snapshots` directory alongside the test file.

---

## Future Improvements & Test Consolidation Plan

The current test suite has some redundancy and opportunities for optimization. The following plan is in place to improve the test suite's efficiency and maintainability.

### 1. Consolidate Core Tests

- **Goal**: Reduce the number of redundant tests and screenshots.
- **Action**: Create a single `core-functionality.spec.ts` that covers the most critical UI components and workflows, reducing the total number of tests from ~29 to ~12.
- **Benefit**: Faster execution time, lower maintenance overhead, and clearer test focus.

### 2. Stabilize Unstable Tests

- **Goal**: Eliminate flaky tests caused by timing issues.
- **Action**: Replace fixed delays (`waitForTimeout`) with more resilient waiting strategies, such as waiting for specific network responses, DOM elements to be visible, or WebSocket connection statuses.
- **Benefit**: More reliable test runs and fewer false positives.

### 3. Optimize Test Performance

- **Goal**: Reduce the overall test execution time.
- **Action**: Enable parallel test execution in `playwright.config.ts` and reduce the number of screenshots to only the most essential views.
- **Benefit**: Faster feedback loops for developers and in the CI/CD pipeline.
