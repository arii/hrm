# Comprehensive Audit of Planned Improvements, Issues, and Tests

> **Maintenance Note:** This document is a manually curated summary of information from multiple source documents across the repository. It is intended to provide a high-level overview and may not be perfectly in sync with the latest changes in the source documents. Please refer to the original documents for the most up-to-date information.

This document provides a consolidated overview of known issues, planned improvements, and the current state of testing, synthesized from a comprehensive review of all project documentation, including Architecture Decision Records (ADRs), audit reports, and development guidelines.

## 1. Architecture and Design

### Key Decisions (from ADRs)
- **Framework**: Next.js is the chosen frontend framework for its rich feature set and performance.
- **State Management**: React Context is used for global state management to leverage built-in React features and avoid external dependencies.
- **Authentication**: NextAuth.js is used for authentication, supporting OAuth providers like Spotify.
- **Logging**: Pino is used for structured, high-performance logging.
- **Asynchronous Control**: `AbortController` is the standard for managing complex asynchronous operations.

### Planned Improvements (from AUDIT_FRONTEND.md)
- **Component Architecture**: Refactor "prop-drilling" in components like the dashboard by creating self-sufficient child components that fetch their own data from the WebSocket context.
- **UI/UX Polish**: A detailed `FRONTEND_IMPROVEMENT_PLAN.md` outlines a multi-phase roadmap for enhancing typography, color systems, mobile experience, and accessibility.

## 2. Code Hygiene and Technical Debt

### Known Issues (from AUDIT_CODE_HYGIENE.md)
- **Unstable Dependencies**: The project uses pre-release versions for some critical packages, which should be pinned to stable releases.
- **Build Process**: A hack in the build script (`cp dist/server.js dist/server.mjs`) should be replaced by resolving the underlying module resolution issue.
- **Error Handling**: The `SpotifyPolling` service has an "error swallowing" pattern that should be replaced with a fail-fast or health-check-based approach.
- **Security**: The Express server is missing common security headers (e.g., CSP, HSTS), which should be added using a library like `helmet`.
- **Legacy Patterns**: The Spotify token delivery mechanism in `server.ts` uses fragile `setTimeout` logic and should be refactored to an event-driven model.

## 3. Testing Strategy

### Current State (from TESTING.md and TESTING_GUIDELINES.md)
- The project uses a combination of Jest for unit tests and Playwright for E2E and visual regression testing.
- A `window.__TEST_WEBSOCKET_READY__` flag is used to synchronize Playwright tests with the WebSocket connection, improving stability.
- Test artifacts are strictly excluded from version control via `.gitignore`.

### Planned Improvements (from TESTING.md and FRONTEND_IMPROVEMENT_PLAN.md)
- **Consolidation**: The test suite is planned to be consolidated into a single `core-functionality.spec.ts` to reduce redundancy and execution time.
- **Stability**: Unstable tests relying on fixed delays (`waitForTimeout`) will be refactored to use more resilient waiting strategies.
- **Accessibility Testing**: The plan includes adding automated accessibility testing with `axe-core`.
- **Performance Optimization**: The test suite will be optimized by enabling parallel execution and reducing the number of screenshots.

## 4. Documentation

### Known Issues (from AUDIT_DOCUMENTATION.md)
- **Organizational Issues**: The root directory is cluttered, and many markdown files should be consolidated into the `docs/` directory.
- **Missing Documentation**: The project lacks an Architecture Decision Record (ADR) for the custom stateful server, a CI/CD pipeline guide, and a simple onboarding checklist in the README.
- **Inline Comments**: There is a lack of high-quality TSDoc comments in key service files like `tabataTimer.ts`.

## 5. Development Standards

### Key Practices (from DEVELOPMENT.md, DEVELOPMENT_STANDARDS.md)
- **Package Manager**: `pnpm` is the standard package manager, and its use is enforced.
- **Code Quality**: Pre-commit hooks with `lint-staged`, Husky, Prettier, and ESLint are used to maintain code quality.
- **Commit Messages**: The project follows the Conventional Commits specification.
- **Import Paths**: The use of `@/*` path aliases for absolute imports is the standard convention.
