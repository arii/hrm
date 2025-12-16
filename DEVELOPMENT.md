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

## Dead Code Detection with Knip

To maintain a clean and efficient codebase, this project uses [Knip](https://knip.dev/) to detect and remove dead code, unused dependencies, and unlisted binaries. Knip is integrated into the CI/CD pipeline and will fail the build if any issues are detected.

### Running Knip Locally

To run Knip locally, use the following command:

```bash
pnpm knip
```

### Interpreting the Output

The output from Knip is divided into several sections:

- **Unused files**: Files that are not imported or used anywhere in the project.
- **Unused dependencies**: Dependencies listed in `package.json` that are not used in the code.
- **Unlisted dependencies**: Dependencies that are used in the code but not listed in `package.json`.
- **Unused exports**: Exports that are not used by any other code in the project.

### Resolving Knip Findings

When Knip finds issues, you have two options:

1.  **Remove the dead code or unused dependency**: This is the preferred option. If the code or dependency is not being used, it should be removed from the project.
2.  **Ignore the finding**: If you believe the finding is a false positive, you can ignore it by adding a `// @knip-ignore` comment above the export or by adding the file path to the `ignore` array in the `knip.json` file.

## Completed Milestones

- **Tabata Timer Refactoring**: The `TabataTimer` service was successfully refactored to support both stopwatch and Tabata modes with a more robust and maintainable architecture.
- **Spotify Controls Overhaul**: The Spotify controls were redesigned and implemented, including volume control, device selection, and improved UI feedback.
- **Bluetooth Connection Flow**: The Bluetooth HRM connection page (`client/connect`) was stabilized and now includes auto-connect functionality.

## Dependency PR Requirements
- **Required Files**: All dependency PRs must include package.json and pnpm-lock.yaml changes
- **Security Review**: Run `npm audit` and document any security vulnerabilities
- **Version Verification**: Confirm all versions are stable (no alpha/beta/rc)
- **Breaking Changes**: Document any breaking changes and migration steps
- **Testing**: Verify application builds and tests pass with new dependencies
