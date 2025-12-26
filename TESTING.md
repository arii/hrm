# HRM Testing Guide

This guide provides a comprehensive overview of the testing commands, structure, and best practices for the HRM application.

## Primary Test Commands

These are the most frequently used commands for testing and code quality checks.

| Command                       | Description                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm run test:visual`        | Runs the core visual regression test suite in a headless browser. Use this before committing any UI changes. |
| `pnpm run test:visual:update` | Updates the visual snapshots after intentional UI changes have been made.                                    |
| `pnpm run test:unit`          | Executes the Vitest unit test suite for testing individual components and business logic.                    |
| `pnpm run lint`               | Runs ESLint to check for code quality and style issues.                                                      |
| `pnpm run format`             | Formats the entire codebase using Prettier to ensure consistent styling.                                     |

---

## Visual Regression Testing Environment

To ensure consistency across different operating systems, it is **highly recommended** to run visual regression tests within a containerized environment. This project is configured to use a Dev Container, which provides a consistent Linux-based environment for all developers.

- **To run visual tests:** Use the `pnpm run test:visual` command from within the Dev Container.
- **To update snapshots:** Use the `pnpm run test:visual:update` command from within the Dev Container.

---

## All Test Commands

### Visual & E2E Testing

- **`pnpm run test:visual`**: Runs the main visual regression test suite.
- **`pnpm run test:visual:headed`**: Runs the visual tests with a visible browser for debugging.
- **`pnpm run test:visual:update`**: Updates the visual test snapshots.
- **`pnpm run test:comprehensive`**: Runs a longer, more detailed E2E test suite covering full user journeys.
- **`pnpm run test:visual:report`**: Opens a detailed web report of the last Playwright test run.

### Unit Testing

- **`pnpm run test:unit`**: Runs all Vitest unit tests.
- **`pnpm run test:unit:coverage`**: Runs unit tests and generates a code coverage report.

### Server & Process Management

- **`pnpm run kill-all`**: A utility script to find and kill all running Node.js processes related to the application, useful for clearing a stuck server.
- **`pnpm run pm2:logs`**: Displays the logs from the PM2 process manager when the application is running in production mode.

### Code Quality

- **`pnpm run lint`**: Lints the codebase.
- **`pnpm run lint:fix`**: Automatically fixes fixable linting errors.
- **`pnpm run format`**: Formats all code with Prettier.
- **`pnpm run format:check`**: Checks for formatting issues without modifying files.

---

## Test Structure

The project uses a combination of Vitest for unit tests and Playwright for end-to-end (E2E) and visual regression testing.

### Unit Tests (`tests/unit`)

- **Purpose**: To test individual functions, components, and services in isolation.
- **Framework**: Vitest with `@testing-library/react`.
- **Location**: `tests/unit/`
- **Configuration**: `vitest.config.ts`

### E2E and Visual Tests (`tests/playwright`)

- **Purpose**: To verify complete user workflows and ensure the UI remains consistent.
- **Framework**: Playwright.
- **Location**: `tests/playwright/`
- **Key Files**:
  - `visual-regression.spec.ts`: The primary suite for screenshot-based testing of core UI components.
  - `comprehensive-assessment.spec.ts`: Tests longer, more complex user journeys.
  - `mobile-assessment.spec.ts`: Contains tests specifically for mobile viewports.
- **Snapshots**: Visual snapshots are stored in a `*-snapshots` directory alongside the test file.

## CI/CD Integration

In our GitHub Actions workflows, we use `pnpm install --frozen-lockfile` to ensure that the exact versions of dependencies specified in `pnpm-lock.yaml` are installed. This guarantees a consistent and reproducible build environment for all test runs.
