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

## Dependency PR Requirements
- **Required Files**: All dependency PRs must include package.json and pnpm-lock.yaml changes
- **Security Review**: Run `npm audit` and document any security vulnerabilities
- **Version Verification**: Confirm all versions are stable (no alpha/beta/rc)
- **Breaking Changes**: Document any breaking changes and migration steps
- **Testing**: Verify application builds and tests pass with new dependencies
