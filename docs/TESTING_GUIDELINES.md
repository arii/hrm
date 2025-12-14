# Testing Guidelines

This document outlines the testing framework and best practices for this project, with a focus on artifact management, environment configuration, and test portability.

## Table of Contents

1.  [Directory Structure](#directory-structure)
2.  [Test Artifacts](#test-artifacts)
3.  [Environment Variables](#environment-variables)
4.  [Running Tests](#running-tests)
    - [Local Development](#local-development)
    - [Continuous Integration (CI)](#continuous-integration-ci)
5.  [Best Practices](#best-practices)

---

### 1. Directory Structure

All test-related files are located in the `tests/` directory, which is organized as follows:

-   **`tests/artifacts/`**: This directory is the centralized location for all test-generated outputs. It is **never** committed to version control and is ignored by Git.
    -   `screenshots/`: Stores screenshots from visual regression tests and failed test runs.
    -   `reports/`: Contains test reports in various formats (e.g., HTML, JUnit, JSON).
    -   `logs/`: Holds logs generated during test execution.
    -   `temp/`: For temporary files created during testing.

-   **`tests/fixtures/`**: Contains static data and resources used as inputs for tests (e.g., mock API responses, sample data). This directory **is** committed to version control.

-   **`tests/playwright/`**: Contains all Playwright end-to-end and visual regression tests.

-   **`tests/unit/`**: Contains all Jest unit tests.

-   **`tests/utils/`**: Provides shared utilities and helper functions for testing, including the artifact management script.

### 2. Test Artifacts

To maintain a clean repository and ensure test portability, all test artifacts are generated exclusively within the `tests/artifacts/` directory. This directory is automatically created if it doesn't exist, and its contents are ephemeral.

-   **Artifacts are Ignored**: The `.gitignore` file is configured to ignore the entire `tests/artifacts/` directory, preventing accidental commits of test outputs.
-   **Automated Cleanup**: The `cleanArtifacts()` utility can be used in setup scripts to remove all previous artifacts before a test run, ensuring a clean slate.

### 3. Environment Variables

Our testing framework uses environment variables to ensure flexibility and portability across different environments (local, CI, etc.).

-   `TEST_ARTIFACT_DIR`: Overrides the default location for test artifacts.
    -   **Default**: `tests/artifacts`
    -   **Usage**: `TEST_ARTIFACT_DIR=/tmp/my-app-artifacts npm test`

-   `TEST_APP_URL`: Specifies the base URL of the application under test.
    -   **Default**: `http://localhost:3000`
    -   **Usage**: `TEST_APP_URL=https://staging.example.com npm run test:e2e`

-   `TEST_SCREENSHOT_DIR`: Defines a specific directory for screenshots, overriding the default location within the artifact directory.
    -   **Default**: `tests/artifacts/screenshots`

### 4. Running Tests

#### Local Development

When running tests locally, the default configurations are typically sufficient. The scripts will use the standard directory structure and local application URL.

```bash
# Run Playwright end-to-end tests
npm run test:e2e

# Run Jest unit tests
npm run test:unit
```

#### Continuous Integration (CI)

In a CI environment, you should configure the pipeline to:

1.  **Set Environment Variables**: Define the appropriate `TEST_APP_URL` and `TEST_ARTIFACT_DIR`.
2.  **Collect Artifacts**: Configure the CI job to collect the contents of the `tests/artifacts/` directory upon test failure. This allows for easier debugging of failed runs.
3.  **Cleanup**: Ensure the workspace is cleaned up after each run, including the removal of the artifact directory if necessary.

### 5. Best Practices

-   **No Hardcoded Paths**: Never use hardcoded paths (e.g., `/home/user/project/screenshots/`). Always use the provided environment variables or the `ensureArtifactDir` utility to construct paths dynamically.
-   **Isolate Tests**: Ensure tests are self-contained and do not depend on the state of previous tests. Use setup and teardown functions to manage the test environment.
-   **Stateless Artifacts**: Treat the `tests/artifacts/` directory as ephemeral. Do not rely on its contents persisting between test runs.
-   **Fixture Management**: Store all static test data in the `tests/fixtures/` directory. This keeps test inputs separate from test logic and makes them reusable.
