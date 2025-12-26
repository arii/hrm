# Development Notes

> [!NOTE]
> For a comprehensive guide to our coding standards, PR processes, and architectural patterns, please see the new **[Development Standards](./DEVELOPMENT_STANDARDS.md)** document. This file now serves as a high-level overview of ongoing work.

This file contains notes and action items related to the ongoing development of the HRM application.

## Current Focus

The primary focus of ongoing development is to enhance the user experience and improve the long-term maintainability of the application. Key priorities include:

- **UI/UX Polish**: Implementing the enhancements outlined in `FRONTEND_IMPROVEMENT_PLAN.md`, focusing on typography, color consistency, and mobile optimization.
- **Accessibility**: Ensuring the application is fully accessible by meeting WCAG 2.1 AA compliance, including keyboard navigation and screen reader support.
- **Test Suite Optimization**: Consolidating and stabilizing the test suite as described in `TESTING.md` to ensure faster and more reliable CI/CD feedback.
- **Code Quality & Documentation**: Continuously refactoring components for clarity and keeping all development documentation up-to-date.

## Completed Milestones

- **Tabata Timer Refactoring**: The `TabataTimer` service was successfully refactored to support both stopwatch and Tabata modes with a more robust and maintainable architecture.
- **Spotify Controls Overhaul**: The Spotify controls were redesigned and implemented, including volume control, device selection, and improved UI feedback.
- **Bluetooth Connection Flow**: The Bluetooth HRM connection page (`client/connect`) was stabilized and now includes auto-connect functionality.

## Dependency Management and Code Hygiene with Knip

To maintain a clean and efficient codebase, this project uses [Knip](https://knip.dev/) to detect unused files, dependencies, and exports. Knip is integrated into our CI/CD pipeline to ensure that all code additions are continuously monitored for unused code.

### Running Knip Locally

Before submitting a pull request, you can run Knip locally to identify any issues:

```bash
pnpm run knip
```

### Configuration

Knip is configured in the `knip.ts` file in the root of the project. This file defines the entry points for the application, as well as any files or dependencies that should be ignored.

## Dependency Management Guidelines

This section clarifies when and why `package.json` and `pnpm-lock.yaml` should be modified.

### Adding, Updating, or Removing External Dependencies

When a change requires adding, updating, or removing an external package from `node_modules`, the following are required:

- **Required Files**: The PR **must** include changes to `package.json` and `pnpm-lock.yaml`.
- **Security Review**: Before committing, run `pnpm audit` to check for vulnerabilities. If any are found, they must be addressed before merging.
- **Version Verification**: Confirm all new or updated package versions are stable (no alpha/beta/rc).
- **Breaking Changes**: Document any breaking changes introduced by the dependency update and include necessary migration steps.
- **Testing**: Verify the application builds and all tests pass with the new dependencies.

**Example Scenario**: Adding the `date-fns` package to use its date formatting utilities. This would require running `pnpm add date-fns`, which modifies `package.json` and `pnpm-lock.yaml`.

### Creating Internal Modules

When creating new internal modules or utilities (e.g., a new file in `lib/` or `utils/`) that **only** use built-in Node.js APIs or dependencies already listed in `package.json`, changes to `package.json` or `pnpm-lock.yaml` are **not** required.

- **No Lockfile Changes**: The PR should not include modifications to `package.json` or `pnpm-lock.yaml`.

**Example Scenario**: Creating a new file `lib/stringUtils.ts` with helper functions that use built-in JavaScript methods. This does not require any changes to `package.json`.

## Architectural Patterns

### Type-Safe API Wrappers

When integrating with third-party libraries that may have incorrect or incomplete TypeScript definitions, we use a type-safe wrapper pattern to ensure our application remains robust. A prime example of this is the `safeSpotifyApi.ts` module.

**Problem**: The `@spotify/web-api-ts-sdk` library does not correctly type the `deviceId` parameter as optional for several of its player methods. This can lead to runtime errors and requires unsafe type assertions in the application code.

**Solution**: The `safeSpotifyApi.ts` module provides a `createSafeSpotifyApi` function that wraps the Spotify SDK instance in a `Proxy`. This proxy intercepts calls to the player methods and dynamically handles the `deviceId` parameter, ensuring that `undefined` values are not passed to the SDK. This encapsulates the workaround in a single, reusable module, eliminating the need for scattered type assertions and improving the overall type safety of the codebase.
